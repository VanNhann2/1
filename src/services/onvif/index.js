import _ from 'lodash'
import * as StatusCodes from 'http-status-codes'
import url from 'url'
import to from 'await-to-js'
import OnvifDevice from './3rdlib/modules/device'
import OnvifMedia from './3rdlib/modules/service-media'
import { logger, ServiceError } from '../../utils'

export class OnvifHelper {
  /** @type {string} */
  #ip = undefined

  /** @type {string} */
  #port = undefined

  /** @type {string} */
  #user = undefined

  /** @type {string} */
  #pass = undefined

  /**
   * @constructor
   * @param {String} ip Ip of device
   * @param {String} port Port of device
   * @param {String} user Username of device
   * @param {String} pass Password of device
   */
  constructor(ip, port, user, pass) {
    this.#ip = ip
    this.#port = port
    this.#user = user
    this.#pass = pass
    this.device = new OnvifDevice({ xaddr: 'http://' + this.#ip + ':' + this.#port + '/onvif/device_service', user: this.#user, pass: this.#pass })
    this.media = new OnvifMedia({ xaddr: 'http://' + this.#ip + ':' + this.#port + '/onvif/media_service', user: this.#user, pass: this.#pass })
  }

  /**
   * get configs of camera
   */
  getConfigs = async () => {
    try {
      let [errConnect, information] = await to(this.device.init())
      if (errConnect) throw errConnect

      const profile = this.getVideoProfile()
      const params = {
        ProfileToken: profile.token,
        ConfigurationToken: profile.video.encoder.token,
        Protocol: 'RTSP',
      }

      let [errVideo, video] = await to(this.media.getVideoEncoderConfigurationOptions(params))
      if (errVideo) throw errVideo

      video = video?.data?.GetVideoEncoderConfigurationOptionsResponse?.Options

      const uri = profile.stream.rtsp
      const { protocol, hostname, path } = url.parse(uri)
      const rtsp = protocol + '//' + hostname + path

      return { information, profile, video, rtsp }
    } catch (error) {
      logger.error('OnvifHelper.getConfigs() error:', error)
      throw new ServiceError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Failed to get camera config', detail: error })
    }
  }

  /**
   * Set video confis
   * @param {number} width
   * @param {number} height
   * @param {number} quality
   * @param {number} fps
   */
  setVideoConfig = async (width, height, quality, fps) => {
    try {
      let [errConnect] = await to(this.device.init())
      if (errConnect) throw errConnect

      const profile = this.getVideoProfile()

      let [errGetConfig, configs] = await to(this.media.getVideoEncoderConfiguration({ ConfigurationToken: profile.video.encoder.token }))
      if (errGetConfig) throw errGetConfig

      const currentVideoConfig = configs?.data?.GetVideoEncoderConfigurationResponse?.Configuration

      if (_.isEmpty(currentVideoConfig)) throw new Error('camera video config not found')

      const newConfigs = {
        ...currentVideoConfig,
        Resolution: {
          Width: width.toString(),
          Height: height.toString(),
        },
        Quality: quality.toString(),
        RateControl: {
          FrameRateLimit: fps.toString(),
          EncodingInterval: currentVideoConfig.RateControl.EncodingInterval,
          BitrateLimit: currentVideoConfig.RateControl.BitrateLimit,
        },
      }

      let [errSetConfig] = await to(this.media.setVideoEncoderConfiguration(newConfigs))
      if (errSetConfig) throw errSetConfig

      return 'Set video config success'
    } catch (error) {
      throw new ServiceError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Failed to set video config', detail: error })
    }
  }

  /**
   * Set ip address
   * @param {string} ip
   */
  setIp = async (ip) => {
    try {
      let [errConnect] = await to(this.device.init())
      if (errConnect) throw errConnect

      let [errGetInterface, networkInterface] = await to(this.device.services.device.getNetworkInterfaces())
      if (errGetInterface) throw errGetInterface

      const interfaceConfigs = networkInterface?.data?.GetNetworkInterfacesResponse
      if (_.isEmpty(interfaceConfigs)) throw new Error('invalid network interface config')

      const params = {
        InterfaceToken: interfaceConfigs.NetworkInterfaces['$'].token,
        NetworkInterface: {
          Enabled: interfaceConfigs.NetworkInterfaces.Enabled === 'true' ? true : false,
          IPv4: {
            Enabled: true,
            Manual: {
              Address: ip,
              PrefixLength: interfaceConfigs.NetworkInterfaces.IPv4.Config.Manual.PrefixLength,
            },
            DHCP: false,
          },
        },
      }

      let [errSetIp, setIpResponse] = await to(this.device.services.device.setNetworkInterfaces(params))
      if (errSetIp) throw errSetIp

      // reboot device, if required
      const rebootNeeded = setIpResponse?.data?.SetNetworkInterfacesResponse?.RebootNeeded === 'true' ? true : false
      logger.debug('rebootNeeded', rebootNeeded)
      if (rebootNeeded === true) {
        let [err] = await to(this.device.services.device.reboot())
        if (err) throw err
      }

      return 'Set ip success'
    } catch (error) {
      throw new ServiceError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Failed to set ip', detail: error })
    }
  }

  /**
   * Get video profile of camera
   */
  getVideoProfile = () => {
    const profiles = this.device.getProfileList()
    for (let i = 0; i < profiles.length; i++) {
      if (profiles[i].video.encoder.encoding !== 'JPEG') return profiles[i]
    }
  }
}
