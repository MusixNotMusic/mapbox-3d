import { uniqueId } from 'lodash'
const Threebox = require('threebox-plugin').Threebox;

export default class Map3dLayar {
    constructor (option) {
        this.map = option.map;
        this.id = option.id || uniqueId('noknow_');
        this.renderGraph = option.renderGraph || (() => {});

        this.modelOrigin   = option.modelOrigin || [116.404237, 39.909833];
        this.modelAltitude = option.modelAltitude || 0;
        this.modelRotate   = option.modelRotate || [Math.PI / 2, 0, 0];

        // Transform
        // THREE
        this.renderer = null;

        // ThreeBox
        this.tb = null;
    }

    customRenderer (gl, matrix) {
        this.tb.update();
    }

    // create layer
    buildLayer() {
        return {
            id: this.id,
            type: 'custom',
            renderingMode: '3d',
            onAdd: (map, gl) => {
                this.tb = new Threebox(map, gl, { });

                if (this.renderGraph instanceof Promise) {
                    this.renderGraph.then((mesh) => {
                        this.tb.add(mesh);
                    })
                } else if (typeof this.renderGraph === 'function') {
                    let mesh = this.renderGraph();
                    this.tb.add(mesh);
                } else {
                    if (Array.isArray(this.renderGraph)) {
                        this.renderGraph.forEach(mesh => this.tb.add(mesh));
                    } else {
                        // this.tb.setCoords(this.modelOrigin);
                        this.tb.add(this.renderGraph);
                    }
                }
            },
            render: this.customRenderer.bind(this)
        }
    }
}