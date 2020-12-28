import mongoose from 'mongoose'
import _ from 'lodash'
import to from 'await-to-js'
import { taskSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'

export class TaskModel extends BaseModel {
  constructor() {
    super('Task', new BaseSchema(taskSchema, schemaOptions))
  }

  /**
   * Add tasks
   * @param {Array} taskList
   */
  add = async (taskList) => {
    let [err, result] = await to(this.model.create(taskList))
    if (err) throw err
    return result
  }
}
