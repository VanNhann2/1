import to from 'await-to-js'
import { BaseSchema, BaseModel } from './base'
import { groupSchema, schemaOptions } from './define'

export class GroupModel extends BaseModel {
  constructor() {
    super('Group', new BaseSchema(groupSchema, schemaOptions))
  }

  createCollection = async () => {
    let [err, result] = await to(this.model.createCollection())
    if (err) throw err

    return result
  }

  /**
   * Get all group
   * @param {mongoose.ClientSession=} session Transaction session
   */
  getAll = async (session) => {
    const match = { $match: {} }

    const project = {
      $project: {
        _id: 0,
        id: '$_id',
        name: 1,
        cameras: 1,
      },
    }

    let [err, result] = await to(this.model.aggregate([match, project]).session(session))

    if (err) throw err

    return result
  }

  /**
   * Add new group
   * @param {Object} groupData
   * @param {mongoose.ClientSession} session Transaction session
   */
  add = async (groupData, session) => {
    let [err, result] = await to(this.model.create([groupData], { session }))
    if (err) throw err
    return result?.[0]
  }

  /**
   * Update camera list of group
   * @param {string} groupName Name of updated group
   * @param {Array<mongoose.Types.ObjectId>} cameras List of camera to update
   * @param {mongoose.ClientSession} session Transaction session
   */
  updateCameras = async (groupName, cameras, session) => {
    let [err, result] = await to(
      this.model.findOneAndUpdate(
        {
          name: groupName,
          cameras: { $ne: cameras }, //prevent add duplicate camera id to group
        },
        {
          $push: { cameras: cameras },
        },
        {
          upsert: true,
          session,
        }
      )
    )

    if (err) throw err
    return result
  }

  /**
   * Remove camera from group
   * @param {mongoose.Types.ObjectId} id
   * @param {string|mongoose.Types.ObjectId} cameraId
   * @param {mongoose.ClientSession} session
   */
  removeCamera = async (id, cameraId, session) => {
    let [err, result] = await to(
      this.model.updateOne(
        {
          _id: id,
        },
        {
          $pull: {
            cameras: cameraId,
          },
        },
        {
          multi: true,
          session,
        }
      )
    )

    if (err) throw err
    return result
  }
}
