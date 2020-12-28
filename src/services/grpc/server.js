import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import _ from 'lodash'
import to from 'await-to-js'
import { config } from '../../configs'
import { logger, ServiceError } from '../../utils'
import { app } from '../../app'
import * as validator from '../../validator'
import { resolve } from 'path'

export class GRpcServer {
  /** @type grpc.GrpcObject */
  #proto = null

  /** @type grpc.Server */
  #server = null

  constructor() {
    this.#proto = this.#loadProto(config.protoFile)
    this.#server = new grpc.Server()
  }

  start = async () => {
    return new Promise((resolve, reject) => {
      this.#addServices()
      this.#server.bindAsync(config.grpcAddress, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
          logger.error('failed to start gRPC server', error)
          reject(error)
        }
        this.#server.start()
        logger.info('gRPC server is running at port:', port)
        resolve()
      })
    })
  }

  stop = async () => {
    if (this.#server) {
      this.#server.tryShutdown((error) => {
        if (error) throw error
      })

      logger.info('gRPC server stopped')
    }
  }

  #addServices = () => {
    this.#server.addService(_.get(this.#proto, config.grpcServiceName).service, { get: this.#getCamera })
  }

  #getCamera = async (call, callback) => {
    try {
      const requestIds = call.request.ids
      const cameraIds = Object.values(requestIds)

      const promises = []
      cameraIds.forEach((id) => {
        if (!validator.isMongoId(id)) {
          throw new ServiceError({ code: grpc.status.INVALID_ARGUMENT, message: 'Id camera không hợp lệ' })
        }
        promises.push(app.camera.getById(id))
      })

      let [err, datas] = await to(Promise.all(promises))
      if (err) {
        logger.error('GRpcServer.getCamera() error:', err)
        throw new ServiceError({ code: grpc.status.INTERNAL, message: 'Lỗi lấy dữ liệu camera' })
      }

      let result = {}
      cameraIds.forEach((id) => {
        result[id] = {}

        const cameraData = datas.filter((item) => item.id === id)[0]
        if (!_.isEmpty(cameraData)) {
          result[id] = {
            id: cameraData.id,
            name: cameraData.name,
            address: cameraData.address,
            lat: cameraData.lat,
            lng: cameraData.lng,
          }
        }
      })

      callback(null, { cameras: result })
    } catch (error) {
      callback(
        {
          code: error?.code ? error.code : grpc.status.UNKNOWN,
          message: _.isString(error?.message) ? error.message : 'unknown error',
        },
        null
      )
    }
  }

  /**
   * Load protocol buffer
   * @param {string} path
   */
  #loadProto = (path) => {
    const pkgDefine = protoLoader.loadSync(path, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true })
    const proto = grpc.loadPackageDefinition(pkgDefine)

    return proto
  }
}
