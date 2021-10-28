<template>
    <div class="wrap-production">
        <ul>
            <li v-for="(name, index) in productionNames"
                :key="index"
                :class="{'active': index === activeIndex }"
                @click="switchMode(index)" >
                <div class="listStyle"></div>
                <div class="title">{{name}}</div>
            </li>
        </ul>
        <!-- <div class='color-card'>
            <clr-view :width="60" :height="200" :baseURL="baseURL" :fileName="fileName"></clr-view>
        </div> -->
    </div>
</template>

<script>
import { loadPng } from '@/3d/lib/FileParser/png/loadPngData';
import { loadCRPZ } from '@/3d/lib/FileParser/CRPZ/CRPZLoader';
import { loadMax } from '@/3d/lib/FileParser/Max/MaxLoader';
import { loadRTDPZ } from '@/3d/lib/FileParser/RTDPZ/RTDPZLoader';
import ColorProcess from '@/3d/lib/ColorCardParser/color/ColorProcess';
import ClrView from './components/ClrView.vue';
import { measureLine } from '@/3d/lib/tool/measure';
import { MouseMoveWall } from '@/3d/test/plane2';

import { drawPointsMesh } from '@/3d/lib/model/drawPointsEle';
import { drawFaceMesh } from '@/3d/lib/model/drawFaceEle';
import { drawCubeMesh } from '@/3d/lib/model/drawCubeEle';
import { drawExtrusionMesh } from '@/3d/lib/model/drawExtrusionFace';
import { drawMaxPlane } from '@/3d/lib/model/drawMaxPlane';
import { drawGridMesh } from '@/3d/lib/model/drawGrid';
 
import Map3dLayar from '@/map/layer';

import { gltfLoader } from '@/3d/three/GLTFLoader';

import { DragObjects, dragMoveCallback, dragMoveWECallback } from '@/3d/lib/model/event/drag';

