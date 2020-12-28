import * as StatusCodes from 'http-status-codes'
import { app } from '../../app'
import { RequestError } from '../../utils'

/**
 * @typedef {import('express').Router} Router
 * @param {Router} router
 */
export const politicalRouter = (router) => {
  router.get('/political/provinces', async (req, res, next) => {
    try {
      const result = await app.political.getAllProvinces()
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/political/districts', async (req, res, next) => {
    try {
      const province = req.query.province
      if (!province) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Tỉnh/thành phố không hợp lệ' })
      }

      const result = await app.political.getDistrictsByProvinceIds(province)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/political/communes', async (req, res, next) => {
    try {
      const district = req.query.district
      if (!district) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Quận/huyện không hợp lệ' })
      }

      const result = await app.political.getCommunesByDistrictIds(district)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/political/mobile', async (req, res, next) => {
    try {
      const province = req.query.province
      const result = await app.political.gePoliticalForMobile(province)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })
}
