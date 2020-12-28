import _ from 'lodash'
import * as StatusCodes from 'http-status-codes'
import { RequestError } from '../../utils'
import { app } from '../../app'

export const violationsRouter = (router) => {
    router.get('/violations', async (req, res, next) => {
        try {
            // const result = await app.violations.getAllViolations()
            // res.json(result)
            console.log("abcdefghijkldmn")
        } catch (error) {
            next(error)
        }
    })
}
