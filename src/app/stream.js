import to from 'await-to-js'
import * as StatusCodes from 'http-status-codes'
import { model } from '../models'
import { AppError, logger } from '../utils'

export class Stream {
  constructor() {}

  /**
   * Get streams
   * @param {("follow"|"unfollow")} filter
   * @param {("all"|import("mongoose").Types.ObjectId)} group
   */
  get = async (filter, group) => {
    try {
      let [err, result] = await to(model.camera.getStreams(filter, group))
      if (err) {
        throw err
      }

      return result
    } catch (error) {
      logger.error('Stream.getAll() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách stream thất bại' })
    }
  }

  getById = async (id) => {
    try {
      let [err, result] = await to(model.camera.getStreamById(id))
      if (err) {
        throw err
      }

      return result
    } catch (error) {
      logger.error('Stream.getById() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy stream thất bại' })
    }
  }

  /**
   * Add cameras to follow list
   * @param {import("mongoose").Types.ObjectId[]} cameraIds
   */
  addFollowList = async (cameraIds) => {
    try {
      const promises = []

      for (const id of cameraIds) {
        promises.push(model.camera.addFollowList(id))
      }

      let [err] = await to(Promise.all(promises))
      if (err) {
        throw err
      }

      return 'Thêm camera vào danh sách theo dõi thành công'
    } catch (error) {
      logger.error('Stream.addFollowList() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Thêm camera vào danh sách theo dõi thất bại' })
    }
  }

  /**
   * Remove cameras from follow list
   * @param {import("mongoose").Types.ObjectId[]} cameraIds
   */
  removeFollowList = async (cameraIds) => {
    try {
      const promises = []

      for (const id of cameraIds) {
        promises.push(model.camera.removeFollowList(id))
      }

      let [err] = await to(Promise.all(promises))
      if (err) {
        throw err
      }

      return 'Xóa camera khỏi danh sách theo dõi thành công'
    } catch (error) {
      logger.error('Stream.removeFollowList() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Xóa camera khỏi danh sách theo dõi thất bại' })
    }
  }
}
