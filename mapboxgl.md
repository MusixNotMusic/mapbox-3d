# mapboxgl Api 使用

## 右键滚轮 
```js
    map.dragRotate.disable();
    map.dragRotate.enable();
```

## 左键 
```js
    map.dragPan.disable();
    map.dragPan.enable();
```

## 滚轮
```js
    map.scrollZoom.disable();
    map.scrollZoom.enable();
```


## mapbox 事件使用
```js
    var geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [0, 0]
            }
        }]
    };

    function onMove(e) {
        var coords = e.lngLat;
        
        // Set a UI indicator for dragging.
        canvas.style.cursor = 'grabbing';
        
        // Update the Point feature in `geojson` coordinates
        // and call setData to the source layer `point` on it.
        geojson.features[0].geometry.coordinates = [coords.lng, coords.lat];
        map.getSource('point').setData(geojson);
    }

    function onUp(e) {
        coordinates.style.display = 'block';
        coordinates.innerHTML = 'Longitude: ' + coords.lng + '<br />Latitude: ' + coords.lat;
        canvas.style.cursor = '';

        map.off('mousemove', onMove);
        map.off('touchmove', onMove);
    }

    map.on('load', function() {
 
        // Add a single point to the map
        map.addSource('point', {
            "type": "geojson",
            "data": geojson
        });

        map.addLayer({
            "id": "point",
            "type": "circle",
            "source": "point",
            "paint": {
                "circle-radius": 10,
                "circle-color": "#3887be"
            }
        });

        // When the cursor enters a feature in the point layer, prepare for dragging.
        map.on('mouseenter', 'point', function() {
            map.setPaintProperty('point', 'circle-color', '#3bb2d0');
            canvas.style.cursor = 'move';
        });

        map.on('mouseleave', 'point', function() {
            map.setPaintProperty('point', 'circle-color', '#3887be');
            canvas.style.cursor = '';
        });

        map.on('mousedown', 'point', function(e) {
            // Prevent the default map drag behavior.
            e.preventDefault();

            canvas.style.cursor = 'grab';

            map.on('mousemove', onMove);
            map.once('mouseup', onUp);
        });

        map.on('touchstart', 'point', function(e) {
            if (e.points.length !== 1) return;

            // Prevent the default map drag behavior.
            e.preventDefault();

            map.on('touchmove', onMove);
            map.once('touchend', onUp);
        });
    });

```