import { isIPv4 } from 'net'
import _ from 'lodash'
import ping from 'ping'
import to from 'await-to-js'
import { model } from '../models'

export const steps = {
  CONNECT: 1,
  PARAM: 2,
  FUNCTION: 3,
}

export const actions = {
  ADD: 1,
  EDIT: 2,
}

export const group = {
  name: new String(),
  __isNew__: new Boolean(),
}

export const stepConnectData = {
  id: new String(),
  name: new String(),
  user: new String(),
  pass: new String(),
  group: [{ ...group }],
  ip: new String(),
  port: new String(),
  lat: new Number(),
  lng: new Number(),
  province: new String(),
  district: new String(),
  commune: new String(),
}

export const stepParamsData = {
  resolution: {
    width: new Number(),
    height: new Number(),
  },
  resolutionRange: [
    {
      width: new Number(),
      height: new Number(),
    },
  ],
  quality: new Number(),
  qualityRange: {
    Min: new Number(),
    Max: new Number(),
  },
  fps: new Number(),
  fpsRange: {
    Min: new Number(),
    Max: new Number(),
  },
}

const zone = {
  type: new Number(),
  name: new String(),
  vertices: [
    {
      x: new Number(),
      y: new Number(),
    },
  ],
  arrow: [
    {
      x: new Number(),
      y: new Number(),
    },
  ],
}

const dimension = {
  width: new Number(),
  height: new Number(),
}

export const stepFunctionsData = {
  ...stepConnectData,
  ...stepParamsData,
  encoder: new String(),
  rtspLink: new String(),
  snapshotLink: new String(),
  snapshotName: new String(),
  recordEnabled: new Boolean(),
  recordDuration: new Number(),
  recordMaxKeepDay: new Number(),
  streamEnabled: new Boolean(),
  surveillanceEnabled: new Boolean(),
  alprEnabled: new Boolean(),
  dimension: dimension,
  zones: [{ ...zone }],
}

/**
 * Get data of steps
 * @typedef {typeof import ('express').Request} Request
 * @param {Request} req
 * @param {Object<stepConnectData|stepParamsData|stepFunctionsData>} dataType
 */
export const getDataOfStep = (req, dataType) => {
  const data = new Object(dataType)
  const keys = Object.keys(dataType)
  keys.forEach((key) => {
    data[key] = req.body[key]
  })
  return data
}

/**
 * Validate data of step, for add/edit camera
 * @param {Object<stepConnectData|stepParamsData|stepFunctionsData>} data
 * @param {steps} step
 * @param {actions} action
 */
export const validateDataOfStep = async (data, step, action) => {
  switch (step) {
    case steps.CONNECT:
      return await validateStepConnect(data, action)
    case steps.PARAM:
      return await validateStepParams(data, action)
    case steps.FUNCTION:
      return await validateStepFunctions(data, action)
    default:
      throw new Error('Invalid data type')
  }
}

/**
 * Validate camera data on step connect
 * @param {stepConnectData} data
 * @param {actions} action
 */
