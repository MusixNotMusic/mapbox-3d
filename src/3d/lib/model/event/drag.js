import * as THREE from 'three';
import mapboxgl from 'mapbox-gl';
import { vectorDegree } from '@/3d/lib/math';
import { TwoPointDistance } from '@/3d/lib/mathMapbox';

export class DragObjects {
    constructor(objects, callback, layer, map, halfWidth, halfHeight) {
        this.layer = layer;
        this.map = map;
        this.canvas = map.getCanvasContainer();
        this.objects = objects;
        this.callback = callback;
        this.raycaster = new THREE.Raycaster();
        this.targetObject = null;

        this.coordQueue = [];
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
          this.insertCoordQueue([event.lngLat.lng, event.lngLat.lat]);
          this.targetObject.position.y += this.vectorDistance();
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

    insertCoordQueue (coord) {
      if (this.coordQueue.length < 2) {
        this.coordQueue.push(coord);
      } else if (this.coordQueue.length === 2) {
        this.coordQueue.shift();
        this.coordQueue.push(coord);
      }
    }

    // test
    vectorDistance () {
      if (this.coordQueue.length === 2) {
        let dir = (this.coordQueue[0][1] - this.coordQueue[1][1]) > 0 ? 1 : -1;
        let avg_lng = (this.coordQueue[0][0] + this.coordQueue[0][1]) / 2;
        return dir * TwoPointDistance([avg_lng, this.coordQueue[0][1]], [avg_lng, this.coordQueue[1][1]]);
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

let scale = 500;

export function dragMoveCallback (cartesianStart, cartesianEnd, context) {
    cartesianStart.x = 0;
    cartesianEnd.x = 0;
    const radius = (700 * scale) / 2;
    context.getSpaceDistance(cartesianStart, cartesianEnd).then((dis) => {
        dis = context.cartesianEnd.y > context.cartesianStart.y ? dis : -dis;
  
        if (context.targetObject.position.y >= -radius && context.targetObject.position.y <= radius) {
          context.targetObject.position.y = context.targetObject.position.y + dis;
        }
  
        if (context.targetObject.position.y < -radius) {
          context.targetObject.position.y = -radius;
        } else if (context.targetObject.position.y > radius) {
          context.targetObject.position.y = radius;
        }
  
        let y = context.targetObject.position.y;
        let degree1 = vectorDegree([0,0], [Math.sqrt(radius ** 2 - y ** 2), y])
        let degree2 = 180 - degree1;
        degree2 = degree2 > 0 ? degree2 : (360 + degree2);
        // obj
    })
  }

export function dragMoveWECallback (cartesianStart, cartesianEnd, context) {
  cartesianStart.y = 0;
  cartesianEnd.y = 0;
  const radius = (700 * scale) / 2;
  context.getSpaceDistance(cartesianStart, cartesianEnd).then((dis) => {
      dis = context.cartesianEnd.x > context.cartesianStart.x ? dis : -dis;
      if (context.targetObject.position.x >= -radius && context.targetObject.position.x <= radius) {
        context.targetObject.position.x = context.targetObject.position.x + dis;
      } 
      if (context.targetObject.position.x < -radius) {
        context.targetObject.position.x = -radius;
      } else if (context.targetObject.position.x > radius) {
        context.targetObject.position.x = radius;
      }

      let x = context.targetObject.position.x;
      let degree1 = vectorDegree([0,0], [x, Math.sqrt(radius ** 2 - x ** 2)])
      let degree2 = 360 - degree1;
  })
}