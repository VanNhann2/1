import to from 'await-to-js'
import { configSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'

export class ConfigModel extends BaseModel {
  constructor() {
    super('Configs', new BaseSchema(configSchema, schemaOptions))
  }

  /**
   * Get zone configs
   */
  getZones = async () => {
    const match = { $match: {} }

    const limit = { $limit: 1 }

    const project = {
      $project: {
        _id: 0,
        zones: 1,
      },
    }

    let [err, result] = await to(this.model.aggregate([match, limit, project]))

    if (err) throw err

    return result[0]?.zones
  }
}
