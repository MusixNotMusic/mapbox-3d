import * as Cesium from 'cesium';
import * as THREE from 'three';
import * as turf from '@turf/turf';

import { 
    computeIntersectionSegmentCirclePolar,
    computeIntersectionSegmentCircleSpace,
} from '@/3d/lib/mathMapbox';

import { 
    imageShow,
    calcSpaceInterData,
    calcGridInterData
} from '@/3d/lib/interpolation';

import { throttle } from 'lodash';

import Map3dLayarThreebox from '@/map/layerThreebox';

window.turf = turf;

export class MouseMoveWall {
    constructor (data, map) {
        this.map = map;
        this.canvas = map.getCanvasContainer();

        this.radarNf = data;
        this.positions = []; 

        this.shiftDown = true;
        this.pcikerStartPoint = false;
        this.clickCount = 0;

        this.movePlane = null;
        this._computeClipLineDot = throttle(this.computeClipLineDot.bind(this), 100);
        this._updateMeshMovePlane = throttle(this.updateMeshMovePlane.bind(this), 100);
        this.raycaster = new THREE.Raycaster();

        this.geojson1 = null;
        this.geojson2 = null;
        this.createMovePoint();

        // 创建移动截面模板
        this.createMovePlane();

        // 笛卡尔 center
        let Position = this.radarNf.Header.Position;
        this.center = Cesium.Cartesian3.fromDegrees(Position[0], Position[1], Position[2]);

        this.prevPoint = new THREE.Vector3();

        this.listenerEvents.bind(this)();
    }

