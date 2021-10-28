import mapboxgl from 'mapbox-gl';
import { MAP_TOKEN, MAP_STYLE } from '@/config/map';

mapboxgl.accessToken = MAP_TOKEN;
window.mapboxgl = mapboxgl;

export default class MapBoxMain {
    constructor (option, loaded) {
        this.map = null;
        this.modelOrigin   = option.modelOrigin || [104.07274727, 30.57899372];
        this.modelAltitude = option.modelAltitude || 0;
        this.loaded = loaded || (() => {})

        this.init();
    }

    init () {
        this.map = new mapboxgl.Map({
            container: 'map',
            style: MAP_STYLE,
            zoom: 4,
            center: this.modelOrigin,
            pitch: 0,
            antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
        });

        this.map.on('style.load', this.loaded);
    }
} 