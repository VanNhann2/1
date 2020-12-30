import mongoose from 'mongoose'
import to from 'await-to-js'
import _ from 'lodash'
import { violationsSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'

export class ViolationsModal extends BaseModel {

  constructor() {
    super('Violations', new BaseSchema(violationsSchema, schemaOptions))
  }

  /** Get all province */
  getAll = async (IsAction, IsStatus, Isplate) => {
    console.log("IsAction: " + IsAction + "IsStatus:" + IsStatus + "Isplate:" + Isplate)
    const actionCondition = _.isEmpty(IsAction) ? {} : { $or: IsAction }
    const statusCondition = _.isEmpty(IsStatus) ? {} : { $or: IsStatus }
    const plateCondition = _.isEmpty(Isplate) ? {} : { $or: Isplate }
    const otherCondition = { deleted: { $ne: true } }
    const match = { $match: { $and: [actionCondition, statusCondition, plateCondition, otherCondition] } }
    const project = {
      $project: {
        _id: 0
      }
    }

    let [err, result] = await to(this.model.aggregate([match, project]))
    if (err) throw err

    return result
  }

  getById = async (id) => {
    const otherCondition = { deleted: { $ne: true } }

    const match = {
      // $match: { _id: mongoose.Types.ObjectId(id), deleted: { $ne: true } },
      // {age: { $ne: 12} =>>>>>>>>>>>>>>> WHERE age != 12 
      $match: { $and: [otherCondition] }
    }

    const addFields = {
      $addFields: {
        id: '$_id'
      },
    }

    const project = {
      $project: {
        _id: 0
      },
    }
    let [err, result] = await to(this.model.aggregate([match, addFields, project]))
    if (err) throw err

    if (_.isEmpty(result)) return {}
    return result
  }

  delete = async (id) => {
    console.log("vo day roi..!!!")
    console.log("this.model")
    console.log(id)
    console.log(this.model)
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            deleted: true,
          },
        },
        { new: true }
      )
    )

    if (err) throw err
    console.log("result =>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
    console.log(result)
    return result
  }
}