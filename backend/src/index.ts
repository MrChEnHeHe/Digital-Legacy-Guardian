import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { legacyPlanService } from './services/legacyPlanService'
import { userService } from './services/userService'
import { aiService } from './services/aiService'
import { llmService } from './services/llmService'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '15mb' }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Digital Legacy Guardian API is running' })
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await userService.register(req.body)
    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to register' })
  }
})

app.post('/api/auth/send-code', async (req, res) => {
  try {
    const result = await userService.sendLoginVerificationCode(req.body.email)
    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send verification code' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await userService.login(req.body)
    if (result.success) {
      res.json({ success: true, user: result.user })
    } else {
      res.status(401).json(result)
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to login' })
  }
})

app.get('/api/users/search', (req, res) => {
  try {
    const query = req.query.q as string
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' })
    }
    const users = userService.searchUserById(query)
    res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email })))
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to search users' })
  }
})

app.get('/api/users/:id', (req, res) => {
  try {
    const user = userService.getUserById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ id: user.id, name: user.name, email: user.email })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get user' })
  }
})

app.post('/api/plans', (req, res) => {
  try {
    const plan = legacyPlanService.createPlan(req.body)
    res.json(plan)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create plan' })
  }
})

app.get('/api/plans', (req, res) => {
  try {
    const userId = req.query.userId as string
    if (userId) {
      const plans = legacyPlanService.getUserPlans(userId)
      res.json(plans)
    } else {
      const plans = legacyPlanService.getAllPlans()
      res.json(plans)
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plans' })
  }
})

app.get('/api/plans/inherited', (req, res) => {
  try {
    const userId = req.query.userId as string
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }
    const plans = legacyPlanService.getPlansByInheritanceInitiator(userId)
    res.json(plans)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get inherited plans' })
  }
})

app.get('/api/plans/:id', (req, res) => {
  try {
    const plan = legacyPlanService.getPlan(req.params.id)
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    res.json(plan)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plan' })
  }
})

app.put('/api/plans/:id', (req, res) => {
  try {
    const plan = legacyPlanService.updatePlan(req.params.id, req.body)
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    res.json(plan)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' })
  }
})

app.delete('/api/plans/:id', (req, res) => {
  try {
    const deleted = legacyPlanService.deletePlan(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plan' })
  }
})

app.post('/api/plans/:id/assets', (req, res) => {
  try {
    const plan = legacyPlanService.addAsset(req.params.id, req.body)
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    res.json(plan)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add asset' })
  }
})

app.delete('/api/plans/:id/assets/:index', (req, res) => {
  try {
    const plan = legacyPlanService.removeAsset(req.params.id, parseInt(req.params.index))
    if (!plan) {
      return res.status(404).json({ error: 'Plan or asset not found' })
    }
    res.json(plan)
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove asset' })
  }
})

// 刷新计划份额（重新生成 Shamir 参数，主密钥不变）
app.post('/api/plans/:id/refresh', (req, res) => {
  try {
    const plan = legacyPlanService.refreshPlanShares(req.params.id)
    res.json({ success: true, plan })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to refresh shares' })
  }
})

app.post('/api/inheritance/initiate', (req, res) => {
  try {
    const request = legacyPlanService.initiateInheritance(req.body)
    res.json(request)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to initiate inheritance' })
  }
})

app.get('/api/inheritance/:planId', (req, res) => {
  try {
    const status = legacyPlanService.getInheritanceStatus(req.params.planId)
    res.json(status)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get inheritance status' })
  }
})

app.post('/api/inheritance/share', (req, res) => {
  try {
    const result = legacyPlanService.submitGuardianShare(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit share' })
  }
})

app.post('/api/inheritance/recover', (req, res) => {
  try {
    const assets = legacyPlanService.recoverAssets(req.body.planId, req.body.shares)
    res.json({ assets })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to recover assets' })
  }
})

// AI助手文件上传端点
app.post('/api/ai/upload', (req, res) => {
  try {
    const { name, type, size, content } = req.body
    if (!name || !content) {
      return res.status(400).json({ error: '文件名和内容不能为空' })
    }

    // 限制文件大小为 10MB
    const maxSize = 10 * 1024 * 1024
    if (size > maxSize) {
      return res.status(400).json({ error: '文件大小不能超过 10MB' })
    }

    const fileId = llmService.storeTempFile({ name, type, size, content })
    res.json({ fileId, name, type, size })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '文件上传失败' })
  }
})

// AI助手端点（模糊匹配方式）
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, userId, context } = req.body
    
    if (!message || !userId) {
      return res.status(400).json({
        response: '缺少必要参数',
        intent: 'unknown',
        params: {},
        nextContext: context || {}
      })
    }

    // 解析用户命令
    const parsed = aiService.parseCommand(message)
    
    // 执行命令
    const result = await aiService.executeCommand(
      parsed.intent,
      parsed.params,
      userId,
      context || {
        currentStep: 'idle',
        workingPlan: null,
        collectedData: {},
        history: []
      }
    )

    res.json({
      response: result.response,
      intent: parsed.intent,
      params: parsed.params,
      confidence: parsed.confidence,
      nextContext: result.nextContext,
      actionResult: result.actionResult
    })
  } catch (error: any) {
    console.error('AI chat error:', error)
    res.status(500).json({
      response: '服务器内部错误，请稍后重试。',
      intent: 'unknown',
      params: {},
      nextContext: {},
      actionResult: null
    })
  }
})

// 大模型AI助手端点
app.post('/api/ai/llm-chat', async (req, res) => {
  try {
    const { message, userId, context, fileData } = req.body

    if (!message || !userId) {
      return res.status(400).json({
        response: '缺少必要参数',
        intent: 'unknown',
        nextContext: context || {}
      })
    }

    // 检查API密钥
    if (!llmService.hasApiKey()) {
      return res.status(500).json({
        response: '大模型API密钥未配置，请先设置OPENAI_API_KEY环境变量。',
        intent: 'error',
        nextContext: context || {}
      })
    }

    // 调用大模型服务（传入可选的fileData）
    const result = await llmService.processMessage(
      message,
      userId,
      context || {
        messages: [],
        history: [],
        workingPlan: null,
        collectedData: {}
      },
      fileData
    )

    res.json({
      response: result.response,
      intent: result.intent,
      nextContext: result.nextContext,
      actionResult: result.actionResult
    })
  } catch (error: any) {
    console.error('LLM chat error:', error)
    res.status(500).json({
      response: `大模型服务错误：${error.message}`,
      intent: 'error',
      nextContext: {},
      actionResult: null
    })
  }
})

// 设置大模型API密钥（可选，用于运行时设置）
app.post('/api/ai/llm/set-key', (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API密钥不能为空' })
    }
    llmService.setApiKey(apiKey)
    res.json({ success: true, message: 'API密钥设置成功' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 检查大模型配置状态
app.get('/api/ai/llm/status', (req, res) => {
  res.json({
    hasApiKey: llmService.hasApiKey()
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})

export default app
