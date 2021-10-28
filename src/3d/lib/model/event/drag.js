import * as THREE from 'three';
import mapboxgl from 'mapbox-gl';
import { TwoPointDistance } from '@/3d/lib/mathMapbox';
import { 
  computeIntersectionSegmentCirclePolar
} from '@/3d/lib/mathMapbox';

import { 
  imageShow,
  calcSpaceInterData
} from '@/3d/lib/interpolation';

import { throttle } from 'lodash';

export class DragObjects {
    constructor(objects, callback, layer, map, halfWidth, halfHeight, centerLngLat, radarNf) {
        this.layer = layer;
        this.map = map;
        this.canvas = map.getCanvasContainer();
        this.objects = objects;
        this.callback = callback.bind(this);
        this.raycaster = new THREE.Raycaster();
        this.targetObject = null;

        this.halfHeight = halfHeight;
        this.halfWidth = halfWidth;
        this.centerLngLat = centerLngLat;
        // 提扫源数据
        this.radarNf = radarNf;

        this.coordXQueue = [];
        this.coordYQueue = [];
        this.addListenerEvent();
    }

    findObject (event) {
        let camera = this.layer.camera;
        let scene = this.layer.scene;
        const mouse = new THREE.Vector2();
        mouse.x = ( event.clientX  / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY   / window.innerHeight ) * 2 + 1;

        //解决射线拾取的问题
        const camInverseProjection = new THREE.Matrix4().copy(camera.projectionMatrix).invert();
        const cameraPosition = new THREE.Vector3().applyMatrix4(camInverseProjection)
        const mousePosition = new THREE.Vector3(mouse.x, mouse.y, 1).applyMatrix4(camInverseProjection)
        const viewDirection = mousePosition
            .clone()
            .sub(cameraPosition)
            .normalize()
        this.raycaster.set(cameraPosition, viewDirection)

        const intersections = this.raycaster.intersectObjects( scene.children, true );
        console.log('intersections ==>', intersections)
        if ( intersections.length > 0 ) {
          let objects = intersections.map(inter => inter.object);
          
          let i = 0;
          let find = false; 
          for (; i < objects.length; i++) {
            if (this.objects.includes(objects[i])){
              find = true;
              break;
            }
          }
          
          if (find) {
              this.targetObject = objects[i];
          } else {
              this.targetObject = null;
          }
        } else {
            this.targetObject = null;
        }
    }

    mouseMove() {
      this.map.on('mousemove', (event) => {
        if (this.targetObject) {
           if (this.targetObject.name === 'moveNs') {
              this.insertCoordYQueue([event.lngLat.lng, event.lngLat.lat]);
              dragMoveNsCallback.bind(this)();
           } else if (this.targetObject.name === 'moveWe') {
              this.insertCoordXQueue([event.lngLat.lng, event.lngLat.lat]);
              dragMoveWECallback.bind(this)();
           }
        }
      })
    }

    addListenerEvent() {
        this.map.on('mousedown', (event) => {
          // console.log('mousedown');
           this.findObject(event.originalEvent);
           console.log('mousedown', this.targetObject);
           if (this.targetObject) {
            this.mouseMove();
            this.lockMapBoxViewScene();
           }
        })

        this.map.on('mouseup', (event) => {
          console.log('mouseup');
          if (this.targetObject) {
            this.unlockMapBoxViewScene();
           }
          this.targetObject = null;
          this.map.off('mousemove', this.mouseMove);
        })
    }

    insertCoordYQueue (coord) {
      if (this.coordYQueue.length < 2) {
        this.coordYQueue.push(coord);
      } else if (this.coordYQueue.length === 2) {
        this.coordYQueue.shift();
        this.coordYQueue.push(coord);
      }
    }

    insertCoordXQueue (coord) {
      if (this.coordXQueue.length < 2) {
        this.coordXQueue.push(coord);
      } else if (this.coordXQueue.length === 2) {
        this.coordXQueue.shift();
        this.coordXQueue.push(coord);
      }
    }

    // test
    vectorYDistance () {
      if (this.coordYQueue.length === 2) {
        let dir = (this.coordYQueue[0][1] - this.coordYQueue[1][1]) > 0 ? 1 : -1;
        let avg_lng = (this.coordYQueue[0][0] + this.coordYQueue[0][1]) / 2;
        return dir * TwoPointDistance([avg_lng, this.coordYQueue[0][1]], [avg_lng, this.coordYQueue[1][1]]);
      } else {
        return 0;
      }
    }
  // test
    vectorXDistance () {
      if (this.coordXQueue.length === 2) {
        let dir = (this.coordXQueue[1][0] - this.coordXQueue[0][0]) > 0 ? 1 : -1;
        let avg_lng = (this.coordXQueue[0][1] + this.coordXQueue[1][1]) / 2;
        return dir * TwoPointDistance([this.coordXQueue[0][0], avg_lng], [this.coordXQueue[1][0], avg_lng]);
      } else {
        return 0;
      }
    }

