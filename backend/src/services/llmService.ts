import * as https from 'https';
import { legacyPlanService } from './legacyPlanService';
import { userService } from './userService';

// 对话消息类型
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

// 工具调用类型
export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

// 工具定义
interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
}

// 对话上下文
export interface LLMContext {
  messages: LLMMessage[];
  history: Array<{ role: string; content: string }>;
  workingPlan: Partial<any> | null;
  collectedData: Record<string, any>;
}

// 临时文件存储
interface TempFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // base64
  createdAt: Date;
}

// 大模型服务
class LLMService {
  private apiKey: string = '';
  private apiBaseUrl: string = 'https://api.deepseek.com/v1';
  private model: string = 'deepseek-chat';
  private tempFiles: Map<string, TempFile> = new Map();
  
  // 系统提示词 - 让模型了解项目功能
  private systemPrompt = `
你是一个数字遗产管理助手，名为"遗产管家"。你必须使用工具来执行操作。

## 用户信息
用户已经登录，你不需要询问用户的ID。当需要使用userId参数时，请使用"CURRENT_USER"作为值，系统会自动替换为实际的用户ID。

## 可用工具

调用格式：{"tool":"工具名","args":{"参数名":"参数值"}}

工具列表：
1. queryPlans - 查询用户计划，参数: userId
2. queryStatus - 查询计划状态，参数: planId
3. createPlan - 创建计划，参数: name, assets, guardians, threshold, totalShares
4. inheritPlan - 继承计划，参数: planId
5. submitShare - 提交份额，参数: planId, shareValue

## 规则
- 查询计划必须调用 queryPlans
- 查询状态必须调用 queryStatus  
- 创建计划必须调用 createPlan
- 继承计划必须调用 inheritPlan
- 提交份额必须调用 submitShare
- 直接回答问题不需要调用工具
- 参数必须完整
- 如果缺少必要的参数（如提交份额时缺少份额值），先询问用户提供，不要直接调用工具
- 用户已登录，不需要询问用户ID，使用"CURRENT_USER"作为userId参数值

## 重要约束

### 时间锁
- 创建计划时，**必须主动询问用户**是否需要设置时间锁
- 时间锁使遗产计划在指定天数后自动触发继承
- 如果用户选择设置，调用 createPlan 时传入 timeLock 参数
- 如果用户选择不设置，timeLock 不传或设为 0

### 总份额数
- 总份额数应等于监护人数量，每个监护人持有1份份额
- 不要单独询问用户"总份额数是多少"，直接使用监护人数量作为总份额数
- 例如：如果有3个监护人，则 totalShares = 3

### 监护人必须是注册用户
- 只有系统内已注册的用户才能被指定为监护人
- 添加监护人时必须确保其邮箱在系统内注册
- 如果用户提供的监护人邮箱未注册，告知用户先让该用户完成注册
- 询问监护人时，直接说"请提供监护人的姓名和注册邮箱"，不要问"你想指定谁作为监护人"

### 文件资产
- 用户可以通过AI助手界面上的"上传文件"按钮上传加密文件
- 上传的文件会自动作为加密文件资产添加到当前工作计划中
- 文件上传后，告知用户文件已添加为资产，不需要再引导用户使用"添加文件"按钮
- 用户在创建计划时上传的文件，会在创建计划时自动合并到资产列表中

## 示例
用户：查询我的计划
助手：{"tool":"queryPlans","args":{"userId":"CURRENT_USER"}}

用户：创建计划"我的遗产"
助手：{"tool":"createPlan","args":{"name":"我的遗产","assets":[{"name":"存款","type":"金融","value":"10000"}],"guardians":[{"name":"张三","email":"zhang@test.com"},{"name":"李四","email":"li@test.com"},{"name":"王五","email":"wang@test.com"}],"threshold":2,"totalShares":3}}

用户：继承计划 ID123
助手：{"tool":"inheritPlan","args":{"planId":"ID123"}}

用户：提交份额给计划 ID123，份额值是 share-value-123
助手：{"tool":"submitShare","args":{"planId":"ID123","shareValue":"share-value-123"}}

用户：你好
助手：您好！我是遗产管家。请问需要什么帮助？
`.trim();

  constructor() {
    // 从环境变量获取API密钥
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('错误：未配置DEEPSEEK_API_KEY环境变量');
      console.error('请在.env文件中添加：DEEPSEEK_API_KEY=your-api-key');
    }
    
