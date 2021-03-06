import * as Cesium from 'cesium'
import MeshMaterial from './MeshMaterial'
import { phong_frag } from './Shaders/phong_frag'
import { phong_vert } from './Shaders/phong_vert'

/**
 *
 * @constructor
 * @memberof MeteoLib.Render
 * @extends MeteoLib.Render.MeshMaterial
 */
function MeshPhongMaterial(options) {
  options = options ? options : {}

  options.uniforms = options.uniforms
    ? options.uniforms
    : {
        shininess: -1,
        emission: [0, 0, 0],
        specular: 0,
      }
  options.uniforms.shininess = Cesium.defaultValue(
    options.uniforms.shininess,
    0
  )
  options.uniforms.emission = Cesium.defaultValue(
    options.uniforms.emission,
    [0.2, 0.2, 0.2]
  )
  options.uniforms.specular = Cesium.defaultValue(options.uniforms.specular, 0)

  MeshMaterial.apply(this, arguments)
  this.vertexShader = phong_vert
  this.fragmentShader = phong_frag
}
MeshPhongMaterial.prototype = new MeshMaterial()
export default MeshPhongMaterial
