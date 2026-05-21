import { legacyPlanService } from './legacyPlanService';
import { userService } from './userService';

// 意图类型定义
export type IntentType =
  | 'create_plan'
  | 'inherit_plan'
  | 'submit_share'
  | 'add_asset'
  | 'add_guardian'
  | 'set_threshold'
  | 'set_timelock'
  | 'query_plans'
  | 'query_status'
  | 'help'
  | 'unknown';

// 解析结果接口
export interface ParsedCommand {
  intent: IntentType;
  params: Record<string, any>;
  confidence: number;
}

// 对话上下文
export interface DialogContext {
  currentStep: 'idle' | 'creating' | 'inherit' | 'submitting';
  workingPlan: Partial<any> | null;
  collectedData: Record<string, any>;
  history: Array<{ role: string; content: string }>;
}

// AI助手服务
class AIService {
  // 命令匹配规则
  private commandRules: Array<{
    intent: IntentType;
    patterns: RegExp[];
    paramExtractors?: Array<{ key: string; pattern: RegExp }>;
    examples: string[];
    description: string;
  }> = [
    {
      intent: 'create_plan',
      patterns: [
        /创建.*计划/i,
        /发起.*遗产/i,
        /新建.*计划/i,
        /开始.*计划/i,
        /建立.*遗产/i,
        /我想创建.*计划/i
      ],
      paramExtractors: [
        { key: 'name', pattern: /名为['"]([^'"]+)['"]/i },
        { key: 'name', pattern: /计划[\u4e00-\u9fa5a-zA-Z0-9]+/i }
      ],
      examples: ['创建一个名为"我的遗产"的计划', '发起遗产计划'],
      description: '创建新的遗产计划'
    },
    {
      intent: 'inherit_plan',
      patterns: [
        /继承.*计划/i,
        /接收.*遗产/i,
        /认领.*遗产/i,
        /申请继承/i
      ],
      paramExtractors: [
        { key: 'planId', pattern: /计划ID[：:]?\s*([^\s]+)/i },
        { key: 'planId', pattern: /ID[：:]?\s*([^\s]+)/i },
        { key: 'planId', pattern: /([a-f0-9\-]{36})/i }
      ],
      examples: ['继承计划ID xxx-xxx', '申请继承遗产'],
      description: '继承他人的遗产计划'
    },
    {
      intent: 'submit_share',
      patterns: [
        /提交.*份额/i,
        /确认.*份额/i,
        /同意.*计划/i,
        /签署.*同意/i
      ],
      paramExtractors: [
        { key: 'planId', pattern: /计划ID[：:]?\s*([^\s]+)/i },
        { key: 'planId', pattern: /ID[：:]?\s*([^\s]+)/i },
        { key: 'shareValue', pattern: /份额值[：:]?\s*([^\s]+)/i }
      ],
      examples: ['为计划ID xxx-xxx提交份额', '确认份额'],
      description: '监护人提交确认份额'
    },
    {
      intent: 'add_asset',
      patterns: [
        /添加.*资产/i,
        /资产.*名称/i,
        /增加.*资产/i
      ],
      paramExtractors: [
        { key: 'name', pattern: /资产[：:]?\s*([^\s,，]+)/i },
        { key: 'type', pattern: /类型[：:]?\s*([^\s,，]+)/i },
        { key: 'value', pattern: /价值[：:]?\s*([^\s,，]+)/i }
      ],
      examples: ['添加资产：比特币，类型：加密货币', '资产名称：房产'],
      description: '向计划中添加资产'
    },
    {
      intent: 'add_guardian',
      patterns: [
        /添加.*监护人/i,
        /监护人.*姓名/i,
        /增加.*监护人/i
      ],
      paramExtractors: [
        { key: 'name', pattern: /监护人[：:]?\s*([^\s,，]+)/i },
        { key: 'email', pattern: /邮箱[：:]?\s*([^\s,，]+)/i }
      ],
      examples: ['添加监护人张三，邮箱zhang@xxx.com', '监护人：李四'],
      description: '添加监护人'
    },
    {
      intent: 'set_threshold',
      patterns: [
        /设置.*门限/i,
        /门限.*配置/i,
        /阈值设置/i
      ],
      paramExtractors: [
        { key: 'threshold', pattern: /(\d+)-of-(\d+)/i },
        { key: 'threshold', pattern: /门限[：:]?\s*(\d+)/i },
        { key: 'total', pattern: /总份额[：:]?\s*(\d+)/i }
      ],
      examples: ['设置门限为2-of-3', '门限配置：2-3'],
      description: '设置监护人门限配置'
    },
    {
      intent: 'set_timelock',
      patterns: [
        /设置.*时间锁/i,
        /时间锁.*天数/i,
        /延迟.*时间/i
      ],
      paramExtractors: [
        { key: 'days', pattern: /(\d+)\s*天/i },
        { key: 'days', pattern: /时间锁[：:]?\s*(\d+)/i }
      ],
      examples: ['设置时间锁为30天', '时间锁：15天'],
      description: '设置时间锁延迟'
    },
    {
      intent: 'query_plans',
      patterns: [
        /查看.*计划/i,
        /我的.*计划/i,
        /计划列表/i,
        /有多少.*计划/i
      ],
      examples: ['查看我的计划', '计划列表'],
      description: '查询我的遗产计划列表'
    },
    {
      intent: 'query_status',
      patterns: [
        /查询.*状态/i,
        /状态.*如何/i,
        /进度.*查询/i
      ],
      paramExtractors: [
        { key: 'planId', pattern: /计划ID[：:]?\s*([^\s]+)/i }
      ],
      examples: ['查询计划状态', '计划xxx的状态'],
      description: '查询计划状态'
    },
    {
      intent: 'help',
      patterns: [
        /帮助/i,
        /帮助我/i,
        /功能/i,
        /能做什么/i,
        /指令/i
      ],
      examples: ['帮助', '我能做什么'],
      description: '显示帮助信息'
    }
  ];

