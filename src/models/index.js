import { CameraModel } from './camera'
import { GroupModel } from './group'
import { PoliticalModel } from './political'
import { ConfigModel } from './config'
import { TaskModel } from './task'
import { ViolationsModal } from './violations'
class Model {
  /** @type {CameraModel} */
  camera = undefined

  /** @type {GroupModel} */
  group = undefined

  /** @type {PoliticalModel} */
  political = undefined

  /** @type {ConfigModel} */
  config = undefined

  /** @type {TaskModel} */
  task = undefined

  /** @type {ViolationsModal} */
  violations = undefined

  constructor() {
    // this.camera = new CameraModel()
    // this.group = new GroupModel()
    // this.political = new PoliticalModel()
    // this.config = new ConfigModel()
    // this.task = new TaskModel()
    this.violations = new ViolationsModal()
  }

  /**
   * in transaction mode, mongoose can not create collection,
   * so they need to be created first
   */
  createRequiredCollections = async () => {
    // await this.camera.createCollection()
    // await this.group.createCollection()
    // await this.violations.createCollection()
  }
}

const model = new Model()

export { model }
