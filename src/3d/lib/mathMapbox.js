import * as Cesium from 'cesium';
import * as THREE from 'three';
import * as turf from '@turf/turf';
/**
 *  计算极坐标 
 *     xz 平面 弧度交 xzRadian
 *     xz 平面 center 到 point 距离 distance       
 * @param {*} center [lat, lon]
 * @param {*} R 
 * @param {*} coordA [lat, lon]
 * @param {*} coordB [lat, lon]
 * @param {*} _distance 距离库 距离计算公式
 * @param {*} Elevations Array<Int> 仰角
 * @returns 
 */

 export function computeIntersectionSegmentCirclePolar (center, R, coordA, coordB, GateSizeOfReflectivity, density, Elevations, radarNf) {
    let InterPoints = interTwoPoints(coordA, coordB, GateSizeOfReflectivity, R, density);
    // console.log('linear  lerp ==》', coordA, coordB, InterPoints);
    let Gates = R / GateSizeOfReflectivity + 1;
    let polars = []
    let base = []
    if (InterPoints) {
      InterPoints.forEach(point => {
          let degree = TwoPointDegree(center, point);
          let dis = TwoPointDistance(center, point);
          base.push({ azIndex: degree, binIndex: dis / GateSizeOfReflectivity, dis: dis })
      })
       
      let len = Elevations.length;
      let m = 0;
      for(let i = len - 1; i >= 0; i--, m++) {
          let ele = Elevations[i] / 180 * Math.PI;
          polars[m] = base.map(polarPoint => {
              let azIndex = polarPoint.azIndex;
              let binIndex = polarPoint.binIndex / Math.cos(ele);
              let val = binIndex > Gates ? 0 : radarNf.getOriginVal(i, azIndex | 0,  binIndex | 0).val;
              return { 
                azIndex,
                binIndex,
                val: val || 0
              }
          })
      }
      return polars;
    } 
    return [];
}


/**
 *  计算 空间坐标 
 *     xz 平面 弧度交 xzRadian
 *     xz 平面 center 到 point 距离 distance       
 * @param {*} center 
 * @param {*} R 
 * @param {*} pointA 
 * @param {*} pointB 
 * @param {*} _distance 距离库 距离计算公式
 * @param {*} Elevations Array<Int> 仰角
 * @returns 
 */

 export function computeIntersectionSegmentCircleSpace (center, R, coordA, coordB, GateSizeOfReflectivity, density, Elevations, radarNf, threebox) {
  // let InterPoints = interTwoPoints(pointA, pointB, GateSizeOfReflectivity, R, density);
  let InterPoints = interTwoPoints(coordA, coordB, GateSizeOfReflectivity, R, density);
  let Gates = R / GateSizeOfReflectivity + 1;
  let base = []
  let Colors = new THREE.Color();
  let vertices = [];
  let colors = [];
  let indices = [];
  let valMap = [];
  if (InterPoints) {
      let _center = new Cesium.Cartesian3(center[0], center[1], center[2])

      InterPoints.forEach(point => {
        let degree = TwoPointDegree(center, point);
        let dis = TwoPointDistance(center, point);
        let vector = threebox.projectToWorld(point); // 经纬度 转 坐标 [x, y]
        base.push({ azIndex: degree, binIndex: dis / GateSizeOfReflectivity, distance: dis, vector: vector })
      })

      console.log('base ==>', base)

      let len = Elevations.length;
      let baseLen = base.length;
      for(let i = 0; i < len; i++) {
          let ele = Elevations[i] / 180 * Math.PI;
          base.forEach((polarPoint, m) => {
              let azIndex = polarPoint.azIndex;
              let binIndex = polarPoint.binIndex / Math.cos(ele);
              let val = binIndex > Gates ? 0 : radarNf.getOriginVal(i, azIndex | 0,  binIndex | 0).val;
              valMap[i * baseLen + m] = val;
              // 颜色
              let rgb = Colors.setHex(MeteoInstance.colorCard[val | 0]);
              // 坐标
              let x = polarPoint.vector.x;
              let y = polarPoint.vector.y;
              let z = polarPoint.distance * Math.tan(ele) * 2;
              vertices.push(x, y, z);
              colors.push(rgb.r, rgb.g, rgb.b);
          })
      }

      for(let i = 0; i < len - 1; i++) { 
        for(let m = 0; m < baseLen - 1; m ++) {
          let bottom = m;
          let up = (i + 1) * baseLen + m;
         
          if (valMap[up + 1] > 0) {
            indices.push(bottom + 1, bottom, up + 1);
          }
          if (valMap[up] > 0 && valMap[up + 1] > 0) {
            indices.push(bottom, up, up + 1);
          }
        }
      }
  } 
  return {
    vertices,
    colors,
    indices,
  };
}

/**
 * 2点之间 获取等距离插值 坐标数组
 * @param {*} pointA 
 * @param {*} pointB 
 * @param {*} deltaDis 
 * @param {*} density  取值密度 density = 2  单位线段 缩小一倍， 1___1___1 --> 1_1_1_1_1
 * @param {*} R  插值半径
 */
export function interTwoPoints (coordA, coordB, deltaDis, R, density) {
  // 去最小值
  let actualDistance = TwoPointDistance(coordA, coordB);
  let validDis = Math.min(actualDistance, R);
  let len = validDis / deltaDis * density;
  let upLen = Math.ceil(len);
  let interpArr = [];
  for (let i = 0; i <= upLen; i++) {
    let t = i / upLen;
    let lat = coordA[0] * (1 - t) + coordB[0] * t;
    let lon = coordA[1] * (1 - t) + coordB[1] * t;
    interpArr.push([lat, lon]);
  }
  return interpArr;
}

/**
 * 两点 经纬度 距离
 * @param {*} coordA [lat, lon] 
 * @param {*} coordB [lat, lon]
 * @returns 
 */
export function TwoPointDistance (coordA, coordB) {
    let from = turf.point(coordA);
    let to   = turf.point(coordB);
    let options = { units: 'kilometers' };

    let distance = turf.distance(from, to, options);
    return distance * 1000;
}


/**
 * 两点 经纬度 夹角
 * @param {*} coordA [lat, lon] 
 * @param {*} coordB [lat, lon]
 * @returns 
 */
 function TwoPointDegree (center, target) {
  let pointA = turf.point(center);
  let pointB   = turf.point(target);

  let theta = turf.rhumbBearing(pointA, pointB);

  if (theta < 0) {
    theta = theta + 360;
  }
  return theta;
}
