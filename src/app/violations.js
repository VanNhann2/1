import to from 'await-to-js'
import * as StatusCodes from 'http-status-codes'
import { model } from '../models'
import { AppError, logger } from '../utils'
import mongoose from 'mongoose'

export class Violation {
  constructor() { }

  /** Get all violations */
  getAll = async (action, status, plate) => {
    try {
      const IsAction = action ? action.split(',') : []
      const IsStatus = status ? status.split(',') : []
      const Isplate = plate ? plate.split(',') : []
      console.log("isplate: " + Isplate)
      let [err, result] = await to(model.violations.getAll(IsAction, IsStatus, Isplate))
      if (err) throw err
      return result
    } catch (error) {
      logger.error('Violations.getAllViolations() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách vi phạm thất bại' })
    }
  }

  getById = async (id) => {

    try {
      let [err, result] = await to(model.violations.getById(id))
      console.log(result)
      console.log("resulttttttttttttttttttttttt" + result)
      if (err) {
        throw err
      }

      return result
    } catch (error) {
      logger.error('Violations.getById() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin vi phạm thất bại' })
    }
  }

  /**
   * Delete violations
   * @param {string|mongoose.Types.ObjectId} id
   */
  delete = async (id) => {
    //////// session dung de xoa CA 2 table khac nhau neu ben table A get thuoc tinh table B
    // let session = undefined
    try {
      // let [errSession, newSession] = await to(mongoose.startSession())
      // if (errSession) throw errSession
      // session = newSession
      // session.startTransaction()

      // let [errDelete] = await to(model.violations.delete(id, session))
      // if (errDelete) throw errDelete

      // session.endSession()

      let [errDelete] = await to(model.violations.delete(id))
      if (errDelete) throw errDelete

      return 'Xóa vi phạm thành công'
    } catch (error) {
      logger.error('Violations.delete() error:', error)
      if (session) await session.abortTransaction()
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Xóa vi phạm thất bại' })
    }
  }
}