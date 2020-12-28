import _ from 'lodash'
import * as StatusCodes from 'http-status-codes'
import mongoose from 'mongoose'
import to from 'await-to-js'
import uuidv1 from 'uuid/v1'
import { logger, AppError, CameraUtils } from '../utils'
import { model } from '../models'
import { OnvifHelper } from '../services/onvif'
import { actionTypes, config } from '../configs'
import { GRpcClient } from '../services/grpc'

export class Camera {
  /** @type {GRpcClient} */
  #grpcClient = undefined
  constructor() {
    // this.#grpcClient = new GRpcClient('127.0.0.1:50053', config.protoFile, 'parking.TaskManager')
  }

  /**
   * Get all camera on database
   * @param {string} province province code
   * @param {string} district district code
   * @param {string} commune commune code
   * @param {string|mongoose.Types.ObjectId} group group ID
   * @param {string} query query string
   */
  getAll = async (province, district, commune, group, query) => {
    try {
      const provinceIds = province ? province.split(',') : []
      const districtIds = district ? district.split(',') : []
      const communeIds = commune ? commune.split(',') : []
      const groupIds = group ? group.split(',') : []

      let [err, result] = await to(model.camera.getAll(provinceIds, districtIds, communeIds, groupIds, query))
      if (err) {
        throw err
      }

      //  sort by name
      result.sort((cam1, cam2) => {
        if (cam1?.name?.match(/(\d+)/g) && cam2?.name?.match(/(\d+)/g)) {
          return Number(cam1?.name?.match(/(\d+)/g)[0]) - Number(cam2?.name?.match(/(\d+)/g)[0])
        }

        return false
      })

      return result
    } catch (error) {
      logger.error('Camera.getAll() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách tất cả camera thất bại' })
    }
  }

  /**
   * Get one camera by camera ID
   * @param {string|mongoose.Types.ObjectId} id
   */
  getById = async (id) => {
    try {
      let [err, result] = await to(model.camera.getById(id))
      if (err) {
        throw err
      }

      return {
        ...result,
        snapshotName: undefined,
        zones: undefined,
        ip: undefined,
        port: undefined,
        user: undefined,
        pass: undefined,
        rtspLink: undefined,
        function: undefined,
        video: undefined,
        dimension: undefined,
      }
    } catch (error) {
      logger.error('Camera.getById() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin camera thất bại' })
    }
  }

  /**
   * Get all group of cameras
   */
  getGroup = async () => {
    try {
      let [err, result] = await to(model.group.getAll())
      if (err) {
        throw err
      }

      // result = result.map(item => {
      //   return type === 'filter' ? { value: item.id, label: item.name } : { value: item.name, label: item.name }
      // })

      return result
    } catch (error) {
      logger.error('Camera.getGroup() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách group thất bại' })
    }
  }

  /**
   * Get zones define
   * @param {("ts"|"tlc")} app
   */
  getZones = async (app) => {
    try {
      let [err, result] = await to(model.config.getZones())
      if (err) {
        throw err
      }

      result = result.filter((item) => item.app === app || item.app === 'all')
      return result
    } catch (error) {
      logger.error('Camera.getZones() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách zone thất bại' })
    }
  }

  /**
   * Get snapshot of camera by camera ID
   * @param {string|mongoose.Types.ObjectId} id
   */
  getSnapshot = async (id) => {
    try {
      let [err, camera] = await to(model.camera.getById(id))
      if (err) throw err

      const isTemp = false
      const createThumnail = true
      let [getSnapshotError] = await to(
        new CameraUtils(camera.ip, camera.port, camera.user, camera.pass).createSnapshot(camera.rtspLink, camera.snapshotName, createThumnail, isTemp)
      )
      if (getSnapshotError) throw getSnapshotError

      return {
        snapshotFile: CameraUtils.getSnapshotFile(camera.snapshotName, isTemp),
      }
    } catch (error) {
      logger.error('Camera.getSnapshot() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy ảnh snapshot thất bại' })
    }
  }

  /**
   * Get data for edit camera, step connect
   * @param {string|mongoose.Types.ObjectId} id
   */
  getForEditConnect = async (id) => {
    try {
      let [err, camera] = await to(model.camera.getById(id))
      if (err) throw err

      return {
        name: camera.name,
        ip: camera.ip,
        port: camera.port,
        user: camera.user,
        pass: camera.pass,
        lat: camera.lat,
        lng: camera.lng,
        group: camera.group,
        province: camera.province,
        district: camera.district,
        commune: camera.commune,
        functionStatus: camera.functionStatus,
        address: camera.address,
      }
    } catch (error) {
      logger.error('Camera.getSnapshot() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin camera thất bại' })
    }
  }

  /**
   * Get data for edit camera, step param
   * @param {string|mongoose.Types.ObjectId} id
   */
  getForEditParam = async (id) => {
    try {
      let [err, camera] = await to(model.camera.getById(id))
      if (err) throw err

      // sync config on camera and database
      let [errConfig, cameraConfigs] = await to(new OnvifHelper(camera.ip, camera.port, camera.user, camera.pass).getConfigs())
      if (errConfig) throw errConfig

      const currentResolution = cameraConfigs?.profile?.video?.encoder?.resolution
      const currentQuality = cameraConfigs?.profile?.video?.encoder?.quality
      const currentFps = cameraConfigs?.profile?.video?.encoder?.framerate

      if (!currentResolution || !currentQuality || !currentFps) throw new Error('invalid data from camera')

      if (
        currentResolution.width !== camera.video.width ||
        currentResolution.height !== camera.video.height ||
        currentQuality !== camera.video.quality ||
        currentFps !== camera.video.fps
      ) {
        logger.debug('config changed on camera, will be sync to database')
        await model.camera.syncVideoConfigs(id, currentResolution.width, currentResolution.height, currentQuality, currentFps)
      }

      return {
        resolution: { width: currentResolution.width, height: currentResolution.height },
        resolutionRange: camera.video.resolutionRange,
        quality: currentQuality,
        qualityRange: camera.video.qualityRange,
        fps: currentFps,
        fpsRange: camera.video.fpsRange,
      }
    } catch (error) {
      logger.error('Camera.getForEditParam() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin camera thất bại' })
    }
  }

  /**
   * Get data for edit camera, step function
   * @param {string|mongoose.Types.ObjectId} id
   */
  getForEditFunction = async (id) => {
    try {
      let [err, camera] = await to(model.camera.getById(id))
      if (err) throw err

      //refresh snapshot image
      const isTemp = false
      const createThumnail = true
      let [getSnapshotError] = await to(
        new CameraUtils(camera.ip, camera.port, camera.user, camera.pass).createSnapshot(camera.rtspLink, camera.snapshotName, createThumnail, isTemp)
      )
      if (getSnapshotError) throw getSnapshotError

      return {
        recordEnabled: camera.function.record.enabled,
        recordDuration: camera.function.record.duration, //minute
        recordMaxKeepDay: camera.function.record.maxKeepDay, //date
        streamEnabled: camera.function.stream.enabled,
        alprEnabled: camera.function.alpr.enabled,
        surveillanceEnabled: camera.function.surveillance.enabled,
        snapshotFile: CameraUtils.getSnapshotFile(camera.snapshotName, isTemp),
        zones: camera.zones,
        dimension: camera.dimension,
      }
    } catch (error) {
      logger.error('Camera.getForEditFunction() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin camera thất bại' })
    }
  }

  /**
   * Add new camera, step connect
   * @typedef {typeof import('../validator').stepConnectData} stepConnectData
   * @param {stepConnectData} data
   */
  addStepConnect = async (data) => {
    try {
      let [err, cameraConfigs] = await to(new OnvifHelper(data.ip, data.port, data.user, data.pass).getConfigs())
      if (err) throw err

      const resolutions = cameraConfigs?.video?.H264?.ResolutionsAvailable?.map((resolution) => ({ width: resolution.Width, height: resolution.Height }))

      const rtspLink = cameraConfigs?.rtsp

      //create temporary snapshot image for draw zones on last step
      const snapshotName = uuidv1()
      const isTemp = true
      const createThumnail = false
      let [getSnapshotError] = await to(
        new CameraUtils(data.ip, data.port, data.user, data.pass).createSnapshot(rtspLink, snapshotName, createThumnail, isTemp)
      )
      if (getSnapshotError) throw getSnapshotError

      return {
        resolution: cameraConfigs?.profile?.video?.encoder?.resolution,
        resolutionRange: resolutions,
        quality: cameraConfigs?.profile?.video?.encoder?.quality,
        qualityRange: cameraConfigs?.video?.QualityRange,
        fps: cameraConfigs?.profile?.video?.encoder?.framerate,
        fpsRange: cameraConfigs?.video?.H264?.FrameRateRange,
        encoder: cameraConfigs?.profile?.video?.encoder?.encoding,
        rtspLink: rtspLink,
        snapshotLink: cameraConfigs?.profile?.snapshot,
        snapshotName: snapshotName,
        snapshotFile: CameraUtils.getSnapshotFile(snapshotName, isTemp),
      }
    } catch (error) {
      logger.error('Camera.addStepConnect() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Kết nối camera thất bại' })
    }
  }

  /**
   * Add new camera, step function
   * @typedef {typeof import('../validator').stepFunctionsData} stepFunctionsData
   * @param {stepFunctionsData} data Data of step function
   */
  addStepFunction = async (data) => {
    try {
      //TODO: set config video for camera via onvif

      // Generate snapshot uuid, it not yet
      if (_.isEmpty(data.snapshotName)) data.snapshotName = uuidv1()

      let [errCamera, newCamera] = await to(this.#saveCamera(data))
      if (errCamera) throw errCamera

      //add tasks for add new camera
      const authRtspLink = newCamera.rtspLink.replace(newCamera.ip, newCamera.user + ':' + newCamera.pass + '@' + newCamera.ip)
      let [errTask] = await to(this.#addNewTasks(newCamera._id, authRtspLink))
      if (errTask) throw errTask

      //notify to task manager
      let [errNotify] = await to(this.#notifyTaskManager())
      if (errNotify) throw errNotify

      return 'Thêm camera thành công'
    } catch (error) {
      logger.error('Camera.addStepFunction() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Thêm camera thất bại' })
    }
  }

  /**
   * Edit camera, step connect
   * @param {string|mongoose.Types.ObjectId} id
   * @typedef {typeof import('../validator').stepConnectData} stepConnectData
   * @param {stepConnectData} data
   */
  editStepConnect = async (id, data) => {
    try {
      let [err, camera] = await to(model.camera.getById(id))
      if (err) throw err

      let newConfigs = undefined

      if (camera.ip !== data.ip) {
        let [err] = await to(new OnvifHelper(camera.ip, camera.port, camera.user, camera.pass).setIp(data.ip))
        if (err) throw err

        let [errGetConfig, cameraConfigs] = await to(new OnvifHelper(data.id, data.port, data.user, data.pass).getConfigs())
        if (errGetConfig) throw errGetConfig

        newConfigs = cameraConfigs
      }

      let [errUpdate, updatedCamera] = await to(this.#updateCamera(id, data, newConfigs))
      if (errUpdate) throw errUpdate

      if (!_.isEmpty(newConfigs) && updatedCamera.function.enabled === true) {
        //add tasks for edit camera
        const authRtspLink = updatedCamera.rtspLink.replace(updatedCamera.ip, updatedCamera.user + ':' + updatedCamera.pass + '@' + updatedCamera.ip)

        if (updatedCamera.function.stream.enabled === true) {
          let [errTask] = await to(this.#addStreamTask(id, 'restart', authRtspLink))
          if (errTask) throw errTask
        }

        if (updatedCamera.function.record.enabled === true) {
          let [errTask] = await to(this.#addRecordTask(id, 'restart', authRtspLink))
          if (errTask) throw errTask
        }

        if (updatedCamera.function.surveillance.enabled === true || updatedCamera.function.alpr.enabled === true) {
          let [errTask] = await to(this.#addAnalyticsTask(id, 'restart', authRtspLink))
          if (errTask) throw errTask
        }

        //notify to task manager
        let [errNotify] = await to(this.#notifyTaskManager())
        if (errNotify) throw errNotify
      }

      return 'Lưu thành công'
    } catch (error) {
      logger.error('Camera.editStepConnect() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Chỉnh sửa camera thất bại' })
    }
  }

  /**
   * Edit camera, step param
   * @param {string|mongoose.Types.ObjectId} id
   * @typedef {typeof import('../validator').stepParamsData} stepParamsData
   * @param {stepParamsData} data
   */
  editStepParam = async (id, data) => {
    try {
      let [err, camera] = await to(model.camera.getById(id))
      if (err) throw err

      //check if config not changed
      if (
        data.resolution.width === camera.video.width &&
        data.resolution.height === camera.video.height &&
        data.quality === camera.video.quality &&
        data.fps === camera.video.fps
      ) {
        return 'Lưu thành công'
      }

      const onvif = new OnvifHelper(camera.ip, camera.port, camera.user, camera.pass)

      let [errSetConfig] = await to(onvif.setVideoConfig(data.resolution.width, data.resolution.height, data.quality, data.fps))
      if (errSetConfig) throw errSetConfig

      let [errUpdate, updatedCamera] = await to(model.camera.updateStepParam(id, data))
      if (errUpdate) throw errUpdate

      if (updatedCamera.function.enabled === true) {
        //add tasks for edit camera
        const authRtspLink = updatedCamera.rtspLink.replace(updatedCamera.ip, updatedCamera.user + ':' + updatedCamera.pass + '@' + updatedCamera.ip)

        if (updatedCamera.function.stream.enabled === true) {
          let [errTask] = await to(this.#addStreamTask(id, 'restart', authRtspLink))
          if (errTask) throw errTask
        }

        if (updatedCamera.function.record.enabled === true) {
          let [errTask] = await to(this.#addRecordTask(id, 'restart', authRtspLink))
          if (errTask) throw errTask
        }

        if (updatedCamera.function.surveillance.enabled === true || updatedCamera.function.alpr.enabled === true) {
          let [errTask] = await to(this.#addAnalyticsTask(id, 'restart', authRtspLink))
          if (errTask) throw errTask
        }

        //notify to task manager
        let [errNotify] = await to(this.#notifyTaskManager())
        if (errNotify) throw errNotify
      }

      return 'Lưu thành công'
    } catch (error) {
      logger.error('Camera.editStepParam() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Chỉnh sửa camera thất bại' })
    }
  }

  /**
   * Edit camera, step function
   * @param {string|mongoose.Types.ObjectId} id
   * @typedef {typeof import('../validator').stepFunctionsData} stepFunctionsData
   * @param {stepFunctionsData} data Data of step function
   */
  editStepFunction = async (id, data) => {
    try {
      //get current config of this camera
      let [errGet, currentConfig] = await to(model.camera.getById(id))
      if (errGet) throw errGet

      if (!_.isEmpty(data.zones)) {
        for (let i = 0; i < data.zones.length; i++) {
          if (data.zones[i].type === 9) {
            //waitline_10m
            data.zones[i].minDistance = 0
            data.zones[i].maxDistance = 10
          }
          if (data.zones[i].type === 10) {
            //waitline_20m
            data.zones[i].minDistance = 10
            data.zones[i].maxDistance = 20
          }
          if (data.zones[i].type === 11) {
            //waitline_30m
            data.zones[i].minDistance = 20
            data.zones[i].maxDistance = 30
          }
          if (data.zones[i].type === 12) {
            //waitline_40m
            data.zones[i].minDistance = 30
            data.zones[i].maxDistance = 40
          }
        }
      }

      let [errUpdate] = await to(model.camera.updateStepFunctions(id, data))
      if (errUpdate) throw errUpdate

      let notifyRequired = false

      //check to create according task
      if (currentConfig.function.enabled === true) {
        const authRtspLink = currentConfig.rtspLink.replace(currentConfig.ip, currentConfig.user + ':' + currentConfig.pass + '@' + currentConfig.ip)
        if (data.streamEnabled !== currentConfig.function.stream.enabled) {
          if (data.streamEnabled === false) {
            let [err] = await to(this.#addStreamTask(id, 'stop'))
            if (err) throw err
          }

          if (data.streamEnabled === true) {
            let [err] = await to(this.#addStreamTask(id, 'start', authRtspLink))
            if (err) throw err
          }

          notifyRequired = true
        }

        if (data.recordEnabled !== currentConfig.function.record.enabled) {
          if (data.recordEnabled === false) {
            let [err] = await to(this.#addRecordTask(id, 'stop'))
            if (err) throw err
          }

          if (data.recordEnabled === true) {
            let [err] = await to(this.#addRecordTask(id, 'start', authRtspLink))
            if (err) throw err
          }

          notifyRequired = true
        }

        if (data.recordDuration !== currentConfig.function.record.duration || data.recordMaxKeepDay !== currentConfig.function.record.maxKeepDay) {
          let [err] = await to(this.#addRecordTask(id, 'restart', authRtspLink))
          if (err) throw err

          notifyRequired = true
        }

        if (data.alprEnabled !== currentConfig.function.alpr.enabled) {
          let [err] = await to(this.#addAnalyticsTask(id, 'restart', authRtspLink))
          if (err) throw err

          notifyRequired = true
        }

        if (data.surveillanceEnabled !== currentConfig.function.surveillance.enabled) {
          if (data.surveillanceEnabled === false) {
            let [err] = await to(this.#addAnalyticsTask(id, 'stop'))
            if (err) throw err
          }

          if (data.surveillanceEnabled === true) {
            let [err] = await to(this.#addAnalyticsTask(id, 'start', authRtspLink))
            if (err) throw err
          }

          notifyRequired = true
        }

        // const sameZones = _.intersectionWith(data.zones, currentConfig.zones, (z1, z2) => {
        //   return z1.type === z2.type
        // })

        const oldZones = _.differenceWith(currentConfig.zones, data.zones, (z1, z2) => {
          return z1.name === z2.name && z1.type === z2.type && _.isEqual(z1.arrow, z2.arrow) && _.isEqual(z1.vertices, z2.vertices)
        })

        const newZones = _.differenceWith(data.zones, currentConfig.zones, (z1, z2) => {
          return z1.name === z2.name && z1.type === z2.type && _.isEqual(z1.arrow, z2.arrow) && _.isEqual(z1.vertices, z2.vertices)
        })

        if (!_.isEmpty(oldZones) || !_.isEmpty(newZones)) {
          let [err] = await to(this.#addAnalyticsTask(id, 'restart', authRtspLink))
          if (err) throw err

          notifyRequired = true
        }
      }

      if (notifyRequired) {
        //notify to task manager
        let [errNotify] = await to(this.#notifyTaskManager())
        if (errNotify) throw errNotify
      }

      return 'Lưu thành công'
    } catch (error) {
      logger.error('Camera.editStepFunction() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Chỉnh sửa camera thất bại' })
    }
  }

  /**
   * Edit camera, function status
   * @param {string|mongoose.Types.ObjectId} id
   * @param {string} status
   */
  editFunctionStatus = async (id, status) => {
    try {
      const boolStatus = status === 'enabled' ? true : false
      let [err, updatedCamera] = await to(model.camera.updateFunctionStatus(id, boolStatus))
      if (err) throw err

      let notifyRequired = false

      if (status === 'enabled') {
        const authRtspLink = updatedCamera.rtspLink.replace(updatedCamera.ip, updatedCamera.user + ':' + updatedCamera.pass + '@' + updatedCamera.ip)

        if (updatedCamera.functions.stream.enabled) {
          let [err] = await to(this.#addStreamTask(id, 'start', authRtspLink))
          if (err) throw err

          notifyRequired = true
        }

        if (updatedCamera.functions.record.enabled) {
          let [err] = await to(this.#addRecordTask(id, 'start', authRtspLink))
          if (err) throw err

          notifyRequired = true
        }

        if (updatedCamera.functions.surveillance.enabled || updatedCamera.functions.alpr.enabled) {
          let [err] = await to(this.#addAnalyticsTask(id, 'start', authRtspLink))
          if (err) throw err

          notifyRequired = true
        }
      }

      if (status === 'disabled') {
        //add tasks for delete camera
        let [errTask] = await to(this.#addDeleteTasks(id))
        if (errTask) throw errTask

        notifyRequired = true
      }

      if (notifyRequired === true) {
        //notify to task manager
        let [errNotify] = await to(this.#notifyTaskManager())
        if (errNotify) throw errNotify
      }

      return status === 'enabled' ? 'Bật chức năng camera thành công' : 'Tắt chức năng camera thành công'
    } catch (error) {
      logger.error('Camera.editFunctionStatus() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Tắt chức năng camera thất bại' })
    }
  }

  /**
   * Delete camera
   * @param {string|mongoose.Types.ObjectId} id
   */
  delete = async (id) => {
    let session = undefined
    try {
      let [errSession, newSession] = await to(mongoose.startSession())
      if (errSession) throw errSession

      session = newSession

      session.startTransaction()

      let [errGroups, groups] = await to(model.camera.getGroup(id))
      if (errGroups) throw errGroups

      //remove this camera from groups
      for (const gr of groups) {
        let [err] = await to(model.group.removeCamera(gr._id, id, session))
        if (err) throw err
      }

      let [errDelete] = await to(model.camera.delete(id, session))
      if (errDelete) throw errDelete

      // commit transaction
      let [errCommitTransaction] = await to(session.commitTransaction())
      if (errCommitTransaction) throw errCommitTransaction

      session.endSession()

      //add tasks for delete camera
      let [errTask] = await to(this.#addDeleteTasks(id))
      if (errTask) throw errTask

      //notify to task manager
      let [errNotify] = await to(this.#notifyTaskManager())
      if (errNotify) throw errNotify

      return 'Xóa camera thành công'
    } catch (error) {
      logger.error('Camera.delete() error:', error)
      if (session) await session.abortTransaction()
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Xóa camera thất bại' })
    }
  }

  /**
   * Update camera to database
   * @private
   * @param {mongoose.Types.ObjectId} id
   * @typedef {typeof import('../validator').stepConnectData} stepConnectData
   * @param {stepConnectData} newData
   * @param {Object} newConfig
   */
  #updateCamera = async (id, newData, newConfig) => {
    let session = undefined
    try {
      let [errSession, newSession] = await to(mongoose.startSession())
      if (errSession) throw errSession

      session = newSession

      session.startTransaction()
      let [errUpdateGroup, newGroups] = await to(this.#updateGroup(newData.group, id, session))
      if (errUpdateGroup) throw errUpdateGroup

      newData.group = newGroups

      let updatedCamera = null

      let [errUpdateConnect, updatedConnect] = await to(model.camera.updateStepConnect(id, newData, session))
      if (errUpdateConnect) throw errUpdateConnect

      updatedCamera = updatedConnect

      if (!_.isEmpty(newConfig)) {
        logger.debug('update camera config to database')
        const resolutionRange = newConfig?.video?.H264?.ResolutionsAvailable.map((resolution) => ({ width: resolution.Width, height: resolution.Height }))
        const configData = {
          resolution: newConfig?.profile?.video?.encoder?.resolution,
          resolutionRange: resolutionRange,
          fps: newConfig?.profile?.video?.encoder?.framerate,
          fpsRange: newConfig?.video?.H264?.FrameRateRange,
          quality: newConfig?.profile?.video?.encoder?.quality,
          qualityRange: newConfig?.video?.QualityRange,
          encoder: newConfig?.profile?.video?.encoder?.encoding,
        }
        let [err, updatedConfig] = await to(model.camera.updateVideoConfigs(id, configData, session))
        if (err) throw err

        updatedCamera = updatedConfig
      }

      let [errCommitTransaction] = await to(session.commitTransaction())
      if (errCommitTransaction) throw errCommitTransaction

      session.endSession()

      return updatedCamera
    } catch (error) {
      if (session) await session.abortTransaction()
      throw error
    }
  }

  /**
   * Update group to database
   * @private
   * @typedef {typeof import('../validator').group} group
   * @param {group} group
   * @param {mongoose.Types.ObjectId} cameraId
   * @param {mongoose.ClientSession} session
   */
  #updateGroup = async (group, cameraId, session) => {
    let [err, cameraGroups] = await to(model.camera.getGroup(cameraId))
    if (err) throw err

    const oldGroups = _.differenceWith(cameraGroups, group, (gr1, gr2) => {
      return gr1.name === gr2.name
    })

    const sameGroups = _.intersectionWith(cameraGroups, group, (gr1, gr2) => {
      return gr1.name === gr2.name
    })

    const newGroups = _.differenceWith(group, cameraGroups, (gr1, gr2) => {
      return gr1.name === gr2.name
    })

    // groups unchanged
    if (sameGroups.length === cameraGroups.length && _.isEmpty(newGroups)) {
      return cameraGroups.map((item) => item._id)
    }

    // group changed
    let result = []

    // delete old group, if any
    if (!_.isEmpty(oldGroups)) {
      for (const gr of oldGroups) {
        let [err] = await to(model.group.removeCamera(gr._id, cameraId, session))
        if (err) throw err
      }
    }

    // update new group
    if (!_.isEmpty(newGroups)) {
      let [err, groups] = await to(this.#saveGroup(newGroups, cameraId, session))
      if (err) throw err

      result = [...groups]
    }

    // keep same groups
    result = [...result, ...sameGroups.map((item) => item._id)]

    return result
  }

  /**
   * Save new camera to database
   * @private
   * @typedef {typeof import('../validator').stepFunctionsData} stepFunctionsData
   * @param {stepFunctionsData} data Data of new camera
   */
  #saveCamera = async (data) => {
    let session = undefined
    try {
      let [errSession, newSession] = await to(mongoose.startSession())
      if (errSession) throw errSession

      session = newSession

      if (!_.isEmpty(data.zones)) {
        for (let i = 0; i < data.zones.length; i++) {
          if (data.zones[i].type === 9) {
            //waitline_10m
            data.zones[i].minDistance = 0
            data.zones[i].maxDistance = 10
          }
          if (data.zones[i].type === 10) {
            //waitline_20m
            data.zones[i].minDistance = 10
            data.zones[i].maxDistance = 20
          }
          if (data.zones[i].type === 11) {
            //waitline_30m
            data.zones[i].minDistance = 20
            data.zones[i].maxDistance = 30
          }
          if (data.zones[i].type === 12) {
            //waitline_40m
            data.zones[i].minDistance = 30
            data.zones[i].maxDistance = 40
          }
        }
      }

      session.startTransaction()

      const cameraData = {
        name: data.name,
        ip: data.ip,
        port: data.port,
        user: data.user,
        pass: data.pass,
        province: data.province,
        district: data.district,
        commune: data.commune,
        group: [],
        lat: data.lat,
        lng: data.lng,
        rtspLink: data.rtspLink,
        snapshotLink: data.snapshotLink,
        snapshotName: data.snapshotName,
        functions: {
          enabled: true,
          record: {
            enabled: data.recordEnabled,
            duration: data.recordDuration, //minutes
            maxKeepDay: data.recordMaxKeepDay, //days
            container: 'mp4', // default value
          },
          stream: {
            enabled: data.streamEnabled,
          },
          alpr: {
            enabled: data.alprEnabled,
          },
          surveillance: {
            enabled: data.surveillanceEnabled,
          },
        },
        video: {
          width: data.resolution.width,
          height: data.resolution.height,
          resolutionRange: data.resolutionRange,
          fps: data.fps,
          fpsRange: data.fpsRange,
          quality: data.quality,
          qualityRange: { Min: data.qualityRange.Min, Max: data.qualityRange.Max },
          encoder: data.encoder,
        },
        zones: data.zones,
        dimension: data.dimension,
        status: 1,
      }

      let [errAdd, newCamera] = await to(model.camera.add(cameraData, session))
      if (errAdd) throw errAdd

      // add new groups to database or update camera list of exist group
      if (!_.isEmpty(data.group)) {
        let [errAddGroup, groupList] = await to(this.#saveGroup(data.group, newCamera._id, session))
        if (errAddGroup) throw errAddGroup

        let [errUpdateGroup] = await to(model.camera.updateGroup(newCamera._id, groupList, session))
        if (errUpdateGroup) throw errUpdateGroup
      }

      //get snapshot image
      const createThumnail = true
      const isTemp = false
      let [errGetSnapshot] = await to(
        new CameraUtils(newCamera.ip, newCamera.port, newCamera.user, newCamera.pass).createSnapshot(
          newCamera.rtspLink,
          newCamera.snapshotName,
          createThumnail,
          isTemp
        )
      )
      if (errGetSnapshot) throw errGetSnapshot

      let [errCommitTransaction] = await to(session.commitTransaction())
      if (errCommitTransaction) throw errCommitTransaction

      session.endSession()

      return newCamera
    } catch (error) {
      if (session) await session.abortTransaction()
      throw error
    }
  }

  /**
   * Save group to database
   * @private
   * @typedef {typeof import('../validator').group} group
   * @param {Array<group>} group
   * @param {mongoose.Types.ObjectId} cameraId
   * @param {mongoose.ClientSession} session
   */
  #saveGroup = async (group, cameraId, session) => {
    // check if group collection empty
    let [errGroup, groups] = await to(model.group.getAll(session))
    if (errGroup) throw new Error('failed to check empty of group collection')

    const isGroupEmpty = _.isEmpty(groups) ? true : false

    let newGroups = []

    // Note: if group collection is empty or not exits, groups will be create, not care about __isNew__
    for (const gr of group) {
      // add new group
      if (gr.__isNew__ || isGroupEmpty) {
        const groupData = { name: gr.name, cameras: [cameraId] }

        let [err, newGroup] = await to(model.group.add(groupData, session))
        if (err) throw new Error('failed to add new group')

        newGroups.push(newGroup._id)
      }
      // update camera list of exist group
      else {
        let [err, updatedGroup] = await to(model.group.updateCameras(gr.name, [cameraId], session))
        if (err) throw new Error('failed to update camera of exists group')

        newGroups.push(updatedGroup._id)
      }
    }

    return newGroups
  }

  /**
   * Add tasks to do when add new camera
   * @param {string} cameraId
   * @param {string} rtspLink
   */
  #addNewTasks = async (cameraId, rtspLink) => {
    const task = {
      cameraId: cameraId,
      action: 0,
      rtspLink: rtspLink,
    }
    const taskList = [
      {
        ...task,
        action: actionTypes.Start.Stream,
      },
      {
        ...task,
        action: actionTypes.Start.Record,
      },
      {
        ...task,
        action: actionTypes.Start.Analytics,
      },
    ]

    let [err] = await to(model.task.add(taskList))
    if (err) throw err

    return
  }

  /**
   * Add tasks to do when edit camera
   * @param {string} cameraId
   * @param {string} rtspLink
   */
  #addEditTasks = async (cameraId, rtspLink) => {
    const task = {
      cameraId: cameraId,
      action: 0,
      rtspLink: rtspLink,
    }
    const taskList = [
      {
        ...task,
        action: actionTypes.Restart.Stream,
      },
      {
        ...task,
        action: actionTypes.Restart.Record,
      },
      {
        ...task,
        action: actionTypes.Restart.Analytics,
      },
    ]

    let [err] = await to(model.task.add(taskList))
    if (err) throw err

    return
  }

  /**
   * Add tasks to do when delete camera
   * @param {string} cameraId
   */
  #addDeleteTasks = async (cameraId) => {
    const task = {
      cameraId: cameraId,
      action: 0,
    }
    const taskList = [
      {
        ...task,
        action: actionTypes.Stop.Stream,
      },
      {
        ...task,
        action: actionTypes.Stop.Record,
      },
      {
        ...task,
        action: actionTypes.Stop.Analytics,
      },
    ]

    let [err] = await to(model.task.add(taskList))
    if (err) throw err

    return
  }

  /**
   * Add a stream task
   * @param {string} cameraId
   * @param {('start'|'stop'|'restart')} action
   * @param {string} rtspLink
   */
  #addStreamTask = async (cameraId, action, rtspLink = '') => {
    if (action !== 'start' && action !== 'stop' && action !== 'restart') throw new Error('invalid action')
    const taskList = [
      {
        cameraId: cameraId,
        rtspLink: rtspLink,
        action: action === 'start' ? actionTypes.Start.Stream : action === 'restart' ? actionTypes.Restart.Stream : actionTypes.Stop.Stream,
      },
    ]

    let [err] = await to(model.task.add(taskList))
    if (err) throw err

    return
  }

  /**
   * Add a record task
   * @param {string} cameraId
   * @param {('start'|'stop'|'restart')} action
   * @param {string} rtspLink
   */
  #addRecordTask = async (cameraId, action, rtspLink = '') => {
    if (action !== 'start' && action !== 'stop' && action !== 'restart') throw new Error('invalid action')
    const taskList = [
      {
        cameraId: cameraId,
        rtspLink: rtspLink,
        action: action === 'start' ? actionTypes.Start.Record : action === 'restart' ? actionTypes.Restart.Record : actionTypes.Stop.Record,
      },
    ]

    let [err] = await to(model.task.add(taskList))
    if (err) throw err

    return
  }

  /**
   * Add a analytics task
   * @param {string} cameraId
   * @param {('start'|'stop'|'restart')} action
   * @param {string} rtspLink
   */
  #addAnalyticsTask = async (cameraId, action, rtspLink = '') => {
    if (action !== 'start' && action !== 'stop' && action !== 'restart') throw new Error('invalid action')
    const taskList = [
      {
        cameraId: cameraId,
        rtspLink: rtspLink,
        action: action === 'start' ? actionTypes.Start.Analytics : action === 'restart' ? actionTypes.Restart.Analytics : actionTypes.Stop.Analytics,
      },
    ]

    let [err] = await to(model.task.add(taskList))
    if (err) throw err

    return
  }

  #notifyTaskManager = async () => {
    let [err] = await to(this.#grpcClient.makeRequest('notify', {}))
    if (err) throw err

    logger.info('notified to task manager')
    return
  }
}
