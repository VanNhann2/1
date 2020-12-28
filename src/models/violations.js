import to from 'await-to-js'
import { violationsSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'

export class ViolationsModal {
  /** @type {mongoose.Model<mongoose.Document, {}>} */
  #violationsModel

  constructor() {
    this.#violationsModel = new BaseModel('Violations', new BaseSchema(violationsSchema, schemaOptions)).get()
  }

  /** Get all province */
  getAllViolations = async () => {
    const project = {
      $project: {
        _id: 0,
        action: 1,
        object: 1,
        status: 1,
        plate: 1,
        camera: 1,
        time: 1,
        images: 1,
        object_images: 1,
        plate_images: 1,
        vio_time: 1
      }
    }

    let [err, result] = await to(this.#violationsModel.aggregate([project]))

    if (err) throw err

    return result
  }
}
