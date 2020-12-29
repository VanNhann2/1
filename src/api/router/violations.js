import _ from 'lodash'
import * as StatusCodes from 'http-status-codes'
import { RequestError } from '../../utils'
import { app } from '../../app'
import * as validator from '../../validator'

export const violationsRouter = (router) => {
    router.get('/violations', async (req, res) => {
        try {
            const result = await app.violations.getAll()
            res.json(result)
            console.log(result)
        } catch (error) {
            console.log(error)
        }
    })

    router.get('/violations/:id', async (req, res, next) => {
        try {
            const { id } = req.params
            if (!validator.isMongoId(id)) {
                throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
            }

            const result = await app.violations.getById(id)
            res.json(result)
        } catch (error) {
            next(error)
        }
    })

    router.delete('/violations/:id', async (req, res, next) => {
        try {
          const { id } = req.params
          if (!validator.isMongoId(id)) {
            throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id camera không hợp lệ' })
          }
    
          const result = await app.violations.delete(id)
          res.json(result)
        } catch (error) {
          next(error)
        }
      })
}