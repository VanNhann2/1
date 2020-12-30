import { Camera } from './camera'
import { Political } from './political'
import { Stream } from './stream'
import { Violation } from './violations'
class App {
  /** @type {Camera} */
  camera = undefined

  /** @type {Political} */
  political = undefined

  /** @type {Stream} */
  stream = undefined

  /** @type {Violation} */
  violation = undefined

  constructor() {
    // this.camera = new Camera()
    // this.political = new Political()
    // this.stream = new Stream()
    this.violation = new Violation()
  }
}

const app = new App()

export { app }
