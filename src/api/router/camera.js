import _ from 'lodash'
import * as StatusCodes from 'http-status-codes'
import { app } from '../../app'
import { RequestError } from '../../utils'
import * as validator from '../../validator'

/**
 * @typedef {import('express').Router} Router
 * @param {Router} router
 */
export const cameraRouter = (router) => {
  router.get('/camera', async (req, res, next) => {
    try {
      const result = await app.camera.getAll()
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/camera/group', async (req, res, next) => {
    try {
      const result = await app.camera.getGroup()
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/camera/zone', async (req, res, next) => {
    try {
      const filter = req.query.filter
      if (filter !== 'ts' && filter !== 'tlc') {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Filter không hợp lệ' })
      }

      const result = await app.camera.getZones(filter)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post('/camera/connect', async (req, res, next) => {
    try {
      const data = validator.getDataOfStep(req, validator.stepConnectData)
      const errors = await validator.validateDataOfStep(data, validator.steps.CONNECT)
      if (!_.isEmpty(errors)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Thông tin không hợp lệ', params: errors })
      }

      const result = await app.camera.addStepConnect(data)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post('/camera/param', async (req, res, next) => {
    try {
      const data = validator.getDataOfStep(req, validator.stepParamsData)
      const errors = await validator.validateDataOfStep(data, validator.steps.PARAM)
      if (!_.isEmpty(errors)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Thông tin không hợp lệ', params: errors })
      }

      const result = 'Thông tin hợp lệ'
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post('/camera/function', async (req, res, next) => {
    try {
      const data = validator.getDataOfStep(req, validator.stepFunctionsData)
      const errors = await validator.validateDataOfStep(data, validator.steps.FUNCTION, validator.actions.ADD)
      if (!_.isEmpty(errors)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Thông tin không hợp lệ', params: errors })
      }

      const result = await app.camera.addStepFunction(data)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/camera/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const result = await app.camera.getById(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/camera/:id/snapshot', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const result = await app.camera.getSnapshot(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/camera/:id/connect', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const result = await app.camera.getForEditConnect(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/camera/:id/param', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const result = await app.camera.getForEditParam(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/camera/:id/function', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const result = await app.camera.getForEditFunction(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put('/camera/:id/connect', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const data = validator.getDataOfStep(req, validator.stepConnectData)
      data.id = id
      const errors = await validator.validateDataOfStep(data, validator.steps.CONNECT, validator.actions.EDIT)
      if (!_.isEmpty(errors)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Thông tin không hợp lệ', params: errors })
      }

      const result = await app.camera.editStepConnect(id, data)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put('/camera/:id/param', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const data = validator.getDataOfStep(req, validator.stepParamsData)
      const errors = await validator.validateDataOfStep(data, validator.steps.PARAM)
      if (!_.isEmpty(errors)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Thông tin không hợp lệ', params: errors })
      }

      const result = await app.camera.editStepParam(id, data)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put('/camera/:id/function', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const data = validator.getDataOfStep(req, validator.stepFunctionsData)
      const errors = await validator.validateDataOfStep(data, validator.steps.FUNCTION, validator.actions.EDIT)
      if (!_.isEmpty(errors)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Thông tin không hợp lệ', params: errors })
      }

      const result = await app.camera.editStepFunction(id, data)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put('/camera/:id/functionstatus', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const status = req.query.status
      if (status !== 'enabled' && status !== 'disabled') {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'status không hợp lệ' })
      }

      const result = await app.camera.editFunctionStatus(id, status)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.delete('/camera/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const result = await app.camera.delete(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })
}
