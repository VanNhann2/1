import mongoose from 'mongoose'
import _ from 'lodash'
import to from 'await-to-js'
import { cameraSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'
import { replacePoliticalType, CameraUtils } from '../utils'

export class CameraModel extends BaseModel {
  constructor() {
    super('Camera', new BaseSchema(cameraSchema, schemaOptions))
  }

  createCollection = async () => {
    let [err, result] = await to(this.model.createCollection())
    if (err) throw err

    return result
  }

  /** Get all cameras
   * @param {string[]} provinceIds province code
   * @param {string[]} districtIds district code
   * @param {string[]} communeIds commune code
   * @param {mongoose.Types.ObjectId[]} groupIds group ID
   * @param {string} query query string
   */

  getAll = async (provinceIds, districtIds, communeIds, groupIds, query) => {
    const provinceCondition = _.isEmpty(provinceIds) ? {} : { $or: provinceIds.map((id) => ({ province: id })) }
    const districtCondition = _.isEmpty(districtIds) ? {} : { $or: districtIds.map((id) => ({ district: id })) }
    const communeCondition = _.isEmpty(communeIds) ? {} : { $or: communeIds.map((id) => ({ commune: id })) }
    const groupCondition = _.isEmpty(groupIds) ? {} : { $or: groupIds.map((id) => ({ group: mongoose.Types.ObjectId(id) })) }
    //const nameCondition = _.isEmpty(query) ? {} : { $text: { $search: query, $caseSensitive: false, $language: 'none', $diacriticSensitive: true } }
    const nameCondition = _.isEmpty(query) ? {} : { name: { $regex: query, $options: 'i' } }
    const otherCondition = { deleted: { $ne: true } }

    const match = {
      $match: { $and: [provinceCondition, districtCondition, communeCondition, groupCondition, nameCondition, otherCondition] },
    }

    const lookup = [
      { $lookup: { from: 'provinces', localField: 'province', foreignField: 'code', as: 'province' } },
      { $lookup: { from: 'districts', localField: 'district', foreignField: 'code', as: 'district' } },
      { $lookup: { from: 'communes', localField: 'commune', foreignField: 'code', as: 'commune' } },
    ]

    const addFields = {
      $addFields: {
        address: {
          $concat: [{ $arrayElemAt: ['$commune.name', 0] }, ', ', { $arrayElemAt: ['$district.name', 0] }, ', ', { $arrayElemAt: ['$province.name', 0] }],
        },
      },
    }

    const project = {
      $project: {
        _id: 0,
        id: '$_id',
        name: 1,
        lat: 1,
        lng: 1,
        province: { $arrayElemAt: ['$province.code', 0] },
        district: { $arrayElemAt: ['$district.code', 0] },
        commune: { $arrayElemAt: ['$commune.code', 0] },
        group: 1,
        // function: {
        //   enabled: '$functions.enabled',
        //   recordEnabled: '$functions.record.enabled',
        //   streamEnabled: '$functions.stream.enabled',
        //   alprEnabled: '$functions.alpr.enabled',
        //   surveillanceEnabled: '$functions.surveillance.enabled'
        // },
        //zones: 1,
        address: '$address',
        snapshotName: 1,
        status: 1,
        functionStatus: '$functions.enabled',
        inFollowList: 1,
      },
    }
    let [err, result] = await to(this.model.aggregate([match, ...lookup, addFields, project]))
    if (err) throw err

    result = result.map((item) => ({
      ...item,
      address: replacePoliticalType(item.address),
      thumnail: CameraUtils.getThumnailFile(item.snapshotName),
      snapshotName: undefined,
    }))

    return result
  }

  /**
   * Get one camera by camera id
   * @param {mongoose.Types.ObjectId} id Id of camera
   */
  getById = async (id) => {
    const match = {
      $match: { _id: mongoose.Types.ObjectId(id), deleted: { $ne: true } },
    }

    const lookup = [
      { $lookup: { from: 'provinces', localField: 'province', foreignField: 'code', as: 'province' } },
      { $lookup: { from: 'districts', localField: 'district', foreignField: 'code', as: 'district' } },
      { $lookup: { from: 'communes', localField: 'commune', foreignField: 'code', as: 'commune' } },
    ]

    const addFields = {
      $addFields: {
        address: {
          $concat: [{ $arrayElemAt: ['$commune.name', 0] }, ', ', { $arrayElemAt: ['$district.name', 0] }, ', ', { $arrayElemAt: ['$province.name', 0] }],
        },
      },
    }

    const project = {
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        name: 1,
        lat: 1,
        lng: 1,
        ip: 1,
        port: 1,
        user: 1,
        pass: 1,
        province: { $arrayElemAt: ['$province.code', 0] },
        district: { $arrayElemAt: ['$district.code', 0] },
        commune: { $arrayElemAt: ['$commune.code', 0] },
        group: 1,
        function: {
          enabled: '$functions.enabled',
          record: '$functions.record',
          stream: '$functions.stream',
          alpr: '$functions.alpr',
          surveillance: '$functions.surveillance',
        },
        zones: 1,
        dimension: 1,
        address: '$address',
        snapshotName: 1,
        rtspLink: 1,
        video: 1,
        status: 1,
        functionStatus: '$functions.enabled',
        inFollowList: 1,
      },
    }
    let [err, result] = await to(this.model.aggregate([match, ...lookup, addFields, project]))
    if (err) throw err

    if (_.isEmpty(result)) return {}
    return {
      ...result[0],
      address: replacePoliticalType(result[0].address),
      thumnail: CameraUtils.getThumnailFile(result[0].snapshotName),
    }
  }

  /**
   * Get streams
   * @param {("follow"|"unfollow")} filter
   * @param {("all"|mongoose.Types.ObjectId)} group
   */
  getStreams = async (filter, group) => {
    const match = {
      $match: {
        $and: [
          {
            'functions.stream.enabled': true,
            'functions.enabled': true,
          },
          {
            inFollowList: filter === 'follow' ? true : false,
          },
          group !== 'all' ? { $or: [{ group: mongoose.Types.ObjectId(group) }] } : {},
          {
            deleted: { $ne: true },
          },
        ],
      },
    }

    const project = {
      $project: {
        _id: 0,
        id: '$_id',
        name: 1,
        inFollowList: 1,
        snapshotName: 1,
      },
    }

    let [err, result] = await to(this.model.aggregate([match, project]))
    if (err) throw err

    result = result.map((item) => ({
      ...item,
      mainStream: CameraUtils.getStreamFile(item.id, 'main'),
      subStream: CameraUtils.getStreamFile(item.id, 'sub'),
      thumnail: CameraUtils.getThumnailFile(item.snapshotName),
      snapshotName: undefined,
    }))

    return result
  }

  /**
   * Get stream of camera by id
   * @param {mongoose.Types.ObjectId} id
   */
  getStreamById = async (id) => {
    const match = {
      $match: {
        _id: mongoose.Types.ObjectId(id),
        'functions.stream.enabled': true,
        deleted: { $ne: true },
      },
    }

    const project = {
      $project: {
        _id: 0,
        id: '$_id',
        name: 1,
        inFollowList: 1,
        snapshotName: 1,
      },
    }

    let [err, result] = await to(this.model.aggregate([match, project]))
    if (err) throw err

    if (_.isEmpty(result)) return {}
    return {
      ...result[0],
      mainStream: CameraUtils.getStreamFile(result[0].id, 'main'),
      subStream: CameraUtils.getStreamFile(result[0].id, 'sub'),
      thumnail: CameraUtils.getThumnailFile(result[0].snapshotName),
      snapshotName: undefined,
    }
  }

  /**
   * Get group of camera by id
   * @param {mongoose.Types.ObjectId} id Id of camera
   */
  getGroup = async (id) => {
    const match = {
      $match: { _id: mongoose.Types.ObjectId(id), deleted: { $ne: true } },
    }

    const lookup = {
      $lookup: { from: 'groups', localField: 'group', foreignField: '_id', as: 'group' },
    }

    const project = {
      $project: {
        _id: 0,
        group: 1,
      },
    }

    let [err, result] = await to(this.model.aggregate([match, lookup, project]))
    if (err) throw err

    return _.isEmpty(result) ? result : result?.[0]?.group
  }

  /**
   * Check if ip address exist
   * @param {string} ip
   */
  getByIp = async (ip) => {
    let [err, result] = await to(this.model.find({ ip: ip, deleted: { $ne: true } }))
    if (err) throw err

    return result
  }

  /**
   * Add new camera
   * @param {Object} camera New camera object to create
   * @param {mongoose.ClientSession} session Transaction session
   */
  add = async (cameraData, session) => {
    let [err, result] = await to(this.model.create([cameraData], { session }))
    if (err) throw err
    return result?.[0]
  }

  /**
   * Add camera to follow list
   * @param {mongoose.Types.ObjectId} id
   */
  addFollowList = async (id) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            inFollowList: true,
          },
        },
        {
          new: true,
        }
      )
    )

    if (err) throw err
    return result
  }

  /**
   * * Remove camera from follow list
   * @param {mongoose.Types.ObjectId} id
   */
  removeFollowList = async (id) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            inFollowList: false,
          },
        },
        {
          new: true,
        }
      )
    )

    if (err) throw err
    return result
  }

  /**
   * Update groups of camera
   * @param {mongoose.Types.ObjectId} id
   * @param {Array} groupList
   * @param {mongoose.ClientSession} session
   */
  updateGroup = async (id, groupList, session) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            group: groupList,
          },
        },
        {
          new: true,
          session,
        }
      )
    )

    if (err) throw err
    return result
  }

  /**
   * Sync config from camera to database
   * @param {mongoose.Types.ObjectId} id
   * @param {number} width
   * @param {number} height
   * @param {number} quality
   * @param {number} fps
   */
  syncVideoConfigs = async (id, width, height, quality, fps) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            'video.width': width,
            'video.height': height,
            'video.quality': quality,
            'video.fps': fps,
          },
        },
        {
          new: true,
        }
      )
    )

    if (err) throw err
    return result
  }

  /**
   * Update camera, video configs
   * @param {mongoose.Types.ObjectId} id
   * @typedef {typeof import('../validator').stepParamsData} stepParamsData
   * @param {stepParamsData} newConfig
   * @param {mongoose.ClientSession} session
   */
  updateVideoConfigs = async (id, newConfig, session) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            'video.width': newConfig.resolution.width,
            'video.height': newConfig.resolution.height,
            'video.resolutionRange': newConfig.resolutionRange,
            'video.quality': newConfig.quality,
            'video.qualityRange': newConfig.qualityRange,
            'video.fps': newConfig.fps,
            'video.fpsRange': newConfig.fpsRange,
          },
        },
        {
          new: true,
          session,
        }
      )
    )

    if (err) throw err
    return result
  }

  /**
   * Update camera, step connect
   * @param {mongoose.Types.ObjectId} id
   * @typedef {typeof import('../validator').stepConnectData} stepConnectData
   * @param {stepConnectData} data
   * @param {mongoose.ClientSession} session
   */
  updateStepConnect = async (id, data, session) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            name: data.name,
            ip: data.ip,
            port: data.port,
            user: data.user,
            pass: data.pass,
            lat: data.lat.toString(),
            lng: data.lng.toString(),
            province: data.province,
            district: data.district,
            commune: data.commune,
            group: data.group,
          },
        },
        {
          new: true,
          session,
        }
      )
    )

    if (err) throw err
    return result
  }

  /**
   * Update camera, step param
   * @param {mongoose.Types.ObjectId} id
   * @typedef {typeof import('../validator').stepParamsData} stepParamsData
   * @param {stepParamsData} data
   */
  updateStepParam = async (id, data) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            'video.width': data.resolution.width,
            'video.height': data.resolution.height,
            'video.quality': data.quality,
            'video.fps': data.fps,
          },
        },
        { new: true }
      )
    )

    if (err) throw err
    return result
  }

  /**
   * Update camera, step function
   * @param {mongoose.Types.ObjectId} id
   * @typedef {typeof import('../validator').stepFunctionsData} stepFunctionsData
   * @param {stepFunctionsData} data
   */
  updateStepFunctions = async (id, data) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            'functions.record.enabled': data.recordEnabled,
            'functions.record.duration': data.recordDuration,
            'functions.record.maxKeepDay': data.recordMaxKeepDay,
            'functions.stream.enabled': data.streamEnabled,
            'functions.alpr.enabled': data.alprEnabled,
            'functions.surveillance.enabled': data.surveillanceEnabled,
            zones: data.zones,
            dimension: data.dimension,
          },
        },
        { new: true }
      )
    )

    if (err) throw err
    return result
  }

  /**
   * Edit camera, function status
   * @param {mongoose.Types.ObjectId} id
   * @param {boolean} status
   */
  updateFunctionStatus = async (id, status) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            'functions.enabled': status,
          },
        },
        { new: true }
      )
    )

    if (err) throw err
    return result
  }

  /**
   *
   * @param {mongoose.Types.ObjectId} id
   * @param {mongoose.ClientSession} session
   */
  delete = async (id, session) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            deleted: true,
          },
        },
        { new: true, session }
      )
    )

    if (err) throw err
    return result
  }
}
