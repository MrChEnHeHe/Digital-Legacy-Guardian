import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { legacyPlanService } from './services/legacyPlanService'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Digital Legacy Guardian API is running' })
})

app.post('/api/plans', (req, res) => {
  try {
    const plan = legacyPlanService.createPlan(req.body)
    res.json(plan)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' })
  }
})

app.get('/api/plans', (req, res) => {
  try {
    const plans = legacyPlanService.getAllPlans()
    res.json(plans)
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
