import to from 'await-to-js'
import { provinceSchema, districtSchema, communeSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'

export class PoliticalModel {
  /** @type {mongoose.Model<mongoose.Document, {}>} */
  #provinceModel

  /** @type {mongoose.Model<mongoose.Document, {}>} */
  #districtModel

  /** @type {mongoose.Model<mongoose.Document, {}>} */
  #communeModel

  constructor() {
    this.#provinceModel = new BaseModel('Province', new BaseSchema(provinceSchema, schemaOptions)).get()
    this.#districtModel = new BaseModel('District', new BaseSchema(districtSchema, schemaOptions)).get()
    this.#communeModel = new BaseModel('Commune', new BaseSchema(communeSchema, schemaOptions)).get()
  }

  /** Get all province */
  getAllProvinces = async () => {
    const project = { $project: { _id: 0, name: 1, code: 1 } }

    let [err, result] = await to(this.#provinceModel.aggregate([project]))

    if (err) throw err

    return result
  }

  /**
   * Get all district belong to province ids
   * @param {string[]} provinceIds List of province id
   */
  getDistrictsByProvinceIds = async (provinceIds) => {
    const match = { $match: { $or: provinceIds.map((id) => ({ province: id })) } }

    const lookup = {
      $lookup: {
        from: 'provinces',
        localField: 'province',
        foreignField: 'code',
        as: 'province'
      }
    }

    const project = {
      $project: {
        _id: 0,
        name: '$name',
        code: '$code',
        province: { $arrayElemAt: ['$province.name', 0] }
      }
    }

    let [err, result] = await to(this.#districtModel.aggregate([match, lookup, project]))
    if (err) throw err
    return result
  }

  /**
   * Get all commune belong to district ids
   * @param {string[]} districtIds List of district id
   */
  getCommunesByDistrictIds = async (districtIds) => {
    const match = { $match: { $or: districtIds.map((id) => ({ district: id })) } }

    const lookup = {
      $lookup: { from: 'districts', localField: 'district', foreignField: 'code', as: 'district' }
    }

    const project = {
      $project: {
        _id: 0,
        name: '$name',
        code: '$code',
        district: { $arrayElemAt: ['$district.name', 0] }
      }
    }

    let [err, result] = await to(this.#communeModel.aggregate([match, lookup, project]))
    if (err) throw err
    return result
  }

  /**
   * Get political for mobile apps
   * @param {string} province province id
   */
  getPoliticalForMobile = async (province) => {
    const match = { $match: { province } }

    const lookup = {
      $lookup: {
        from: 'communes',
        localField: 'code',
        foreignField: 'district',
        as: 'communes'
      }
    }

    const project = {
      $project: {
        _id: 0,
        name: '$name',
        code: '$code',
        communes: {
          $map: {
            input: '$communes',
            as: 'communes',
            in: {
              name: '$$communes.name',
              code: '$$communes.code'
            }
          }
        }
      }
    }

    let [err, result] = await to(this.#districtModel.aggregate([match, lookup, project]))
    if (err) throw err
    return result
  }
}