  // 解析用户输入
  parseCommand(message: string): ParsedCommand {
    let bestMatch: ParsedCommand = {
      intent: 'unknown',
      params: {},
      confidence: 0
    };

    for (const rule of this.commandRules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(message)) {
          const params: Record<string, any> = {};
          
          // 提取参数
          if (rule.paramExtractors) {
            for (const extractor of rule.paramExtractors) {
              const match = message.match(extractor.pattern);
              if (match) {
                // 如果是阈值配置，提取两个数字
                if (extractor.key === 'threshold' && match.length >= 3) {
                  params['threshold'] = parseInt(match[1]);
                  params['total'] = parseInt(match[2]);
                } else {
                  params[extractor.key] = match[1];
                }
              }
            }
          }

          // 计算置信度（基于匹配的模式数量）
          const confidence = this.calculateConfidence(message, rule);
          
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              intent: rule.intent,
              params,
              confidence
            };
          }
        }
      }
    }

    return bestMatch;
  }

  // 计算置信度
  private calculateConfidence(message: string, rule: typeof this.commandRules[0]): number {
    let score = 0;
    
    // 匹配的模式数量
    let matchedPatterns = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(message)) {
        matchedPatterns++;
      }
    }
    score += (matchedPatterns / rule.patterns.length) * 0.5;

    // 参数提取成功数量
    if (rule.paramExtractors) {
      let extractedParams = 0;
      for (const extractor of rule.paramExtractors) {
        if (message.match(extractor.pattern)) {
          extractedParams++;
        }
      }
      score += (extractedParams / rule.paramExtractors.length) * 0.3;
    }

    // 长度匹配（越长越具体）
    const avgExampleLength = rule.examples.reduce((sum, ex) => sum + ex.length, 0) / rule.examples.length;
    const lengthScore = Math.min(message.length / avgExampleLength, 1);
    score += lengthScore * 0.2;

    return Math.min(score, 1);
  }

  // 执行命令
  async executeCommand(
    intent: IntentType,
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ): Promise<{
    response: string;
    nextContext: DialogContext;
    actionResult?: any;
  }> {
    switch (intent) {
      case 'create_plan':
        return this.handleCreatePlan(params, userId, context);
      case 'inherit_plan':
        return this.handleInheritPlan(params, userId, context);
      case 'submit_share':
        return this.handleSubmitShare(params, userId, context);
      case 'add_asset':
        return this.handleAddAsset(params, userId, context);
      case 'add_guardian':
        return this.handleAddGuardian(params, userId, context);
      case 'set_threshold':
        return this.handleSetThreshold(params, userId, context);
      case 'set_timelock':
        return this.handleSetTimelock(params, userId, context);
      case 'query_plans':
        return this.handleQueryPlans(params, userId, context);
      case 'query_status':
        return this.handleQueryStatus(params, userId, context);
      case 'help':
        return this.handleHelp(params, userId, context);
      default:
        return this.handleUnknown(params, userId, context);
    }
  }

  // 处理创建计划
  private async handleCreatePlan(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    const newContext = { ...context };
    
    if (!newContext.workingPlan) {
      newContext.workingPlan = {
        name: params.name || '',
        assets: [],
        guardians: [],
        threshold: 2,
        totalShares: 3,
        triggerMode: 'consensus' as const,
        timeLock: 0
      };
      newContext.currentStep = 'creating';
    }

    if (params.name) {
      newContext.workingPlan.name = params.name;
    }

    // 检查是否收集了足够信息
    const hasName = newContext.workingPlan.name;
    const hasAssets = newContext.workingPlan.assets.length > 0;
    const hasGuardians = newContext.workingPlan.guardians.length > 0;

    if (!hasName) {
      return {
        response: '好的，我来帮您创建遗产计划。请告诉我计划名称？',
        nextContext: newContext
      };
    } else if (!hasAssets) {
      return {
        response: `计划名称已设置为"${newContext.workingPlan.name}"。现在添加资产，请问资产名称和类型？（例如：比特币，类型：加密货币）`,
        nextContext: newContext
      };
    } else if (!hasGuardians) {
      return {
        response: '资产已添加。现在添加监护人，请问监护人姓名和邮箱？（例如：张三，邮箱zhang@xxx.com）',
        nextContext: newContext
      };
    } else {
      // 创建计划
      try {
        const plan = await legacyPlanService.createPlan({
          ...newContext.workingPlan,
          creatorId: userId
        });
        
        return {
          response: `遗产计划创建成功！\n\n计划ID：${plan.id}\n计划名称：${plan.name}\n资产数量：${plan.assets.length}\n监护人数量：${plan.guardians.length}\n门限配置：${plan.threshold}-of-${plan.totalShares}`,
          nextContext: {
            currentStep: 'idle',
            workingPlan: null,
            collectedData: {},
            history: [...context.history, { role: 'assistant', content: '计划创建成功' }]
          },
          actionResult: plan
        };
      } catch (error: any) {
        return {
          response: `创建计划失败：${error.message}`,
          nextContext: newContext
        };
      }
    }
  }

  // 处理添加资产
  private async handleAddAsset(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    const newContext = { ...context };
    
    if (!newContext.workingPlan) {
      return {
        response: '您还没有创建计划，请先创建一个遗产计划。',
        nextContext: newContext
      };
    }

    if (!newContext.workingPlan.assets) {
      newContext.workingPlan.assets = [];
    }

    const asset = {
      name: params.name || '未命名资产',
      type: params.type || '其他',
      value: params.value || '',
      description: params.description || ''
    };

    newContext.workingPlan.assets.push(asset);

    return {
      response: `资产"${asset.name}"（类型：${asset.type}）已添加。\n\n当前资产列表：\n${newContext.workingPlan.assets.map((a: any, i: number) => `${i + 1}. ${a.name} (${a.type})`).join('\n')}\n\n继续添加资产还是添加监护人？`,
      nextContext: newContext
    };
  }

  // 处理添加监护人
  private async handleAddGuardian(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    const newContext = { ...context };
    
    if (!newContext.workingPlan) {
      return {
        response: '您还没有创建计划，请先创建一个遗产计划。',
        nextContext: newContext
      };
    }

    if (!newContext.workingPlan.guardians) {
      newContext.workingPlan.guardians = [];
    }

    const guardian = {
      id: `guardian_${Date.now()}`,
      name: params.name || '未命名',
      email: params.email || '',
      role: 'guardian'
    };

    newContext.workingPlan.guardians.push(guardian);

    // 更新总份额数为监护人数量
    newContext.workingPlan.totalShares = newContext.workingPlan.guardians.length;
    // 确保门限不超过总份额
    if (newContext.workingPlan.threshold > newContext.workingPlan.totalShares) {
      newContext.workingPlan.threshold = Math.max(1, newContext.workingPlan.totalShares);
    }

    return {
      response: `监护人"${guardian.name}"（邮箱：${guardian.email}）已添加。\n\n当前监护人列表：\n${newContext.workingPlan.guardians.map((g: any, i: number) => `${i + 1}. ${g.name} <${g.email}>`).join('\n')}\n\n门限配置已更新为 ${newContext.workingPlan.threshold}-of-${newContext.workingPlan.totalShares}\n\n继续添加监护人、设置门限或确认创建计划？`,
      nextContext: newContext
    };
  }

  // 处理设置门限
  private async handleSetThreshold(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    const newContext = { ...context };
    
    if (!newContext.workingPlan) {
      return {
        response: '您还没有创建计划，请先创建一个遗产计划。',
        nextContext: newContext
      };
    }

    const threshold = params.threshold !== undefined ? parseInt(params.threshold as string) : undefined;
    const total = params.total !== undefined ? parseInt(params.total as string) : undefined;

    if (threshold !== undefined) {
      newContext.workingPlan.threshold = threshold;
    }
    if (total !== undefined) {
      newContext.workingPlan.totalShares = total;
    }

    return {
      response: `门限配置已更新为 ${newContext.workingPlan.threshold}-of-${newContext.workingPlan.totalShares}。\n\n是否需要设置时间锁？（例如：设置时间锁为30天）`,
      nextContext: newContext
    };
  }

  // 处理设置时间锁
  private async handleSetTimelock(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    const newContext = { ...context };
    
    if (!newContext.workingPlan) {
      return {
        response: '您还没有创建计划，请先创建一个遗产计划。',
        nextContext: newContext
      };
    }

    const days = params.days !== undefined ? parseInt(params.days as string) : 30;
    
    newContext.workingPlan.timeLock = days;
    newContext.workingPlan.triggerMode = 'timed';

    return {
      response: `时间锁已设置为 ${days} 天。触发模式已切换为"时间锁"模式。\n\n计划摘要：\n名称：${newContext.workingPlan.name}\n资产：${newContext.workingPlan.assets.length}个\n监护人：${newContext.workingPlan.guardians.length}位\n门限：${newContext.workingPlan.threshold}-of-${newContext.workingPlan.totalShares}\n时间锁：${days}天\n\n确认创建计划吗？`,
      nextContext: newContext
    };
  }

  // 处理继承计划
  private async handleInheritPlan(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    const planId = params.planId;
    
    if (!planId) {
      return {
        response: '请提供要继承的遗产计划ID。（例如：继承计划ID xxx-xxx）',
        nextContext: context
      };
    }

    try {
      const plan = legacyPlanService.getPlan(planId);
      if (!plan) {
        return {
          response: `未找到计划ID为 "${planId}" 的遗产计划。`,
          nextContext: context
        };
      }

      // 获取用户信息
      const user = await userService.getUser(userId);
      if (!user) {
        return {
          response: '用户信息获取失败，请重新登录。',
          nextContext: context
        };
      }

      // 发起继承请求
      const result = await legacyPlanService.initiateInheritance({
        planId,
        heirAddress: user.email,
        heirEmail: user.email,
        guardianSignatures: []
      });

      return {
        response: `继承请求已提交！\n\n计划名称：${plan.name}\n计划ID：${plan.id}\n状态：${result.status}\n\n监护人将收到通知，请等待他们确认。`,
        nextContext: {
          currentStep: 'idle',
          workingPlan: null,
          collectedData: {},
          history: [...context.history, { role: 'assistant', content: '继承请求已提交' }]
        },
        actionResult: result
      };
    } catch (error: any) {
      return {
        response: `继承请求失败：${error.message}`,
        nextContext: context
      };
    }
  }

  // 处理提交份额
  private async handleSubmitShare(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    const planId = params.planId;
    
    if (!planId) {
      return {
        response: '请提供要提交份额的计划ID。（例如：为计划ID xxx-xxx提交份额）',
        nextContext: context
      };
    }

    try {
      const result = await legacyPlanService.submitGuardianShare({
        planId,
        guardianId: userId,
        shareValue: params.shareValue || ''
      });

      if (result.success) {
        const status = await legacyPlanService.getInheritanceStatus(planId);
        return {
          response: `份额提交成功！\n\n当前进度：${status.sharesCollected}/${status.threshold} 监护人已确认\n\n${status.guardians.map((g: any) => `${g.name}: ${g.hasSubmitted ? '✓ 已确认' : '○ 待确认'}`).join('\n')}`,
          nextContext: {
            currentStep: 'idle',
            workingPlan: null,
            collectedData: {},
            history: [...context.history, { role: 'assistant', content: '份额提交成功' }]
          },
          actionResult: result
        };
      } else {
        return {
          response: `提交失败：${result.message}`,
          nextContext: context
        };
      }
    } catch (error: any) {
      return {
        response: `提交份额失败：${error.message}`,
        nextContext: context
      };
    }
  }

  // 处理查询计划
  private async handleQueryPlans(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    try {
      const plans = legacyPlanService.getUserPlans(userId);
      
      if (plans.length === 0) {
        return {
          response: '您还没有任何遗产计划。可以说"创建一个遗产计划"开始设置。',
          nextContext: context
        };
      }

      // 分类计划
      const createdPlans = plans.filter(p => p.creatorId === userId);
      const inheritorPlans = plans.filter(p => p.heirId === userId);
      const guardianPlans = plans.filter(p => p.guardians.some((g: any) => g.id === userId));

      let response = `您共有 ${plans.length} 个遗产计划：\n\n`;
      
      if (createdPlans.length > 0) {
        response += `【创建的计划】\n${createdPlans.map((p: any) => `• ${p.name} (ID: ${p.id.slice(0, 8)}..., 状态: ${p.status})`).join('\n')}\n\n`;
      }
      
      if (inheritorPlans.length > 0) {
        response += `【继承的计划】\n${inheritorPlans.map((p: any) => `• ${p.name} (ID: ${p.id.slice(0, 8)}..., 状态: ${p.status})`).join('\n')}\n\n`;
      }
      
      if (guardianPlans.length > 0) {
        response += `【监护的计划】\n${guardianPlans.map((p: any) => `• ${p.name} (ID: ${p.id.slice(0, 8)}..., 状态: ${p.status})`).join('\n')}`;
      }

      return {
        response,
        nextContext: context
      };
    } catch (error: any) {
      return {
        response: `查询计划失败：${error.message}`,
        nextContext: context
      };
    }
  }

  // 处理查询状态
  private async handleQueryStatus(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    const planId = params.planId;
    
    if (!planId) {
      return {
        response: '请提供要查询的计划ID。（例如：查询计划ID xxx-xxx的状态）',
        nextContext: context
      };
    }

    try {
      const status = await legacyPlanService.getInheritanceStatus(planId);
      
      return {
        response: `计划ID: ${planId}\n状态: ${status.status}\n门限配置: ${status.threshold}-of-${status.sharesCollected + (status.guardians.length - status.sharesCollected)}\n已收集份额: ${status.sharesCollected}\n\n监护人状态:\n${status.guardians.map((g: any) => `• ${g.name}: ${g.hasSubmitted ? '✓ 已提交' : '○ 待提交'}`).join('\n')}`,
        nextContext: context
      };
    } catch (error: any) {
      return {
        response: `查询状态失败：${error.message}`,
        nextContext: context
      };
    }
  }

  // 处理帮助
  private async handleHelp(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    const helpText = `我是您的数字遗产助手，可以帮您处理以下任务：

【创建遗产计划】
• 创建一个名为"我的遗产"的计划
• 添加资产：比特币，类型：加密货币
• 添加监护人：张三，邮箱zhang@xxx.com
• 设置门限为2-of-3
• 设置时间锁为30天

【继承遗产计划】
• 继承计划ID xxx-xxx
• 申请继承遗产

【监护人操作】
• 为计划ID xxx-xxx提交份额
• 确认份额

【查询信息】
• 查看我的计划
• 查询计划状态
• 查询计划ID xxx-xxx的状态

您可以直接输入指令，我会帮您完成操作！`;

    return {
      response: helpText,
      nextContext: context
    };
  }

  // 处理未知命令
  private async handleUnknown(
    params: Record<string, any>,
    userId: string,
    context: DialogContext
  ) {
    const suggestions = [
      '创建遗产计划',
      '继承计划ID xxx',
      '提交份额',
      '查看我的计划',
      '帮助'
    ];

    return {
      response: `抱歉，我不太理解您的意思。\n\n您可以尝试以下指令：\n${suggestions.map(s => `• ${s}`).join('\n')}\n\n或者输入"帮助"查看所有可用功能。`,
      nextContext: context
    };
  }
}

export const aiService = new AIService();