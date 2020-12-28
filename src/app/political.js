import to from 'await-to-js'
import * as StatusCodes from 'http-status-codes'
import { model } from '../models'
import { AppError, logger } from '../utils'

export class Political {
  constructor() {}

  /** Get all provinces */
  getAllProvinces = async () => {
    try {
      let [err, result] = await to(model.political.getAllProvinces())
      if (err) throw err
      return result
    } catch (error) {
      logger.error('Political.getAllProvinces() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách tỉnh/thành phố thất bại' })
    }
  }

  /**
   * Get all district belong to provinces
   * @param {string} provinces List of province id
   */
  getDistrictsByProvinceIds = async (provinces) => {
    try {
      const provinceIds = provinces ? provinces.split(',') : []

      let [err, result] = await to(model.political.getDistrictsByProvinceIds(provinceIds))
      if (err) throw err

      return result
    } catch (error) {
      logger.error('Political.getDistrictsByProvinceIds() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách quận/huyện thất bại' })
    }
  }

  /**
   * Get all commune belong to districts
   * @param {string} districts  List of district id
   */
  getCommunesByDistrictIds = async (districts) => {
    try {
      const districtIds = districts ? districts.split(',') : []

      let [err, result] = await to(model.political.getCommunesByDistrictIds(districtIds))
      if (err) throw err

      return result
    } catch (error) {
      logger.error('Political.getCommunesByDistrictIds() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách phường/xã thất bại' })
    }
  }

  /**
   * Get political for mobile apps
   * @param {string} province province id
   */
  gePoliticalForMobile = async (province) => {
    try {
      let [err, result] = await to(model.political.getPoliticalForMobile(province))
      if (err) throw err
      return result
    } catch (error) {
      logger.error('Political.gePoliticalForMobile() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin địa phận hành chính thất bại' })
    }
  }
}
