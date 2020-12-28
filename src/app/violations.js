import to from 'await-to-js'
import * as StatusCodes from 'http-status-codes'
import { model } from '../models'
import { AppError, logger } from '../utils'

export class Violations {
  constructor() { }

  /** Get all violations */
  getAllViolations = async () => {
    try {
      let [err, result] = await to(model.violations.getAllViolations())
      if (err) throw err
      return result
    } catch (error) {
      logger.error('Violations.getAllViolations() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách vi phạm thất bại' })
    }
  }
}