const validateStepConnect = async (data, action) => {
  let errors = {}

  if (!_.isString(data.name) || _.isEmpty(data.name?.trim())) {
    errors.name = 'Nhập tên của camera'
  }

  if (!_.isString(data.user) || _.isEmpty(data.user?.trim())) {
    errors.user = 'Nhập tên đăng nhập của camera'
  }

  if (!_.isString(data.pass) || _.isEmpty(data.pass?.trim())) {
    errors.pass = 'Nhập mật khẩu của camera'
  }

  if (!_.isArray(data.group)) {
    errors.group = 'Đường/Nhóm phải là một mảng'
  } else if (_.isArray(data.group) && !_.isEmpty(data.group)) {
    for (const gr of data.group) {
      if (!_.isString(gr.name) || (!_.isEmpty(gr.__isNew__) && !_.isBoolean(gr.__isNew__))) {
        errors.group = 'Đường/Nhóm chứa dữ liệu không hợp lệ'
        break
      }
    }
  }

  if (!_.isString(data.ip) || _.isEmpty(data.ip?.trim())) {
    errors.ip = 'Nhập địa chỉ IP của camera'
  } else if (!isIPv4(data.ip.trim())) {
    errors.ip = 'Địa chỉ IP không hợp lệ'
  }

  //check if this ip exists in database
  if (action === actions.ADD) {
    let [err, camera] = await to(model.camera.getByIp(data.ip))
    if (err) {
      errors.ip = 'Lỗi kiểm tra địa chỉ IP'
    }

    if (!_.isEmpty(camera)) {
      errors.ip = 'Địa chỉ IP đã tồn tại'
    }
  }

  //check if this ip already in use on another machine
  if (action === actions.EDIT) {
    let [err, ipUsed] = await to(checkIpUsed(data.ip, data.id))
    if (err) {
      errors.ip = err.message
    }
    if (ipUsed) {
      errors.ip = 'Địa chỉ ip đã được sử dụng trên thiết bị khác'
    }
  }

  if (!_.isString(data.port) || _.isEmpty(data.port?.trim())) {
    errors.port = 'Nhập port để truy xuất camera'
  } else if (!_.isInteger(parseFloat(data.port))) {
    errors.port = 'Port không hợp lệ'
  }

  if (!_.has(data, 'lat')) {
    errors.lat = 'Nhập vĩ độ'
  } else if (!_.isNumber(data.lat) || data.lat < -90 || data.lat > 90) {
    errors.lat = 'Vĩ độ không hợp lệ'
  }

  if (!_.has(data, 'lng')) {
    errors.lng = 'Nhập kinh độ'
  } else if (!_.isNumber(data.lng) || data.lng < -180 || data.lng > 180) {
    errors.lng = 'Kinh độ không hợp lệ'
  }

  if (!_.isString(data.province)) {
    errors.province = 'Nhập Tỉnh/Thành phố'
  } else if (data.province.length !== 2) {
    errors.province = 'Mã Tỉnh/Thành phố không hợp lệ'
  }

  if (!_.isString(data.district)) {
    errors.district = 'Nhập Quận/Huyện'
  } else if (data.district.length !== 3) {
    errors.district = 'Mã Quận/Huyện không hợp lệ'
  }

  if (!_.isString(data.commune)) {
    errors.commune = 'Nhập Phường/Xã'
  } else if (data.commune.length !== 5) {
    errors.commune = 'Mã Phường/Xã không hợp lệ'
  }

  return errors
}

/**
 * Validate camera data on step params
 * @param {stepParamsData} data
 * @param {actions} action
 */
// eslint-disable-next-line no-unused-vars
const validateStepParams = async (data, action) => {
  let errors = {}

  if (!_.isPlainObject(data.resolution)) {
    errors.resolution = 'Nhập độ phân giải của camera'
  } else if (!_.isNumber(data.resolution.width) || !_.isNumber(data.resolution.height)) {
    errors.resolution = 'Độ phân giải không hợp lệ'
  }

  if (!_.has(data, 'quality')) {
    errors.quality = 'Nhập chất lượng hình ảnh của camera'
  } else if (!_.isNumber(data.quality)) {
    errors.quality = 'Chất lượng hình ảnh không hợp lệ'
  }

  if (!_.isPlainObject(data.fpsRange)) {
    errors.fpsRange = 'Nhập dải giới hạn tốc độ frame'
  } else if (!_.isNumber(data.fpsRange.Min) || !_.isNumber(data.fpsRange.Max)) {
    errors.fpsRange = 'Dải giới hạn tốc độ frame không hợp lệ'
  }

  if (!_.has(data, 'fps')) {
    errors.fps = 'Nhập tốc độ frame của camera'
  } else if (!_.isNumber(data.fps)) {
    errors.fps = 'Tốc độ frame của camera phải là một số nguyên'
  } else {
    if (data.fps > data.fpsRange.Max || data.fps < data.fpsRange.Min) {
      errors.fps = 'Tốc độ frame nằm ngoài giới hạn cho phép'
    }
  }

  return errors
}

/**
 * Validate camera data on step functions
 * @param {stepFunctionsData} data
 * @param {actions} action
 */
const validateStepFunctions = async (data, action) => {
  let errors = {}

  let validateConnect = undefined
  let validateParam = undefined

  if (action === actions.ADD) {
    validateConnect = await validateStepConnect(data, action)
    validateParam = await validateStepParams(data, action)
  }

  const validateRecord = validateFunctionRecord(data.recordEnabled, data.recordDuration, data.recordMaxKeepDay)
  const validateStream = validateFunctionStream(data.streamEnabled)
  const validateSurveillance = validateFunctionSurveillance(data.surveillanceEnabled)
  const validateAlpr = validateFunctionAlpr(data.alprEnabled)
  const validateZone = validateZones(data.zones, data.dimension)

  errors = {
    ...validateConnect,
    ...validateParam,
    ...validateRecord,
    ...validateStream,
    ...validateSurveillance,
    ...validateAlpr,
    ...validateZone,
  }

  return errors
}

