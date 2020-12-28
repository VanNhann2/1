import { Camera } from './camera'
import { Political } from './political'
import { Stream } from './stream'
import { Violations } from './violations'
class App {
  /** @type {Camera} */
  camera = undefined

  /** @type {Political} */
  political = undefined

  /** @type {Stream} */
  stream = undefined

  /** @type {Violations} */
  violations = undefined

  constructor() {
    this.camera = new Camera()
    this.political = new Political()
    this.stream = new Stream()
    this.violations = new Violations()
  }
}

const app = new App()

export { app }
