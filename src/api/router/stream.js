import _ from 'lodash'
import * as StatusCodes from 'http-status-codes'
import { app } from '../../app'
import { RequestError } from '../../utils'
import * as validator from '../../validator'

/**
 * @typedef {import('express').Router} Router
 * @param {Router} router
 */
export const streamRouter = (router) => {
  router.get('/stream', async (req, res, next) => {
    try {
      const filter = req.query.filter
      if (filter !== 'follow' && filter !== 'unfollow') {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'filter không hợp lệ' })
      }

      const group = req.query.group
      if (_.isEmpty(group) || (group !== 'all' && !validator.isMongoId(group))) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'group không hợp lệ' })
      }

      const result = await app.stream.get(filter, group)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/stream/:id', async (req, res, next) => {
    try {
      const id = req.params.id
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const result = await app.stream.getById(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put('/stream', async (req, res, next) => {
    try {
      const ids = req.body.cameras

      if (!validator.isMongoIdArray(ids)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Danh sách id camera không hợp lệ' })
      }

      const result = await app.stream.addFollowList(ids)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put('/stream/:id', async (req, res, next) => {
    try {
      const id = req.params.id

      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const result = await app.stream.addFollowList([id])
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.delete('/stream', async (req, res, next) => {
    try {
      const ids = req.body.cameras

      if (!validator.isMongoIdArray(ids)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Danh sách id camera không hợp lệ' })
      }

      const result = await app.stream.removeFollowList(ids)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.delete('/stream/:id', async (req, res, next) => {
    try {
      const id = req.params.id

      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
      }

      const result = await app.stream.removeFollowList([id])
      res.json(result)
    } catch (error) {
      next(error)
    }
  })
}
