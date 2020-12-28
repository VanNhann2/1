import mongoose from 'mongoose'

export const schemaOptions = {
  versionKey: false,
}

export const configSchema = {
  video: {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    rate: { type: Number, required: true },
  },
  light: {
    shorttime: { type: Number, required: true },
    longtime: { type: Number, required: true },
    unknown_delay: { type: Number, required: true },
    vague_range: { type: Number, required: true },
  },
  output: {
    root_dir: { type: String, required: true },
    data_dir: { type: String, required: true },
    view_adj: { type: Number, required: true },
  },
  detection: {
    vehicle_day: { type: String, required: true },
    vehicle_night: { type: String, required: true },
    plate_day: { type: String, required: true },
    plate_night: { type: String, required: true },
    ocr_day: { type: String, required: true },
    ocr_night: { type: String, required: true },
    tracking: { type: String, required: true },
  },
  collname: {
    camera: { type: String, required: true },
    object: { type: String, required: true },
    flow: { type: String, required: true },
    blacklist: { type: String, required: true },
    notify: { type: String, required: true },
    group: { type: String, required: true },
    waitline: { type: String, required: true },
    waittime: { type: String, required: true },
  },
  zone: [
    {
      name: { type: String, required: true },
      type: { type: Number, required: true },
      title: { type: String, required: true },
      color: { type: String, required: true },
      shape: { type: String, enum: ['rectangle', 'polygon'], required: true },
      direct: { type: String, enum: ['yes', 'no'], required: true },
      vertices: [{ x: { type: Number, required: true }, y: { type: Number, required: true } }],
      arrow: [{ x: { type: Number }, y: { type: Number } }],
      app: { type: String, enum: ['all', 'ts', 'tlc'], required: true },
      _id: false,
    },
  ],
}

export const groupSchema = {
  name: { type: String, required: true },
  cameras: [{ type: mongoose.SchemaTypes.ObjectId, ref: 'Camera' }],
}

export const cameraSchema = {
  name: { type: String, required: true },
  ip: { type: String, required: true },
  port: { type: String, default: '80' },
  user: { type: String, required: true },
  pass: { type: String, required: true },
  province: { type: String },
  district: { type: String },
  commune: { type: String },
  group: [{ type: mongoose.SchemaTypes.ObjectId, ref: 'Group' }],
  lat: { type: Number },
  lng: { type: Number },
  address: { type: String, default: '' },
  rtspLink: { type: String, required: true },
  snapshotLink: { type: String },
  snapshotName: { type: String, default: '' },
  //isStreaming: { type: Boolean, required: true, default: false },
  functions: {
    enabled: { type: Boolean, required: true, default: true },
    record: {
      enabled: { type: Boolean, required: true },
      duration: { type: Number }, //minute
      maxKeepDay: { type: Number }, //date
      container: { type: String, enum: ['mp4', 'webm'], default: 'mp4' },
      // others params
    },
    stream: {
      enabled: { type: Boolean, required: true },
      // others params
    },
    alpr: {
      enabled: { type: Boolean, required: true },
      // others params
    },
    surveillance: {
      enabled: { type: Boolean, required: true },
      // others params
    },
  },
  video: {
    width: { type: Number, default: 1280 },
    height: { type: Number, default: 720 },
    resolutionRange: [
      {
        width: { type: Number },
        height: { type: Number },
        _id: false,
      },
    ],
    fps: { type: Number, require: true },
    fpsRange: { Min: String, Max: String },
    quality: { type: Number },
    qualityRange: { Min: String, Max: String },
    encoder: { type: String, required: true },
  },
  zones: [
    {
      name: { type: String },
      type: { type: Number },
      vertices: [{ x: { type: Number }, y: { type: Number }, _id: false }],
      arrow: [{ x: { type: Number }, y: { type: Number }, _id: false }],
      _id: false,
    },
  ],
  dimension: {
    width: { type: Number },
    height: { type: Number },
  },
  inFollowList: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now() },
  updatedAt: { type: Date, default: Date.now() },
  status: { type: Number, enum: [0, 1] },
  deleted: { type: Boolean },
}

export const provinceSchema = {
  name: { type: String, required: true },
  type: { type: String, required: true },
  code: { type: String, required: true },
}

export const districtSchema = {
  name: { type: String, required: true },
  type: { type: String, required: true },
  code: { type: String, required: true },
  province: { type: String, required: true },
}

export const communeSchema = {
  name: { type: String, required: true },
  type: { type: String, required: true },
  code: { type: String, required: true },
  district: { type: String, required: true },
}

export const taskSchema = {
  cameraId: { type: mongoose.SchemaTypes.ObjectId, required: true },
  action: { type: Number, required: true },
  rtspLink: { type: String, default: '' },
}

export const violationsSchema = {
  actions: { type: Number, required: true },
  object: { type: Number, required: true },
  status: { type: Number, enum: [0, 1, 2], required: true },
  plate: { type: String, required: true },
  camera: { type: mongoose.SchemaTypes.ObjectId, required: true },
  time: { type: Number },
  images: [{ type: String }],
  object_images: [{ type: String }],
  plate_images: [{ type: String }],
  vio_time: { type: Date, required: true }
}