    createMovePoint () {
        this.geojson1 = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [110.077617, 30.493868]
                    // coordinates: [0, 0]
                }
            }]
        };

        this.geojson2 = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [104.077617, 30.493868]
                }
            }]
        };

        this.map.addSource('point1', {
            type: "geojson",
            data: this.geojson1
        });

        this.map.addSource('point2', {
            type: "geojson",
            data: this.geojson2
        });

        this.map.addLayer({
            id: 'point1',
            type: 'circle',
            source: 'point1',
            paint: {
                'circle-radius': 10,
                "circle-color": "#3887be"
            }
        })

        this.map.addLayer({
            id: 'point2',
            type: 'circle',
            source: 'point2',
            paint: {
                'circle-radius': 10,
                "circle-color": "#3887be"
            }
        })
    }

    destroyMovePoint () {
        this.map.removeLayer('point1');
        this.map.removeLayer('point2');
        this.geojson1 = null;
        this.geojson2 = null;
    }

    getMovePlane () {
        if (!this.movePlane) {
            return this.createMovePlane();
        }
        return this.movePlane;
    }

    createMovePlane () {
        // move panel
        let x = -291206.4756009876;
        let y = -91031.03549812565;

        let vetices = [
            x, y, 0, 
            x, y, 0, 
            0, y, 0, 
            0, y, 0, 
            0, y, 0, 
            x, y, 0 
        ]
       
        let colors = [
            Math.random(), 
            Math.random(), 
            Math.random(), 

            Math.random(), 
            Math.random(), 
            Math.random(), 
            
            Math.random(), 
            Math.random(), 
            Math.random(), 
            
            Math.random(), 
            Math.random(), 
            Math.random(), 
            
            Math.random(), 
            Math.random(), 
            Math.random(), 
            
            Math.random(), 
            Math.random(), 
            Math.random()
        ]

        let uvs = [
            0, 0,
            1, 0,
            0, 1,
            1, 1
        ]

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vetices, 3 ) );
        geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
        geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ));
        const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        material.map = new THREE.CanvasTexture( document.querySelector('.myCanvas') );
        material.map.needsUpdate = true;
        this.movePlane = new THREE.Mesh( geometry, material );
        this.movePlane.name = 'movePlane';

        this.layer = new Map3dLayarThreebox({
            id: 'move_plane',
            map: this.map,
            renderGraph: this.movePlane,
        });

        window.layerMove = this.layer;
        window.movePlane = this.movePlane;
        this.map.addLayer(this.layer.buildLayer(), 'country-label');
    }

    updateMovePlane (coordA, coordB) {
        let vectorA, vectorB;
        let pA = this.layer.tb.projectToWorld(coordA);
        let pB = this.layer.tb.projectToWorld(coordB);

        vectorA = new THREE.Vector3(pA.x, pA.y, 0);
        vectorB = new THREE.Vector3(pB.x, pB.y, 0);
        

        console.log('vectorA', vectorA);
        console.log('vectorB', vectorB);
        // console.log('vectorA, vectorB', vectorA, vectorB);
        vectorA.z = 0;
        vectorB.z = 0;

        let hA =  new THREE.Vector3().copy(vectorA);
        let hB =  new THREE.Vector3().copy(vectorB);

        hA.z += 1e3;
        hB.z += 1e3;

        let vertices = []

        vertices.push(...vectorA.toArray())
        vertices.push(...vectorB.toArray())
        vertices.push(...hA.toArray())
        vertices.push(...hB.toArray())
        let indices = [1, 0, 2, 1, 2, 3];
        // meshPlane.geometry.attributes.position.needsUpdate = true
        this.movePlane.geometry.setIndex(indices);
        this.movePlane.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    }

    updateMeshMovePlane() {
        let GateSizeOfReflectivity = this.radarNf.Header.GateSizeOfReflectivity; // 库距离
        let GateSize = this.radarNf.Header.Gates[this.radarNf.Header.BandNo];
        let Elevations = this.radarNf.Header.Elevations;
        // calc data
        let R = GateSizeOfReflectivity * GateSize;
        let pointA = [this.positions[0].x, this.positions[0].y, this.positions[0].z];
        let pointB = [this.positions[1].x, this.positions[1].y, this.positions[1].z];
        let center = [this.center.x, this.center.y, this.center.z];
        
        let density = 1;
        let { vertices, colors, indices,  normals} = computeIntersectionSegmentCircleSpace( center, R, pointA, pointB, GateSizeOfReflectivity, density, Elevations, this.radarNf);
        // meshPlane.geometry.attributes.position.needsUpdate = true
        this.movePlane.geometry.setIndex(indices);
        this.movePlane.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.movePlane.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        this.movePlane.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }

    onMovePoint1(e) {
        // console.log('onMovePoint1', e)
        if (this.notMovePoint1) return
        var coords = e.lngLat;
        // Set a UI indicator for dragging.
        this.canvas.style.cursor = 'grabbing';
        // Update the Point feature in `geojson` coordinates
        // and call setData to the source layer `point` on it.
        this.geojson1.features[0].geometry.coordinates = [coords.lng, coords.lat];
        this.map.getSource('point1').setData(this.geojson1);

        let coordA = this.geojson1.features[0].geometry.coordinates;
        let coordB = this.geojson2.features[0].geometry.coordinates;
        this.updateMovePlane(coordA, coordB);
        this._computeClipLineDot();
    }

    onUpPoint1 () {
        console.log('onUpPoint1 mouseup', this);
        this.notMovePoint1 = true
        this.map.off('mousemove', this.onMovePoint1.bind(this));
    }

    onMovePoint2 (e) {
        if (this.notMovePoint2) return;
        var coords = e.lngLat;
        // Set a UI indicator for dragging.
        this.canvas.style.cursor = 'grabbing';
        // Update the Point feature in `geojson` coordinates
        // and call setData to the source layer `point` on it.
        this.geojson2.features[0].geometry.coordinates = [coords.lng, coords.lat];
        this.map.getSource('point2').setData(this.geojson2);

        let coordA = this.geojson1.features[0].geometry.coordinates;
        let coordB = this.geojson2.features[0].geometry.coordinates;
        this.updateMovePlane(coordA, coordB);
        this._computeClipLineDot();
    }

    onUpPoint2 () {
        this.notMovePoint2 = true;
        this.map.off('mousemove', this.onMovePoint2.bind(this));
        // this.map.off('touchmove', 'point1', this.onMovePoint2.bind(this));
    }

    listenerEvents() {
        // 1 point1
        this.map.on('mouseenter', 'point1', () => {
            console.log('mouseenter')
            this.map.setPaintProperty('point1', 'circle-color', '#3bb2d0');
            this.canvas.style.cursor = 'move';
        })

        this.map.on('mouseleave', 'point1', () => {
            console.log('mouseleave')
            this.map.setPaintProperty('point1', 'circle-color', '#3887be');
            this.canvas.style.cursor = '';
        });

        this.map.on('mousedown', 'point1', (e) => {
            console.log('mousedown point A', e);
            this.notMovePoint1 = false;
            // Prevent the default map drag behavior.
            e.preventDefault();
             
            this.canvas.style.cursor = 'grab';
             
            this.map.on('mousemove', this.onMovePoint1.bind(this));
            this.map.once('mouseup', this.onUpPoint1.bind(this));
        });

        // 2 point2
        this.map.on('mouseenter', 'point2', () => {
            this.map.setPaintProperty('point2', 'circle-color', '#b3b2d0');
            this.canvas.style.cursor = 'move';
        })

        this.map.on('mouseleave', 'point2', () => {
            this.map.setPaintProperty('point2', 'circle-color', '#8387be');
            this.canvas.style.cursor = '';
        });

        this.map.on('mousedown', 'point2', (e) => {
            console.log('mousedown point B', e);
            this.notMovePoint2 = false;
            // Prevent the default map drag behavior.
            e.preventDefault();
             
            this.canvas.style.cursor = 'grab';
             
            this.map.on('mousemove', this.onMovePoint2.bind(this));
            this.map.once('mouseup', this.onUpPoint2.bind(this));
        });
    }

    removeEvents () {
      
    }

    destroy () {
        this._computeClipLineDot = null;
        this._updateMeshMovePlane = null;

        this.movePlane = null;

        this.radarNf = null;
        this.raycaster = null;

        this.destroyMovePoint();
    }

    keyDownHandle(e) {
        if (e.key === 'Shift') {
            this.shiftDown = true;
        }
    }

    keyUpHandle(e) {
        if (e.key === 'Shift') {
            this.shiftDown = false;
            this.pickerStartPoint = false;
            this.clickCount = 0;
        }
    }

    clearHandleStatus () {
        this.clickCount = 0;
        this.pickerStartPoint = false;
    }

    clickHandle(e) {
        if (this.shiftDown) {
            console.log('click ==>', e)
            if (this.clickCount === 2) {
                this.clearHandleStatus();
            }
            if (this.clickCount === 0) {
                this.positions[0] = this.screen2World(e);
                this.clickCount++;
                this.pickerStartPoint = true;
            } else if (this.clickCount === 1) {
                this.positions[1] = this.screen2World(e);
                this.pickerStartPoint = false;
                this.clickCount++;
                this.updateMovePlane(this.positions[0], this.positions[1]);
                this._computeClipLineDot();
                // this._updateMeshMovePlane();
            }

        }
    }

    mouseMoveHandle(e) {
        if (this.pickerStartPoint) {
            console.log('mousemove ==>', e)
            this.positions[1] = this.screen2World(e)
            this.updateMovePlane(this.positions[0], this.positions[1]);
            this._computeClipLineDot();
            // this._updateMeshMovePlane();
        }
    }

    /**
     * 获取地面交点
     * @param {*} event 
     * @returns 
     */
    screen2World (event) {
        let now = Date.now();
        let wrap = event.target.parentNode;
        let left = wrap.getBoundingClientRect().left;
        let top = wrap.getBoundingClientRect().top;
        let clientX = event.clientX - left;
        let clientY = event.clientY - top;

        let mouse = new THREE.Vector2();

        let camera = MeteoInstance.three.camera;
        let scene = MeteoInstance.three.scene;

        mouse.x = (clientX / wrap.offsetWidth) * 2 - 1;
        mouse.y = -(clientY / wrap.offsetHeight) * 2 + 1;

        console.log( mouse.x,  mouse.y);

        this.raycaster.setFromCamera(mouse, camera);
        let ground = scene.getObjectByName('ground');
        let intersects = this.raycaster.intersectObjects([ground], true);
        console.log('intersects ==>', intersects);
        if (intersects.length == 1){
            let ground = intersects[0];
            console.log('delta time ==>', Date.now() - now, ' ms');
            this.prevPoint = ground.point;
            return ground.point;
        }

        return this.prevPoint;
    }
    
    
    /**
     *  计算截面的 线数据
     */
     computeClipLineDot () {
        // origin data
        let GateSizeOfReflectivity = this.radarNf.Header.GateSizeOfReflectivity; // 库距离
        let GateSize = this.radarNf.Header.Gates[this.radarNf.Header.BandNo];
        let Position = this.radarNf.Header.Position;
        let Elevations = this.radarNf.Header.Elevations;
        // calc data
        let R = GateSizeOfReflectivity * GateSize;
        let coordA = this.geojson1.features[0].geometry.coordinates;
        let coordB = this.geojson2.features[0].geometry.coordinates;
        let center = [Position[0], Position[1]];
        
        let density = 1/2;
        let polar = computeIntersectionSegmentCirclePolar( center, R, coordA, coordB, GateSizeOfReflectivity, density, Elevations, this.radarNf);
        console.log('computeIntersectionSegmentCirclePolar ==>', polar);
        if (polar && polar.length > 0) {
            const canvas = this.drawSpaceImage(polar, Elevations);
            // const canvas = this.drawGridImage(polar);
            let texture = new THREE.CanvasTexture( canvas );
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            this.movePlane.material.map = texture;
            this.movePlane.material.needsUpdate = true;
        }
    }


    /**
     * 距离库 方位角定位
     * @param {*} layers 
     */
    draw2DPiexlImage (layers) {
        let now = Date.now();
        const canvas = document.querySelector('.myCanvas')
        const width = layers[0].length
        const height = layers.length
        const continueColorWidth = 2
        const continueColorHeight = 5
        const canvasWidth = width * continueColorWidth
        const canvasHeight = height * continueColorHeight
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        const color = new THREE.Color()
        const colorArray = MeteoInstance.colorArray;
        // console.log('canvasWidth ==>', canvasWidth, canvasHeight)
        if (canvas) {
            const ctx = canvas.getContext('2d')
            let imageData = ctx.createImageData(canvasWidth, canvasHeight)
            ctx.clearRect(0, 0, width, height)
            layers.forEach((layer, y) => {
                layer.forEach((obj, x) => {
                    this.drawLocationCanvasPiexlImage(
                        imageData, 
                        x * continueColorWidth, 
                        (height - y) * continueColorHeight, 
                        continueColorWidth, 
                        continueColorHeight, 
                        canvasWidth, 
                        color.set(colorArray[obj.val]),
                        this.distanceComputeFuncs)
                })
            })

            // this.drawDemoTest(imageData)
            ctx.putImageData(imageData, 0, 0)
            canvas.setAttribute('class', 'myCanvas')
            canvas.setAttribute('style', `width: ${canvasWidth}; height: ${canvasHeight}; margin-left: calc(50% - ${canvasWidth / 2}px)`)
        }
        console.log('draw image time ===>', Date.now() - now, ' ms');
    }


    /**
     * 空间距离定位，增加高度
     * @param {*} layers 
     */
     drawSpaceImage (layers, evelations) {
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

    /**
     * 空间距离定位，增加高度
     * @param {*} layers 
     */
    drawGridImage (layers) {
        let results = calcGridInterData(layers);
        let canvas = document.querySelector('.myCanvas');
        const mapColorsFunc = (val) => { return MeteoInstance.colorArray[val | 0]}
        canvas = imageShow(results.reverse(), canvas, 1, mapColorsFunc);
        let canvasWidth = canvas.clientWidth;
        let canvasHeight = canvas.clientHeight;
        canvas.setAttribute('class', 'myCanvas');
        canvas.setAttribute('style', `width: ${canvasWidth}; height: ${canvasHeight}; margin-left: calc(50% - ${canvasWidth / 2}px)`);
        return canvas;
    }

     /**
     * 
     * @param {*} imageData 
     * @param {*} offsetX 
     * @param {*} offsetY 
     * @param {*} width 
     * @param {*} height 
     */
      drawLocationCanvasPiexlImage (imageData, offsetX, offsetY, width, height, canvasWidth, colors) {
        for(let y = offsetY; y < offsetY + height; y++) {
            for(let x = offsetX * 4; x < (offsetX + width) * 4; x += 4) {
                imageData.data[y * canvasWidth * 4 + x] =  colors.r * 255 | 0
                imageData.data[y * canvasWidth * 4 + x + 1] = colors.g * 255 | 0
                imageData.data[y * canvasWidth * 4 + x + 2] = colors.b * 255 | 0
                imageData.data[y * canvasWidth * 4 + x + 3] = 255
            }
        }
    }

    distanceComputeFuncs (pointA, center) {
        return Cesium.Cartesian3.distance(new Cesium.Cartesian3(pointA[0], pointA[1], center[2]), new Cesium.Cartesian3(center[0], center[1], center[2]))
    }
}