    // 支持自定义API地址（如使用代理或本地部署的模型）
    if (process.env.LLM_API_BASE_URL) {
      this.apiBaseUrl = process.env.LLM_API_BASE_URL;
    }
    if (process.env.LLM_MODEL) {
      this.model = process.env.LLM_MODEL;
    }
  }

  // 设置API密钥
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  // 检查API密钥是否设置
  hasApiKey(): boolean {
    return this.apiKey !== '';
  }

  // 存储临时文件
  storeTempFile(file: { name: string; type: string; size: number; content: string }): string {
    const fileId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    this.tempFiles.set(fileId, {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      content: file.content,
      createdAt: new Date()
    });

    // 1小时后自动清理
    setTimeout(() => {
      this.tempFiles.delete(fileId);
    }, 60 * 60 * 1000);

    return fileId;
  }

  // 获取临时文件
  getTempFile(fileId: string): TempFile | undefined {
    return this.tempFiles.get(fileId);
  }

  // 删除临时文件
  deleteTempFile(fileId: string): void {
    this.tempFiles.delete(fileId);
  }

  // 获取工具定义列表
  private getTools(): ToolDefinition[] {
    return [
      {
        name: 'createPlan',
        description: '创建新的遗产计划',
        parameters: {
          name: { type: 'string', description: '计划名称', required: true },
          assets: { type: 'array', description: '资产列表', required: false },
          guardians: { type: 'array', description: '监护人列表', required: false },
          threshold: { type: 'integer', description: '门限值', required: false },
          totalShares: { type: 'integer', description: '总份额（应等于监护人数量，不填则默认为监护人数量）', required: false },
          timeLock: { type: 'integer', description: '时间锁天数', required: false }
        }
      },
      {
        name: 'addAsset',
        description: '向计划添加资产',
        parameters: {
          planId: { type: 'string', description: '计划ID', required: true },
          name: { type: 'string', description: '资产名称', required: true },
          type: { type: 'string', description: '资产类型', required: true },
          value: { type: 'string', description: '资产价值', required: false }
        }
      },
      {
        name: 'addGuardian',
        description: '添加监护人',
        parameters: {
          planId: { type: 'string', description: '计划ID', required: true },
          name: { type: 'string', description: '监护人姓名', required: true },
          email: { type: 'string', description: '监护人邮箱', required: true }
        }
      },
      {
        name: 'setThreshold',
        description: '设置门限配置',
        parameters: {
          planId: { type: 'string', description: '计划ID', required: true },
          threshold: { type: 'integer', description: '门限值', required: true },
          totalShares: { type: 'integer', description: '总份额（应等于监护人数量）', required: true }
        }
      },
      {
        name: 'setTimeLock',
        description: '设置时间锁',
        parameters: {
          planId: { type: 'string', description: '计划ID', required: true },
          days: { type: 'integer', description: '时间锁天数', required: true }
        }
      },
      {
        name: 'inheritPlan',
        description: '发起继承请求',
        parameters: {
          planId: { type: 'string', description: '计划ID', required: true }
        }
      },
      {
        name: 'submitShare',
        description: '提交监护人份额',
        parameters: {
          planId: { type: 'string', description: '计划ID', required: true },
          shareValue: { type: 'string', description: '份额值（创建计划时发送到监护人邮箱的承诺值）', required: true }
        }
      },
      {
        name: 'queryPlans',
        description: '查询用户计划列表',
        parameters: {
          userId: { type: 'string', description: '用户ID', required: true }
        }
      },
      {
        name: 'queryStatus',
        description: '查询计划状态',
        parameters: {
          planId: { type: 'string', description: '计划ID', required: true }
        }
      }
    ];
  }

  // 使用Node.js内置https模块发送请求
  private async httpsPost(url: string, data: any, headers: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const postData = JSON.stringify(data);
      
      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP error! status: ${res.statusCode}, message: ${response.error?.message || body}`));
            } else {
              resolve(response);
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${body}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(`Request error: ${e.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  // 调用大模型
  private async callLLM(messages: LLMMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('请先设置Deepseek API密钥');
    }

    try {
      const response = await this.httpsPost(
        `${this.apiBaseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.systemPrompt },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      );

      return response.choices[0].message.content;
    } catch (error: any) {
      console.error('Deepseek API调用失败:', error.message);
      throw new Error(`Deepseek API调用失败: ${error.message}`);
    }
  }

  // 执行工具调用
  private async executeTool(toolName: string, args: Record<string, any>, userId: string, context?: LLMContext): Promise<string> {
    try {
      switch (toolName) {
        case 'createPlan': {
          // 验证所有监护人是否为注册用户
          if (args.guardians && Array.isArray(args.guardians)) {
            for (const g of args.guardians) {
              if (g.email) {
                const existingUser = userService.getUserByEmail(g.email);
                if (!existingUser) {
                  return JSON.stringify({ success: false, message: `监护人"${g.name || g.email}"（${g.email}）不是系统注册用户。请使用已注册用户的邮箱。` });
                }
              }
            }
          }

          // 合并上下文中的文件资产（通过AI上传的文件）
          let mergedAssets = [...(args.assets || [])];
          if (context?.workingPlan?.assets) {
            const fileAssets = context.workingPlan.assets.filter((a: any) => a.type === 'file');
            for (const fileAsset of fileAssets) {
              const alreadyExists = mergedAssets.some((a: any) => a.name === fileAsset.name && a.type === 'file');
              if (!alreadyExists) {
                mergedAssets.push(fileAsset);
              }
            }
          }

          const plan = await legacyPlanService.createPlan({
            name: args.name || '未命名计划',
            assets: mergedAssets,
            guardians: args.guardians?.map((g: any, index: number) => ({ ...g, id: `guardian_${Date.now()}_${index}` })) || [],
            threshold: args.threshold || 2,
            totalShares: args.totalShares || (args.guardians?.length || 3),
            timeLock: args.timeLock || 0,
            triggerMode: args.timeLock ? 'timed' : 'consensus',
            creatorId: userId
          });
          console.log(`计划创建成功: ${plan.name}, ID: ${plan.id}, creatorId: ${plan.creatorId}`);
          return JSON.stringify({
            success: true,
            message: `计划创建成功`,
            data: {
              id: plan.id,
              name: plan.name,
              assets: plan.assets.length,
              guardians: plan.guardians.length,
              threshold: `${plan.threshold}-of-${plan.totalShares}`
            }
          });
        }

        case 'addAsset': {
          const plan = legacyPlanService.getPlan(args.planId);
          if (!plan) {
            return JSON.stringify({ success: false, message: '计划不存在' });
          }
          // 文件类型资产需通过页面上传
          const assetType = (args.type || '').toLowerCase();
          if (assetType === 'file' || assetType === '文件' || (args.name || '').toLowerCase().includes('file')) {
            return JSON.stringify({ success: false, message: '文件资产需要通过页面上的"添加文件"功能上传，AI助手不支持文件上传。请返回计划详情页面完成文件上传。' });
          }
          plan.assets.push({
            name: args.name,
            type: args.type,
            value: args.value || '',
            description: ''
          });
          return JSON.stringify({
            success: true,
            message: `资产"${args.name}"已添加`,
            data: { assets: plan.assets.length }
          });
        }

        case 'addGuardian': {
          const plan = legacyPlanService.getPlan(args.planId);
          if (!plan) {
            return JSON.stringify({ success: false, message: '计划不存在' });
          }
          // 验证监护人是否为注册用户
          if (args.email) {
            const existingUser = userService.getUserByEmail(args.email);
            if (!existingUser) {
              return JSON.stringify({ success: false, message: `未找到邮箱为 "${args.email}" 的注册用户。只有系统内已注册的用户才能被指定为监护人。` });
            }
          }
          plan.guardians.push({
            id: `guardian_${Date.now()}`,
            name: args.name,
            email: args.email,
            role: 'guardian'
          });
          plan.totalShares = plan.guardians.length;
          if (plan.threshold > plan.totalShares) {
            plan.threshold = Math.max(1, plan.totalShares);
          }
          return JSON.stringify({
            success: true,
            message: `监护人"${args.name}"已添加`,
            data: { guardians: plan.guardians.length, threshold: `${plan.threshold}-of-${plan.totalShares}` }
          });
        }

        case 'setThreshold': {
          const plan = legacyPlanService.getPlan(args.planId);
          if (!plan) {
            return JSON.stringify({ success: false, message: '计划不存在' });
          }
          plan.threshold = args.threshold;
          plan.totalShares = args.totalShares;
          return JSON.stringify({
            success: true,
            message: `门限已设置为${args.threshold}-of-${args.totalShares}`,
            data: { threshold: `${plan.threshold}-of-${plan.totalShares}` }
          });
        }

        case 'setTimeLock': {
          const plan = legacyPlanService.getPlan(args.planId);
          if (!plan) {
            return JSON.stringify({ success: false, message: '计划不存在' });
          }
          plan.timeLock = args.days;
          plan.triggerMode = 'timed';
          return JSON.stringify({
            success: true,
            message: `时间锁已设置为${args.days}天`,
            data: { timeLock: args.days, triggerMode: 'timed' }
          });
        }

        case 'inheritPlan': {
          const plan = legacyPlanService.getPlan(args.planId);
          if (!plan) {
            return JSON.stringify({ success: false, message: '计划不存在' });
          }
          const user = userService.getUserById(userId);
          if (!user) {
            return JSON.stringify({ success: false, message: '用户不存在' });
          }
          const result = await legacyPlanService.initiateInheritance({
            planId: args.planId,
            initiatorId: userId,
            heirEmail: user.email,
            guardianSignatures: []
          });
          return JSON.stringify({
            success: true,
            message: '继承请求已提交',
            data: { planName: plan.name, status: result.status }
          });
        }

        case 'submitShare': {
          // 调试日志
          console.log('=== submitShare 调试信息 ===');
          console.log('用户ID:', userId);
          console.log('参数:', args);
          
          // 检查是否提供了计划ID
          if (!args.planId || args.planId.trim() === '') {
            console.log('错误：缺少计划ID');
            return JSON.stringify({ 
              success: false, 
              message: '请提供计划ID。您可以先查询您参与的计划获取计划ID。' 
            });
          }
          
          // 检查是否提供了份额值
          if (!args.shareValue || args.shareValue.trim() === '') {
            console.log('错误：缺少份额值');
            return JSON.stringify({ 
              success: false, 
              message: '请提供份额值。份额值是创建计划时发送给您的邮件中包含的内容，请查收邮件获取份额值。' 
            });
          }
          
          // 获取计划信息
          const plan = legacyPlanService.getPlan(args.planId);
          if (!plan) {
            console.log('错误：计划不存在，planId:', args.planId);
            return JSON.stringify({ success: false, message: '计划不存在' });
          }
          
          console.log('找到计划:', plan.name);
          
          // 尝试找到用户对应的监护人ID
          let guardianId = userId;
          
          // 检查用户是否是计划的监护人（通过ID匹配）
          const isGuardianById = plan.guardians.some(g => g.id === userId);
          console.log('通过ID匹配监护人:', isGuardianById);
          
          if (!isGuardianById) {
            // 如果不是，尝试通过邮箱匹配
            console.log('尝试通过邮箱匹配监护人...');
            const user = userService.getUserById(userId);
            console.log('用户信息:', user);
            if (user) {
              const guardianByEmail = plan.guardians.find(g => g.email === user.email);
              console.log('监护人邮箱列表:', plan.guardians.map(g => g.email));
              console.log('通过邮箱找到的监护人:', guardianByEmail);
              if (guardianByEmail) {
                guardianId = guardianByEmail.id;
                console.log('使用邮箱匹配到的监护人ID:', guardianId);
              } else {
                console.log('警告：用户不是该计划的监护人');
              }
            }
          } else {
            console.log('使用用户ID作为监护人ID:', guardianId);
          }
          
          console.log('最终监护人ID:', guardianId);
          
          const result = await legacyPlanService.submitGuardianShare({
            planId: args.planId,
            guardianId: guardianId,
            shareValue: args.shareValue || ''
          });
          
          console.log('份额提交结果:', result);
          
          if (result.success) {
            console.log('份额提交成功，获取继承状态...');
            const status = await legacyPlanService.getInheritanceStatus(args.planId);
            console.log('继承状态:', status);
            return JSON.stringify({
              success: true,
              message: '份额提交成功',
              data: {
                sharesCollected: status.sharesCollected,
                threshold: status.threshold,
                guardians: status.guardians.map((g: any) => ({
                  name: g.name,
                  hasSubmitted: g.hasSubmitted
                }))
              }
            });
          } else {
            return JSON.stringify({ success: false, message: result.message });
          }
        }

        case 'queryPlans': {
          const plans = legacyPlanService.getUserPlans(userId);
          const createdPlans = plans.filter(p => p.creatorId === userId);
          const inheritorPlans = legacyPlanService.getPlansByInheritanceInitiator(userId);
          const guardianPlans = plans.filter(p => p.guardians.some((g: any) => g.id === userId));
          return JSON.stringify({
            success: true,
            message: '',
            data: {
              total: plans.length,
              created: createdPlans.map((p: any) => ({ id: p.id, name: p.name, status: p.status })),
              inheritor: inheritorPlans.map((p: any) => ({ id: p.id, name: p.name, status: p.status })),
              guardian: guardianPlans.map((p: any) => ({ id: p.id, name: p.name, status: p.status }))
            }
          });
        }

        case 'queryStatus': {
          const status = await legacyPlanService.getInheritanceStatus(args.planId);
          return JSON.stringify({
            success: true,
            message: '',
            data: {
              planId: args.planId,
              status: status.status,
              threshold: status.threshold,
              sharesCollected: status.sharesCollected,
              guardians: status.guardians.map((g: any) => ({
                name: g.name,
                hasSubmitted: g.hasSubmitted
              }))
            }
          });
        }

        default:
          return JSON.stringify({ success: false, message: `未知工具: ${toolName}` });
      }
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }

  // 解析工具调用响应
  private parseToolResponse(toolResponse: string): string {
    try {
      const result = JSON.parse(toolResponse);
      if (result.success) {
        if (result.data) {
          return this.formatResult(result.message, result.data);
        }
        return result.message;
      }
      return `操作失败：${result.message}`;
    } catch {
      return toolResponse;
    }
  }

  // 格式化工具执行结果
  private formatResult(message: string, data: any): string {
    let result = message + '\n\n';
    
    if (data.id && data.name) {
      result += `计划ID：${data.id}\n`;
      result += `计划名称：${data.name}\n`;
    }
    
    if (data.assets !== undefined) {
      result += `资产数量：${data.assets}\n`;
    }
    
    if (data.guardians !== undefined) {
      if (Array.isArray(data.guardians)) {
        result += `监护人：\n`;
        data.guardians.forEach((g: any, i: number) => {
          result += `  ${i + 1}. ${g.name} ${g.hasSubmitted ? '✓' : '○'}\n`;
        });
      } else {
        result += `监护人数量：${data.guardians}\n`;
      }
    }
    
    if (data.threshold) {
      result += `门限配置：${data.threshold}\n`;
    }
    
    if (data.sharesCollected !== undefined) {
      result += `已收集份额：${data.sharesCollected}/${data.threshold}\n`;
    }
    
    if (data.timeLock) {
      result += `时间锁：${data.timeLock}天\n`;
    }
    
    if (data.status) {
      result += `状态：${data.status}\n`;
    }
    
    if (data.planName) {
      result += `计划名称：${data.planName}\n`;
    }
    
    if (data.created) {
      result += `【创建的计划】\n`;
      data.created.forEach((p: any) => {
        result += `• ${p.name} (ID: ${p.id})\n`;
      });
    }
    
    if (data.inheritor) {
      result += `【继承的计划】\n`;
      data.inheritor.forEach((p: any) => {
        result += `• ${p.name} (ID: ${p.id})\n`;
      });
    }
    
    if (data.guardian) {
      result += `【监护的计划】\n`;
      data.guardian.forEach((p: any) => {
        result += `• ${p.name} (ID: ${p.id})\n`;
      });
    }
    
    return result.trim();
  }

  // 从文本中提取所有JSON对象（支持多行）
  private extractJsonObjects(text: string): string[] {
    const results: string[] = [];
    let depth = 0;
    let startIndex = -1;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '{') {
        if (depth === 0) {
          startIndex = i;
        }
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && startIndex !== -1) {
          const jsonStr = text.substring(startIndex, i + 1);
          results.push(jsonStr);
          startIndex = -1;
        }
      }
    }
    
    return results;
  }

  // 处理用户消息
  async processMessage(
    userMessage: string,
    userId: string,
    context: LLMContext = {
      messages: [],
      history: [],
      workingPlan: null,
      collectedData: {}
    },
    fileData?: { fileId?: string; name?: string; type?: string; size?: number; content?: string }
  ): Promise<{
    response: string;
    intent: string;
    nextContext: LLMContext;
    actionResult?: any;
  }> {
    if (!this.hasApiKey()) {
      return {
        response: '请先配置Deepseek API密钥。',
        intent: 'error',
        nextContext: context
      };
    }

    try {
      // 处理文件上传数据
      let fileAsset: any = null;

      if (fileData) {
        let fileContent: string | undefined;
        let fileName = fileData.name || '未命名文件';
        let fileType = fileData.type || 'application/octet-stream';
        let fileSize = fileData.size || 0;

        // 如果有fileId，从临时存储中获取文件
        if (fileData.fileId) {
          const stored = this.getTempFile(fileData.fileId);
          if (stored) {
            fileContent = stored.content;
            fileName = stored.name;
            fileType = stored.type;
            fileSize = stored.size;
          }
        } else if (fileData.content) {
          fileContent = fileData.content;
        }

        if (fileContent) {
          fileAsset = {
            type: 'file',
            name: fileName,
            description: `通过AI助手上传的文件：${fileName}`,
            value: JSON.stringify({
              name: fileName,
              type: fileType,
              size: fileSize,
              content: fileContent
            })
          };

          // 将文件资产添加到工作计划的资产列表中
          if (!context.workingPlan) {
            context.workingPlan = { assets: [] };
          }
          if (!context.workingPlan.assets) {
            context.workingPlan.assets = [];
          }
          context.workingPlan.assets.push(fileAsset);

          // 添加系统消息告知LLM文件已上传
          context.messages.push({
            role: 'system',
            content: `系统通知：用户上传了文件"${fileName}"（类型：${fileType}，大小：${(fileSize / 1024).toFixed(1)}KB），该文件已作为加密文件资产添加到当前工作计划中。如果用户正在创建计划，回复告知用户文件已添加。如果用户没有在创建计划，告知用户文件已保存。`
          });
        }
      }

      // 构建消息列表
      const newMessages: LLMMessage[] = [
        ...context.messages,
        { role: 'user', content: userMessage }
      ];

      // 调用大模型
      const llmResponse = await this.callLLM(newMessages);

      // 检查是否包含工具调用（JSON格式）
      let finalResponse = llmResponse;
      let intent = 'direct';

      try {
        // 从响应中提取所有JSON对象（处理多行JSON的情况）
        const jsonMatches = this.extractJsonObjects(llmResponse);
        
        if (jsonMatches && jsonMatches.length > 0) {
          console.log(`发现 ${jsonMatches.length} 个工具调用`);
          
          // 依次执行所有工具调用
          const results: string[] = [];
          for (const jsonStr of jsonMatches) {
            try {
              const parsed = JSON.parse(jsonStr);
              console.log('LLM返回工具调用:', parsed);
              
              if (parsed.tool && parsed.args) {
                // 将CURRENT_USER替换为实际用户ID
                const argsWithUserId = { ...parsed.args };
                if (argsWithUserId.userId === 'CURRENT_USER') {
                  argsWithUserId.userId = userId;
                }
                
                // 执行工具
                console.log(`执行工具: ${parsed.tool}, 参数:`, argsWithUserId);
                const toolResponse = await this.executeTool(parsed.tool, argsWithUserId, userId, context);
                console.log('工具执行结果:', toolResponse);
                
                // 格式化响应
                const formattedResult = this.parseToolResponse(toolResponse);
                results.push(formattedResult);
                intent = parsed.tool;
              }
            } catch (e) {
              console.log('跳过无效的JSON:', jsonStr.substring(0, 50));
            }
          }
          
          // 合并所有结果
          if (results.length > 0) {
            finalResponse = results.join('\n\n');
          }
        }
      } catch (parseError: any) {
        // 不是JSON格式或解析失败，直接返回自然语言响应
        console.log('LLM返回自然语言响应:', llmResponse.substring(0, 100));
      }

      // 添加助手消息到历史
      const updatedMessages: LLMMessage[] = [
        ...newMessages,
        { role: 'assistant', content: finalResponse }
      ];

      return {
        response: finalResponse,
        intent: intent,
        nextContext: {
          ...context,
          messages: updatedMessages,
          history: [...context.history, { role: 'user', content: userMessage }, { role: 'assistant', content: finalResponse }]
        }
      };
    } catch (error: any) {
      console.error('LLM处理失败:', error);
      return {
        response: `处理失败：${error.message}`,
        intent: 'error',
        nextContext: context
      };
    }
  }
}

export const llmService = new LLMService();