    lockMapBoxViewScene () {
        this.map.dragRotate.disable();
        this.map.dragPan.disable();
        this.map.scrollZoom.disable();
        this.canvas.style.cursor = 'move';
    }

    unlockMapBoxViewScene () {
        this.map.dragRotate.enable();
        this.map.dragPan.enable();
        this.map.scrollZoom.enable();
        this.canvas.style.cursor = 'default';
    }
}

function relativeCoordsToLngLat (centerLngLat, relativeX, relativeY) {
  let webMercatorCoord = mapboxgl.MercatorCoordinate.fromLngLat(centerLngLat, 0);
  let unit = webMercatorCoord.meterInMercatorCoordinateUnits();
  let mc = new mapboxgl.MercatorCoordinate(webMercatorCoord.x + relativeX * unit, webMercatorCoord.y + relativeY * unit, 0);
  let lnglat = mc.toLngLat();
  return [lnglat.lng, lnglat.lat];
}

/**
 * 
 * @param {*} center  中心坐标
 * @param {*} R  半径
 * @param {*} coordA  A 坐标
 * @param {*} coordB  B 坐标
 * @param {*} data  提扫数据
 */
function computeSection (center, R, coordA, coordB, data, object) {
  // origin data
  let GateSizeOfReflectivity = data.Header.GateSizeOfReflectivity; // 库距离
  let GateSize = data.Header.Gates[data.Header.BandNo];
  let Position = data.Header.Position;
  let Elevations = data.Header.Elevations;
  // calc data
  // let R = GateSizeOfReflectivity * GateSize;
  // let center = [Position[0], Position[1]];
  
  let density = 1/2;
  let polar = computeIntersectionSegmentCirclePolar( center, R, coordA, coordB, GateSizeOfReflectivity, density, Elevations, data);
  if (polar && polar.length > 0) {
      const canvas = drawSpaceImage(polar, Elevations);
      let texture = new THREE.CanvasTexture( canvas );
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      object.material.map = texture;
      object.material.needsUpdate = true;
  }
}
const _computeSection = throttle(computeSection, 100);

/**
     * 空间距离定位，增加高度
     * @param {*} layers 
     */
function drawSpaceImage (layers, evelations) {
    let results = calcSpaceInterData(layers, evelations, true);
    let canvas = document.querySelector('.myCanvas');
    const mapColorsFunc = (val) => { return MeteoInstance.colorArray[val | 0]}
    canvas = imageShow(results.reverse(), canvas, 1, mapColorsFunc);
    let canvasWidth = canvas.clientWidth;
    let canvasHeight = canvas.clientHeight;
    canvas.setAttribute('class', 'myCanvas');
    canvas.setAttribute('style', `width: ${canvasWidth}; height: ${canvasHeight}; margin-left: calc(50% - ${canvasWidth / 2}px)`);
    return canvas;
}

export function dragMoveNsCallback () {
    let distance = this.vectorYDistance();
    let y = this.targetObject.position.y;
    let radius = this.halfHeight;

    if (y >= -radius && y <= radius) {
      this.targetObject.position.y += distance;
      // this.targetObject.position.y += distance > 0 ? radius / 30 : - radius / 30;
    }

    y = this.targetObject.position.y;
    if (y < -radius) {
      this.targetObject.position.y = -radius + 5;
    } else if (y > radius) {
      this.targetObject.position.y = radius - 5;
    }
    // left right lnglat
    let leftPoint = relativeCoordsToLngLat(this.centerLngLat, this.halfHeight, this.targetObject.position.y);
    let rightPoint = relativeCoordsToLngLat(this.centerLngLat, -this.halfHeight, this.targetObject.position.y);

    _computeSection(this.centerLngLat, radius, leftPoint, rightPoint, this.radarNf, this.targetObject)

}

export function dragMoveWECallback () {
    let distance = this.vectorXDistance();
    let x = this.targetObject.position.x;
    let radius = this.halfWidth;

    if (x >= -radius && x <= radius) {
      this.targetObject.position.x -= distance;
    }

    x = this.targetObject.position.x;
    if (x < -radius) {
      this.targetObject.position.x = -radius + 5;
    } else if (x > radius) {
      this.targetObject.position.x = radius - 5;
    }

    let upPoint = relativeCoordsToLngLat(this.centerLngLat, -this.targetObject.position.x, -radius);
    let downPoint = relativeCoordsToLngLat(this.centerLngLat, -this.targetObject.position.x, radius);

    _computeSection(this.centerLngLat, radius, upPoint, downPoint, this.radarNf, this.targetObject)

}