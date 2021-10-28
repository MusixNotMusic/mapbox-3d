import * as THREE from 'three';
import mapboxgl from 'mapbox-gl';
import { uniqueId } from 'lodash'

export default class Map3dLayar {
    constructor (option) {
        this.map = option.map;
        this.id = option.id || uniqueId('noknow_');
        this.renderGraph = option.renderGraph || (() => {});

        this.modelOrigin   = option.modelOrigin || [116.404237, 39.909833];
        this.modelAltitude = option.modelAltitude || 0;
        this.modelRotate   = option.modelRotate || [Math.PI / 2, 0, 0];

        // Transform
        this.modelAsMercatorCoordinate = null;
        this.modelTransform = null;

        // THREE
        this.camera   = new THREE.Camera();
        this.scene    = new THREE.Scene();
        this.renderer = null;

        //
        this.matrix = null;

        this.transfrom();
    }

    /**
     * 获取坐标变换 (lon, lat, alt) ===> (x, y, z)
     */
     transfrom () {
        this.modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
            this.modelOrigin,
            this.modelAltitude
        );
             
        // transformation parameters to position, rotate and scale the 3D model onto the map
        this.modelTransform = {
            translateX: this.modelAsMercatorCoordinate.x,
            translateY: this.modelAsMercatorCoordinate.y,
            translateZ: this.modelAsMercatorCoordinate.z,
            rotateX: this.modelRotate[0],
            rotateY: this.modelRotate[1],
            rotateZ: this.modelRotate[2],
            /* Since the 3D model is in real world meters, a scale transform needs to be
            * applied since the CustomLayerInterface expects units in MercatorCoordinates.
            */
            scale: this.modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
        };
        return this;
    }

    customRenderer (gl, matrix) {
        // console.log('customRenderer ==>', matrix);
        this.matrix = matrix;
        if (!this.renderer) return;

        const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            this.modelTransform.rotateX
        );
        const rotationY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            this.modelTransform.rotateY
        );
        const rotationZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            this. modelTransform.rotateZ
        );
         
        const m = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4()
            .makeTranslation(
                this.modelTransform.translateX,
                this.modelTransform.translateY,
                this.modelTransform.translateZ
            )
            .scale(
                new THREE.Vector3(
                    this.modelTransform.scale,
                    -this.modelTransform.scale,
                    this.modelTransform.scale
                )
            )
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);
         
        this.camera.projectionMatrix = m.multiply(l);

        // const m = new THREE.Matrix4().fromArray(matrix);
        // this.camera.projectionMatrix = m.multiply(l);
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        this.map.triggerRepaint();
    }

    // create layer
    buildLayer() {
        return {
            id: this.id,
            type: 'custom',
            renderingMode: '3d',
            onAdd: (map, gl) => {
                console.log('buildLayer ==>', this.renderGraph)
                if (this.renderGraph instanceof Promise) {
                    this.renderGraph.then((mesh) => {
                        const directionalLight = new THREE.DirectionalLight(0xffffff);
                        directionalLight.position.set(0, 70, 100).normalize();
                        this.scene.add(directionalLight);

                        this.scene.add(mesh);
                        // use the Mapbox GL JS map canvas for three.js
                        this.renderer = new THREE.WebGLRenderer({
                            canvas: map.getCanvas(),
                            context: gl,
                            antialias: true
                        });
                        
                        this.renderer.autoClear = false;
                    })
                } else if (typeof this.renderGraph === 'function') {
                    let mesh = this.renderGraph();
                    this.scene.add(mesh);
                    this.renderer = new THREE.WebGLRenderer({
                        canvas: map.getCanvas(),
                        context: gl,
                        antialias: true
                    });
                    this.renderer.autoClear = false;

                } else {
                    if (Array.isArray(this.renderGraph)) {
                        this.renderGraph.forEach(mesh => this.scene.add(mesh))
                    } else {
                        this.scene.add(this.renderGraph);
                    }
                    this.renderer = new THREE.WebGLRenderer({
                        canvas: map.getCanvas(),
                        context: gl,
                        antialias: true
                    });
                    this.renderer.autoClear = false;
                }
            },
            render: this.customRenderer.bind(this)
        }
    }
}