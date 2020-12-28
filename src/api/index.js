import { Router } from 'express'
import { cameraRouter } from './router/camera'
import { politicalRouter } from './router/political'
import { streamRouter } from './router/stream'
import { violationsRouter } from './router/violations'
export const apis = () => {
  const router = Router()
  
  // cameraRouter(router)
  // politicalRouter(router)
  // streamRouter(router)
  violationsRouter(router)
  return router
}