export default {
  components: { ClrView },
  data() {
    return {
      productionNames: ['点', '面', '体', '挤压', 'Max', '格点数据'],
      activeIndex: -1,
    //   baseURL: 'http://222.18.149.195:9091/configs/Clr/',
    //   fileName: 'clrMAXRef.clr',
      baseURL: 'http://222.18.149.104:8081/color/',
      fileName: 'clrZ.clr',
      prevName: '',
      wall: null
    }
  },
  methods: {
    switchMode (index) {
        let indexMapName = ['point', 'face', 'cube', 'extrusion', 'max', 'grid']
        this.activeIndex = index;
        
        if (this.prevName) {
            this.$map3D.map.removeLayer(this.prevName);
        }
        if (index < 3) {
            const colorPrcess = new ColorProcess()
            colorPrcess.initPromise(this.fileName, this.baseURL).then((data) => {
                MeteoInstance.colorArray = data.colorArray;
                MeteoInstance.colorCard = data.colorArray.map(hexString => {
                    return window.parseInt(`0x${hexString.slice(1)}`);
                });
                loadPng().then((data) => {
                    console.log('data ==>', data);
                    // 
                    if (!this.wall) {
                        this.wall = new MouseMoveWall(data, this.$map3D.map);
                    }
                    let mesh;
                    switch(indexMapName[index]) {
                        case 'point':
                            mesh = drawPointsMesh(data);
                            break;
                        case 'face':
                            mesh = drawFaceMesh(data);
                            break;
                        case 'cube':
                            mesh = gltfLoader('/data/testz.gltf');
                            break;
                    }
                    // return mesh;
                    window.mesh = mesh;
                    let layer = new Map3dLayar({
                        id: indexMapName[index],
                        map: this.$map3D.map,
                        renderGraph: mesh,
                        modelOrigin: [data.Header.Position[0], data.Header.Position[1]],
                        modelAltitude: data.Header.Position[2],
                        modelRotate: [Math.PI / 2, Math.PI / 2, 0],
                    });
                    this.$map3D.map.addLayer(layer.buildLayer(), 'country-label');
                    window.layer = layer;
                })
             })
        } else if( index === 3) {
            const colorPrcess = new ColorProcess()
            colorPrcess.initPromise(this.fileName, this.baseURL).then((data) => {
                MeteoInstance.colorCard = data.colorArray.map(hexString => {
                    return window.parseInt(`0x${hexString.slice(1)}`);
                });
                MeteoInstance.colorArray = data.colorArray;
                loadCRPZ().then((data) => {
                  console.log('loadCRPZ ==>', data);
                  let mesh = drawExtrusionMesh(data);
                  let layer = new Map3dLayar({
                        id: indexMapName[index],
                        map: this.$map3D.map,
                        renderGraph: mesh,
                        modelOrigin: [data.centerLon, data.centerLat],
                        modelAltitude: 0
                  });
                  this.$map3D.map.addLayer(layer.buildLayer());
                })
            })

        } else if( index === 4) {
            const colorPrcess = new ColorProcess();
            colorPrcess.initPromise(this.fileName, this.baseURL).then((data) => {
                MeteoInstance.colorCard = data.colorArray.map(hexString => {
                    return window.parseInt(`0x${hexString.slice(1)}`);
                });
                MeteoInstance.colorArray = data.colorArray;
                loadMax().then((data) => {
                  console.log('loadMax ==>', data)
                  let { top, ns, we, moveNs, moveWe, halfWidth, halfHeight } = drawMaxPlane(data, this.$map3D.map);
                  window.moveNs = moveNs;
                  window.moveWe = moveWe;
                  let layer = new Map3dLayar({
                        id: indexMapName[index],
                        map: this.$map3D.map,
                        renderGraph: [top, ns, we],
                        modelOrigin: [data.Headers.centerLon, data.Headers.centerLat],
                        modelRotate: [0, 0, Math.PI],
                        modelAltitude: 0
                  });
                  this.$map3D.map.addLayer(layer.buildLayer());

                  let layerMoveNs = new Map3dLayar({
                        id: moveNs.name,
                        map: this.$map3D.map,
                        renderGraph: [moveNs, moveWe],
                        modelOrigin: [data.Headers.centerLon, data.Headers.centerLat],
                        modelRotate: [0, 0, Math.PI],
                        modelAltitude: 0
                  });
                  this.$map3D.map.addLayer(layerMoveNs.buildLayer());

                //   let layerMoveWe = new Map3dLayar({
                //         id: moveWe.name,
                //         map: this.$map3D.map,
                //         renderGraph: moveWe,
                //         modelOrigin: [data.Headers.centerLon, data.Headers.centerLat],
                //         modelRotate: [0, 0, Math.PI],
                //         modelAltitude: 0
                //   });
                //   this.$map3D.map.addLayer(layerMoveWe.buildLayer());

                //   new DragObjects(moveNs, dragMoveCallback, layerMoveNs, this.$map3D.map);
                //   new DragObjects(moveWe, dragMoveWECallback, layerMoveNs, this.$map3D.map);
                    new DragObjects([moveNs, moveWe], dragMoveWECallback, layerMoveNs, this.$map3D.map, halfWidth, halfHeight);
                });
            })
        } else if( index === 5) {
            const colorPrcess = new ColorProcess();
            colorPrcess.initPromise(this.fileName, this.baseURL).then((data) => {
                MeteoInstance.colorArray = data.colorArray;
                MeteoInstance.colorCard = data.colorArray.map(hexString => {
                    return window.parseInt(`0x${hexString.slice(1)}`);
                });
                loadRTDPZ().then((data) => {
                  console.log('loadRTDPZ ==>', data);
                  let mesh = drawGridMesh(data);
                  let layer = new Map3dLayar({
                        id: indexMapName[index],
                        map: this.$map3D.map,
                        renderGraph: mesh,
                        modelOrigin: [data.centerLon, data.centerLat],
                        modelAltitude: 0
                  });
                  this.$map3D.map.addLayer(layer.buildLayer());
                });
            })
        }

        this.prevName = indexMapName[index];
    },
  },
  mounted () {
    window.$vue = this;
    this.switchMode(4);
 }
}
</script>

<style lang="scss" scoped>
    // .wrap-page {
    //     position: absolute;
    //     top: 0;
    //     left: 0;
    //     height: 100%;
    //     width: 100%;
    //     margin: 0;
    //     overflow: hidden;
    //     padding: 0;
    //     font-family: sans-serif;
    //     /* z-index: 1; */
    //     pointer-events: none;

        .wrap-production {
            position: fixed;
            top: 140px;
            left: 10px;
            display: flex;

            // .mark-bar {
            //     width: 30px;
            //    .mark-bar-item {

            //    }
            // }

            ul {
                list-style: none;
                li {
                    display: flex;
                    justify-content: left;
                    align-items: center;
                    cursor: pointer;
                    .listStyle {
                        width: 10px;
                        height: 10px;
                        background: #ccc;
                        margin-right: 10px;
                    }
                    .listStyle::before {

                    }
                    .title {
                        color: white;
                    }
                }

                li:hover {
                    display: flex;
                    justify-content: left;
                    align-items: center;
                    cursor: pointer;
                    .listStyle {
                        background: #f59a23;
                    }
                    .title {
                        color: #f59a23;
                    }
                }
            }
        }
        .active {
                    color: #f59a23 !important;
                }

        .color-card {
            position: fixed;
            left: 20px;
            bottom: 100px;
            width: 80px;
            height: 300px;
        }
    // }
</style>
