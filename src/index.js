import Vue from 'vue';
import App from '@/page/App.vue';
import EventEmitter2  from 'eventemitter2';

// import { Main3D } from '@/3d/main/index';
import MapBoxMain from '@/map/index'
import $axios from '@/config/axios-config.js';
import { registerEmitter } from '@/3d/lib/emitter';
import * as THREE from 'three';

window.THREE = THREE;
// const main3D = new Main3D();
const map = new MapBoxMain({}, () => {
  // 订阅发布
  MeteoInstance.emitter = new EventEmitter2();
  registerEmitter();

  Vue.prototype.$axios = $axios;
  // Vue.prototype.$main3D = main3D;
  Vue.prototype.$map3D = map;
  new Vue({
      render: h => h(App)
    }).$mount('#pageApp')
});
window.map = map
