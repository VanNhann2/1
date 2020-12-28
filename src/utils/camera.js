import { config } from '../configs'
import jimp from 'jimp'
import ffmpeg from 'ffmpeg-cli'
import to from 'await-to-js'
import fs from 'fs'
import _ from 'lodash'
import { logger } from './logger'

export class CameraUtils {
  /** @type {string} */
  #ip = undefined

  /** @type {string} */
  #port = undefined

  /** @type {string} */
  #user = undefined

  /** @type {string} */
  #pass = undefined

  /** @type {string} */
  #authAddress

  /**
   * @constructor
   * @param {String} ip Ip of camera
   * @param {String} port Port of camera
   * @param {String} user Username of dcameravice
   * @param {String} pass Password of camera
   */
  constructor(ip, port, user, pass) {
    this.#ip = ip
    this.#port = port
    this.#user = user
    this.#pass = pass
    this.#authAddress = this.#user + ':' + this.#pass + '@' + this.#ip
  }

  /**
   * Get snapshot file path
   * @param {string} name name of file
   * @param {boolean} isTemp get thumnail of snapshot
   */
  static getSnapshotFile = (name, isTemp) => {
    return isTemp ? config.snapshotTempPrefix + '/' + name + config.imageFormat : config.snapshotPrefix + '/' + name + config.imageFormat
  }

  /**
   * Get thumnail file path
   * @param {string} name name of file
   */
  static getThumnailFile = (name) => {
    return config.snapshotPrefix + '/' + name + config.thumnailPrefix + config.imageFormat
  }

  /**
   * Get stream file path
   * @param {string} name
   * @param {("main"|"sub")} type
   */
  static getStreamFile = (name, type) => {
    let path = ''
    if (type === 'main') {
      path = config.streamPrefix + '/' + name + config.mainStreamPostfix + '/' + config.playlistName
    }

    if (type === 'sub') {
      path = config.streamPrefix + '/' + name + config.subStreamPostfix + '/' + config.playlistName
    }

    return path
  }

  /**
   * Get snapshot image of camera
   * @param {string} url rtsp link to get snapshot
   * @param {string} name name to saved
   * @param {boolean} createThumnail create thumnail image or not
   * @param {boolean} isTemp save as a temporary image
   */
  createSnapshot = async (url, name, createThumnail, isTemp) => {
    const root = isTemp ? config.tempFolder + '/' : config.publicFolder + '/'

    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true, mode: 640 })

    const path = root + name + config.imageFormat

    const command = '-rtsp_transport tcp -i ' + '"' + url.replace(this.#ip, this.#authAddress) + '"' + ' -vframes 1 -y ' + path
    let [errCreateSnapshot] = await to(ffmpeg.run(command))
    if (errCreateSnapshot) throw errCreateSnapshot

    if (!createThumnail) return

    const pathThumnail = root + name + config.thumnailPrefix + config.imageFormat

    let [errReadSnapshot, snapshot] = await to(jimp.read(path))
    if (errReadSnapshot) throw errReadSnapshot

    let [errCreateThumnail] = await to(snapshot.resize(jimp.AUTO, 80).writeAsync(pathThumnail))
    if (errCreateThumnail) throw errCreateThumnail

    return
  }
}
