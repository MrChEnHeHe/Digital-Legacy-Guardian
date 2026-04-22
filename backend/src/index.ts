import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { legacyPlanService } from './services/legacyPlanService'
import { userService } from './services/userService'

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

app.post('/api/demo/create', async (req, res) => {
  try {
    const demoPlan = await legacyPlanService.createDemoPlan(req.body)
    res.json(demoPlan)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create demo plan' })
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})

export default app
