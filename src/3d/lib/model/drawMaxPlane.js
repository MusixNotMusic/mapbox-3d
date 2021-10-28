import * as THREE from 'three';
import { DragObjects, dragMoveCallback, dragMoveWECallback } from './event/drag';
// import * as Cesium from 'cesium';

let scale = 500; // 700
export function drawMaxPlane(data) {

  let canvTop = data.toImageCanvas(data.DataTop, data.widthPixel, data.widthPixel); 
  let canvNS = data.toImageCanvas(data.DataNS, data.widthPixel, data.heightPixel, true);
  let canvWE = data.toRotationImageCanvas(data.DataWE, data.widthPixel, data.heightPixel, false);
//   let canvWE = data.toImageCanvas(data.DataWE, data.heightPixel, data.widthPixel, false);

  const planeTop = new THREE.PlaneGeometry(data.widthPixel * scale, data.widthPixel * scale);
  const planeNS = new THREE.PlaneGeometry(data.widthPixel * scale, data.heightPixel * scale);
  const planeWE = new THREE.PlaneGeometry(data.widthPixel * scale, data.heightPixel * scale);

  const planeMoveNs = new THREE.PlaneGeometry(data.widthPixel * scale, data.heightPixel * scale);
  const planeMoveWE = new THREE.PlaneGeometry(data.widthPixel * scale, data.heightPixel * scale);

  const materialTop = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.6  });
  const materialNS = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const materialWE = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.7 });

  const materialMoveNS = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, color: 'gray', opacity: 0.6 });
  const materialMoveWE = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, color: 'gray', opacity: 0.6 });

  materialTop.map = new THREE.CanvasTexture( canvTop );
  materialNS.map = new THREE.CanvasTexture( canvNS );
  materialWE.map = new THREE.CanvasTexture( canvWE );

  materialTop.map.needsUpdate = true;
  materialNS.map.needsUpdate = true;
  materialWE.map.needsUpdate = true;
  //
//   const material = new THREE.MeshBasicMaterial({
//     side: THREE.DoubleSide,
//     vertexColors: true,
//     opacity: 0.3
//   });
  const meshTop = new THREE.Mesh(planeTop, materialTop);
  meshTop.rotation.x = Math.PI;
  meshTop.rotation.y = Math.PI;

  const meshNS = new THREE.Mesh(planeNS, materialNS);
  meshNS.rotation.x = Math.PI / 2;
  meshNS.rotation.y = Math.PI;
  meshNS.position.z += data.heightPixel / 2 * scale;
  meshNS.position.y -= data.widthPixel / 2 * scale;

  const meshWE = new THREE.Mesh(planeWE, materialWE);
  meshWE.rotation.x = Math.PI / 2;
  meshWE.rotation.y = Math.PI / 2;
  meshWE.position.z += data.heightPixel / 2 * scale;
  meshWE.position.x -= data.widthPixel / 2 * scale;

  // move
  const meshMoveNS = new THREE.Mesh(planeMoveNs, materialMoveNS);
  meshMoveNS.position.z += data.heightPixel / 2 * scale;
  meshMoveNS.position.y += data.widthPixel / 2 * scale;
  meshMoveNS.rotation.x = Math.PI / 2;
  meshMoveNS.name = 'moveNs';
  // meshNS.rotation.y = Math.PI;

  const meshMoveWE = new THREE.Mesh(planeMoveWE, materialMoveWE);
  meshMoveWE.position.z += data.heightPixel / 2 * scale;
  meshMoveWE.position.x += data.widthPixel / 2 * scale;
  meshMoveWE.rotation.y = Math.PI / 2;
  meshMoveWE.rotation.x = Math.PI / 2;
  meshMoveWE.name = 'moveWe';
  // meshNS.rotation.y = Math.PI;

  // new DragObjects(meshMoveNS, dragMoveCallback, map);
  // new DragObjects(meshMoveWE, dragMoveWECallback, map);

  return {
    top: meshTop,
    ns: meshNS,
    we: meshWE,
    moveNs: meshMoveNS,
    moveWe: meshMoveWE,
    halfWidth: data.widthPixel / 2 * scale,
    halfHeight: data.heightPixel / 2 * scale
  };
}