/**
 * Validate data of function record
 * @param {boolean} isEnabled enable record function
 * @param {number} duration record file duration
 * @param {number} maxKeepDay max time to keep file
 */
const validateFunctionRecord = (isEnabled, duration, maxKeepDay) => {
  let errors = {}

  if (!_.isBoolean(isEnabled)) {
    errors.recordEnabled = 'Cho phép chức năng record hoạt động?'
  }

  if (!_.isInteger(duration) || duration < 0) {
    errors.recordDuration = 'Độ dài file video phải là một số nguyên dương'
  }

  if (!_.isInteger(maxKeepDay) || maxKeepDay < 0) {
    errors.recordMaxKeepDay = 'Khoảng thời gian lưu video tối đa phải là một số nguyên dương'
  }

  return errors
}

/**
 * Validate data of function stream
 * @param {boolean} isEnabled enable stream function
 */
const validateFunctionStream = (isEnabled) => {
  let errors = {}

  if (!_.isBoolean(isEnabled)) {
    errors.streamEnabled = 'Cho phép chức năng stream hoạt động?'
  }

  //TODO: validate other params

  return errors
}

/**
 * Validate data of function surveillance
 * @param {boolean} isEnabled enable surveillance function
 */
const validateFunctionSurveillance = (isEnabled) => {
  let errors = {}

  if (!_.isBoolean(isEnabled)) {
    errors.surveillanceEnabled = 'Cho phép chức năng giám sát hoạt động?'
  }

  //TODO: validate other params

  return errors
}

/**
 * Validate data of function alpr
 * @param {boolean} isEnabled enable alpr function
 */
const validateFunctionAlpr = (isEnabled) => {
  let errors = {}

  if (!_.isBoolean(isEnabled)) {
    errors.alprEnabled = 'Cho phép chức năng nhận dạng biển số hoạt động?'
  }

  //TODO: validate other params

  return errors
}

/**
 * Validate data of zones
 * @param {Array<zone>} zones
 * @param {dimension} dimension
 */
const validateZones = (zones, dimension) => {
  let errors = {}

  //using break label for early failuer return
  breakpoint: {
    if (!_.isArray(zones)) {
      errors.zones = 'Kiểu dữ liệu của zones phải là 1 mảng'
      break breakpoint
    }

    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i]

      if (!_.isNumber(zone?.type)) {
        errors.type = 'Sai thông tin trường type của zone ' + zone?.name
        break breakpoint
      }

      if (!_.isString(zone?.name)) {
        errors.name = 'Sai thông tin trường name của zone ' + zone?.name
        break breakpoint
      }

      if (!_.isArray(zone?.vertices) || zone?.vertices?.length < 3) {
        errors.vertices = 'Sai thông tin trường vertices của zone ' + zone?.name + ', cần 1 mảng tối thiểu 3 đỉnh'
        break breakpoint
      } else {
        for (let j = 0; j < zone.vertices.length; j++) {
          const vertice = zone.vertices[j]

          if (!_.has(vertice, 'x') || !_.has(vertice, 'y') || !_.isNumber(vertice.x) || !_.isNumber(vertice.y)) {
            errors.vertices = 'Sai giá trị đỉnh số ' + j + ' của trường vertices của zone ' + zone?.name
            break breakpoint
          }
        }
      }

      //     stoplights   ||    roadlane     ||    readplate    ||     waittime
      if (zone.type === 5 || zone.type === 6 || zone.type === 8 || zone.type === 13) {
        if (!_.isArray(zone?.arrow) || !zone?.arrow?.length) {
          errors.arrows = `Vùng nhận dạng ${zone.name} không có hướng`
          break breakpoint
        }
      }
    }

    if (!_.isNumber(dimension?.width) || !_.isNumber(dimension?.height)) {
      errors.dimension = 'Sai thông tin trường dimension'
      break breakpoint
    }
  }

  return errors
}

/**
 * Check if ip already in use
 * @param {string} ip ip address
 * @param {string} cameraId id of camera
 */
const checkIpUsed = async (ip, cameraId) => {
  let [errDevice, device] = await to(ping.promise.probe(ip))
  if (errDevice) throw new Error('Không thể kết nối đến địa chỉ ip')

  let [errCamera, camera] = await to(model.camera.getById(cameraId))
  if (errCamera) throw new Error('Không thể lấy thông tin ip từ database')

  //if ip not changed, it's ok
  if (camera?.ip === ip) return false

  return device.alive
}
