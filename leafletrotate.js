(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
})((function () { 'use strict';
    const domUtilProto = L.extend({}, L.DomUtil);

    L.extend(L.DomUtil, {
        setTransform: function(el, offset, scale, bearing, pivot) {
            var pos = offset || new L.Point(0, 0);
            if (!bearing) {
                offset = pos._round();
                return domUtilProto.setTransform.apply(this, arguments);
            }
            pos = pos.rotateFrom(bearing, pivot);
            el.style[L.DomUtil.TRANSFORM] =
                'translate3d(' + pos.x + 'px,' + pos.y + 'px' + ',0)' +
                (scale ? ' scale(' + scale + ')' : '') +
                ' rotate(' + bearing + 'rad)';
        },
        setPosition: function(el, point, bearing, pivot, scale) {
            if (!bearing) {
                return domUtilProto.setPosition.apply(this, arguments);
            }
            el._leaflet_pos = point;
            if (L.Browser.any3d) {
                L.DomUtil.setTransform(el, point, scale, bearing, pivot);
            } else {
                el.style.left = point.x + 'px';
                el.style.top = point.y + 'px';
            }
        },
        DEG_TO_RAD: Math.PI / 180,
        RAD_TO_DEG: 180 / Math.PI,

    });
    L.Draggable.include({
    });
    L.extend(L.Point.prototype, {
        rotate: function(theta) {
            return this.rotateFrom(theta, new L.Point(0,0))
        },
        rotateFrom: function(theta, pivot) {
            if (!theta) { return this; }
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);
            var cx = pivot.x,
                cy = pivot.y;
            var x = this.x - cx,
                y = this.y - cy;
            return new L.Point(
                x * cosTheta - y * sinTheta + cx,
                x * sinTheta + y * cosTheta + cy
            );
        },
    });
    const divOverlayProto = L.extend({}, L.DivOverlay.prototype);
    L.DivOverlay.include({
        getEvents: function() {
            return L.extend(divOverlayProto.getEvents.apply(this, arguments), { rotate: this._updatePosition });
        },
        _updatePosition: function() {
            if (!this._map) { return; }
            divOverlayProto._updatePosition.apply(this, arguments);
            if (this._map && this._map._rotate && this._zoomAnimated) {
                var anchor = this._getAnchor();
                var pos = L.DomUtil.getPosition(this._container).subtract(anchor);
                L.DomUtil.setPosition(this._container, this._map.rotatedPointToMapPanePoint(pos).add(anchor));
            }
        },
    });
    const popupProto = L.extend({}, L.Popup.prototype);
    L.Popup.include({
        _animateZoom: function(e) {
            popupProto._animateZoom.apply(this, arguments);
            if (this._map && this._map._rotate) {
                var anchor = this._getAnchor();
                var pos = L.DomUtil.getPosition(this._container).subtract(anchor);
                L.DomUtil.setPosition(this._container, this._map.rotatedPointToMapPanePoint(pos).add(anchor));
            }
        },
        _adjustPan: function() {
            if (!this.options.autoPan || (this._map._panAnim && this._map._panAnim._inProgress)) { return; }
            if (this._autopanning) {
                this._autopanning = false;
                return;
            }
            var map = this._map,
                marginBottom = parseInt(L.DomUtil.getStyle(this._container, 'marginBottom'), 10) || 0,
                containerHeight = this._container.offsetHeight + marginBottom,
                containerWidth = this._containerWidth,
                layerPos = new L.Point(this._containerLeft, -containerHeight - this._containerBottom);
            layerPos._add(L.DomUtil.getPosition(this._container));
            var containerPos = layerPos._add(this._map._getMapPanePos()),
                padding = L.point(this.options.autoPanPadding),
                paddingTL = L.point(this.options.autoPanPaddingTopLeft || padding),
                paddingBR = L.point(this.options.autoPanPaddingBottomRight || padding),
                size = map.getSize(),
                dx = 0,
                dy = 0;
            if (containerPos.x + containerWidth + paddingBR.x > size.x) { // right
                dx = containerPos.x + containerWidth - size.x + paddingBR.x;
            }
            if (containerPos.x - dx - paddingTL.x < 0) { // left
                dx = containerPos.x - paddingTL.x;
            }
            if (containerPos.y + containerHeight + paddingBR.y > size.y) { // bottom
                dy = containerPos.y + containerHeight - size.y + paddingBR.y;
            }
            if (containerPos.y - dy - paddingTL.y < 0) { // top
                dy = containerPos.y - paddingTL.y;
            }
            if (dx || dy) {
                if (this.options.keepInView) {
                    this._autopanning = true;
                }
                map
                    .fire('autopanstart')
                    .panBy([dx, dy]);
            }
        },
    });
    const tooltipProto = L.extend({}, L.Tooltip.prototype);
    L.Tooltip.include({
        _animateZoom: function(e) {
            if (!this._map._rotate) {
                return tooltipProto._animateZoom.apply(this, arguments);
            }
            var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center);
            pos = this._map.rotatedPointToMapPanePoint(pos);
            this._setPosition(pos);
        },
        _updatePosition: function() {
            if (!this._map._rotate) {
                return tooltipProto._updatePosition.apply(this, arguments);
            }
            var pos = this._map.latLngToLayerPoint(this._latlng);
            pos = this._map.rotatedPointToMapPanePoint(pos);
            this._setPosition(pos);
        },
    });
    L.extend({}, L.Icon.prototype);
    L.Icon.include({
        _setIconStyles: function(img, name) {
            var options = this.options;
            var sizeOption = options[name + 'Size'];
            if (typeof sizeOption === 'number') {
                sizeOption = [sizeOption, sizeOption];
            }
            var size = L.point(sizeOption),
                anchor = L.point(name === 'shadow' && options.shadowAnchor || options.iconAnchor ||
                    size && size.divideBy(2, true));
            img.className = 'leaflet-marker-' + name + ' ' + (options.className || '');
            if (anchor) {
                img.style.marginLeft = (-anchor.x) + 'px';
                img.style.marginTop = (-anchor.y) + 'px';
                img.style[L.DomUtil.TRANSFORM + "Origin"] = anchor.x + "px " + anchor.y + "px 0px";
            }
            if (size) {
                img.style.width = size.x + 'px';
                img.style.height = size.y + 'px';
            }
        },
    });
    const markerProto = L.extend({}, L.Marker.prototype);
    L.Marker.mergeOptions({
        rotation: 0,
        rotateWithView: false,
        scale: undefined,
    });
    var markerDragProto; // retrived at runtime (see below: L.Marker::_initInteraction())
    var MarkerDrag = {
        _onDrag: function(e) {
            var marker = this._marker,
                rotated_marker = marker.options.rotation || marker.options.rotateWithView,
                shadow = marker._shadow,
                iconPos = L.DomUtil.getPosition(marker._icon);
            if (!rotated_marker && shadow) {
                L.DomUtil.setPosition(shadow, iconPos);
            }
            if (marker._map._rotate) {
                iconPos = marker._map.mapPanePointToRotatedPoint(iconPos);
            }
            var latlng = marker._map.layerPointToLatLng(iconPos);
            marker._latlng = latlng;
            e.latlng = latlng;
            e.oldLatLng = this._oldLatLng;
            if (rotated_marker) marker.setLatLng(latlng); // use `setLatLng` to presisit rotation. low efficiency
            else marker.fire('move', e); // `setLatLng` will trig 'move' event. we imitate here.
            marker
                .fire('drag', e);
        },
        _onDragEnd: function(e) {
            if (this._marker._map._rotate) {
                this._marker.update();
            }
            markerDragProto._onDragEnd.apply(this, arguments);
        },
    };
    L.Marker.include({
        getEvents: function() {
            return L.extend(markerProto.getEvents.apply(this, arguments), { rotate: this.update });
        },
        _initInteraction: function() {
            var ret = markerProto._initInteraction.apply(this, arguments);
            if (this.dragging && this.dragging.enabled() && this._map && this._map._rotate) {
                markerDragProto = markerDragProto || Object.getPrototypeOf(this.dragging);
                this.dragging.disable();
                Object.assign(this.dragging, {
                    _onDrag: MarkerDrag._onDrag.bind(this.dragging),
                    _onDragEnd: MarkerDrag._onDragEnd.bind(this.dragging),
                });
                this.dragging.enable();
            }
            return ret;
        },
        _setPos: function(pos) {
            if (this._map._rotate) {
                pos = this._map.rotatedPointToMapPanePoint(pos);
            }
            var bearing = this.options.rotation || 0;
            if (this.options.rotateWithView) {
                bearing += this._map._bearing;
            }
            if (this._icon) {
                L.DomUtil.setPosition(this._icon, pos, bearing, pos, this.options.scale);
            }
            if (this._shadow) {
                L.DomUtil.setPosition(this._shadow, pos, bearing, pos, this.options.scale);
            }
            this._zIndex = pos.y + this.options.zIndexOffset;
            this._resetZIndex();
        },
        setRotation: function(rotation) {
            this.options.rotation = rotation;
            this.update();
        },
    });
    const gridLayerProto = L.extend({}, L.GridLayer.prototype);
    L.GridLayer.include({
        getEvents: function() {
            var events = gridLayerProto.getEvents.apply(this, arguments);
            if (this._map._rotate && !this.options.updateWhenIdle) {
                if (!this._onRotate) {
                    this._onRotate = L.Util.throttle(this._onMoveEnd, this.options.updateInterval, this);
                }
                events.rotate = this._onRotate;
            }
            return events;
        },
        _getTiledPixelBounds: function(center) {
            if (!this._map._rotate) {
                return gridLayerProto._getTiledPixelBounds.apply(this, arguments);
            }
            return this._map._getNewPixelBounds(center, this._tileZoom);
        },
    });
    const rendererProto = L.extend({}, L.Renderer.prototype);
    L.Renderer.include({
        getEvents: function() {
            return L.extend(rendererProto.getEvents.apply(this, arguments), { rotate: this._update });
        },
        onAdd: function() {
            rendererProto.onAdd.apply(this, arguments);
            if (L.version <= "1.9.3") {
                this._container.classList.add('leaflet-zoom-animated');
            }
        },
        _updateTransform: function(center, zoom) {
            if (!this._map._rotate) {
                return rendererProto._updateTransform.apply(this, arguments);
            }
            var scale = this._map.getZoomScale(zoom, this._zoom),
                offset = this._map._latLngToNewLayerPoint(this._topLeft, zoom, center);
            L.DomUtil.setTransform(this._container, offset, scale);
        },
        _update: function() {
            if (!this._map._rotate) {
                return rendererProto._update.apply(this, arguments);
            }
            this._bounds = this._map._getPaddedPixelBounds(this.options.padding);
            this._topLeft = this._map.layerPointToLatLng(this._bounds.min);
            this._center = this._map.getCenter();
            this._zoom = this._map.getZoom();
        },
    });
    const mapProto = L.extend({}, L.Map.prototype);
    L.Map.mergeOptions({ rotate: false, bearing: 0, });
    L.Map.include({
        initialize: function(id, options) {
            if (options.rotate) {
                this._rotate = true;
                this._bearing = 0;
            }
            mapProto.initialize.apply(this, arguments);
            if(this.options.rotate){
              this.setBearing(this.options.bearing);
            }
        },
        containerPointToLayerPoint: function(point) {
            if (!this._rotate) {
                return mapProto.containerPointToLayerPoint.apply(this, arguments);
            }
            return L.point(point)
                .subtract(this._getMapPanePos())
                .rotateFrom(-this._bearing, this._getRotatePanePos())
                .subtract(this._getRotatePanePos());
        },
        layerPointToContainerPoint: function(point) {
            if (!this._rotate) {
                return mapProto.layerPointToContainerPoint.apply(this, arguments);
            }
            return L.point(point)
                .add(this._getRotatePanePos())
                .rotateFrom(this._bearing, this._getRotatePanePos())
                .add(this._getMapPanePos());
        },
        rotatedPointToMapPanePoint: function(point) {
            return L.point(point)
                .rotate(this._bearing)
                ._add(this._getRotatePanePos());
        },
        mapPanePointToRotatedPoint: function(point) {
            return L.point(point)
                ._subtract(this._getRotatePanePos())
                .rotate(-this._bearing);
        },
        mapBoundsToContainerBounds: function (bounds) {
            if (!this._rotate && mapProto.mapBoundsToContainerBounds) {
                return mapProto.mapBoundsToContainerBounds.apply(this, arguments);
            }
            const origin = this.getPixelOrigin();
            const nw = this.layerPointToContainerPoint(this.project(bounds.getNorthWest())._subtract(origin)),
                  ne = this.layerPointToContainerPoint(this.project(bounds.getNorthEast())._subtract(origin)),
                  sw = this.layerPointToContainerPoint(this.project(bounds.getSouthWest())._subtract(origin)),
                  se = this.layerPointToContainerPoint(this.project(bounds.getSouthEast())._subtract(origin));
            return L.bounds([
                L.point(Math.min(nw.x, ne.x, se.x, sw.x), Math.min(nw.y, ne.y, se.y, sw.y)), // [ minX, minY ]
                L.point(Math.max(nw.x, ne.x, se.x, sw.x), Math.max(nw.y, ne.y, se.y, sw.y))  // [ maxX, maxY ]
            ]);
        },
        getBounds: function() {
            if (!this._rotate) {
                return mapProto.getBounds.apply(this, arguments);
            }
            var size = this.getSize();
            return new L.LatLngBounds([
                this.containerPointToLatLng([0, 0]),           // topleft
                this.containerPointToLatLng([size.x, 0]),      // topright 
                this.containerPointToLatLng([size.x, size.y]), // bottomright
                this.containerPointToLatLng([0, size.y]),      // bottomleft
            ]);
        },
        setBearing: function(theta) {
            if (!L.Browser.any3d || !this._rotate) { return; }
            var bearing = L.Util.wrapNum(theta, [0, 360]) * L.DomUtil.DEG_TO_RAD,
                center = this._getPixelCenter(),
                oldPos = this._getRotatePanePos().rotateFrom(-this._bearing, center),
                newPos = oldPos.rotateFrom(bearing, center);
            L.DomUtil.setPosition(this._rotatePane, oldPos, bearing, center);
            this._pivot = center;
            this._bearing = bearing;
            this._rotatePanePos = newPos;
            this.fire('rotate');
        },
        getBearing: function() {
            return this._bearing * L.DomUtil.RAD_TO_DEG;
        },
        _initPanes: function() {
            var panes = this._panes = {};
            this._paneRenderers = {};
            this._mapPane = this.createPane('mapPane', this._container);
            L.DomUtil.setPosition(this._mapPane, new L.Point(0, 0));
            if (this._rotate) {
                this._rotatePane = this.createPane('rotatePane', this._mapPane);
                this._norotatePane = this.createPane('norotatePane', this._mapPane);
                this.createPane('tilePane', this._rotatePane);
                this.createPane('overlayPane', this._rotatePane);
                this.createPane('shadowPane', this._norotatePane);
                this.createPane('markerPane', this._norotatePane);
                this.createPane('tooltipPane', this._norotatePane);
                this.createPane('popupPane', this._norotatePane);
            } else {
                this.createPane('tilePane');
                this.createPane('overlayPane');
                this.createPane('shadowPane');
                this.createPane('markerPane');
                this.createPane('tooltipPane');
                this.createPane('popupPane');
            }
            if (!this.options.markerZoomAnimation) {
                L.DomUtil.addClass(panes.markerPane, 'leaflet-zoom-hide');
                L.DomUtil.addClass(panes.shadowPane, 'leaflet-zoom-hide');
            }
        },
        panInside(latlng, options) {
            if (!this._rotate || Math.abs(this._bearing).toFixed(1) < 0.1) {
                return mapProto.panInside.apply(this, arguments);
            }
            options = options || {};
            const paddingTL = L.point(options.paddingTopLeft || options.padding || [0, 0]),
                paddingBR = L.point(options.paddingBottomRight || options.padding || [0, 0]),
                rect = this._container.getBoundingClientRect(),
                pixelPoint = this.latLngToContainerPoint(latlng),
                pixelBounds = L.bounds([ L.point(rect), L.point(rect).add(this.getSize()) ]),
                pixelCenter = pixelBounds.getCenter(),
                paddedBounds = L.bounds([pixelBounds.min.add(paddingTL), pixelBounds.max.subtract(paddingBR)]),
                paddedSize = paddedBounds.getSize();
            if (!paddedBounds.contains(pixelPoint)) {
                this._enforcingBounds = true;
                const centerOffset = pixelPoint.subtract(paddedBounds.getCenter());
                const offset = paddedBounds.extend(pixelPoint).getSize().subtract(paddedSize);
                pixelCenter.x += centerOffset.x < 0 ? -offset.x : offset.x;
                pixelCenter.y += centerOffset.y < 0 ? -offset.y : offset.y;
                this.panTo(this.containerPointToLatLng(pixelCenter), options);
                this._enforcingBounds = false;
            }
            return this;
        },
        getBoundsZoom(bounds, inside, padding) {
            if (!this._rotate || Math.abs(this._bearing).toFixed(1) < 0.1) {
                return mapProto.getBoundsZoom.apply(this, arguments);
            }
            bounds = L.latLngBounds(bounds);
            padding = L.point(padding || [0, 0]);
            let zoom = this.getZoom() || 0;
            const min = this.getMinZoom(),
                    max = this.getMaxZoom(),
                    size = this.getSize().subtract(padding),
                    boundsSize = this.mapBoundsToContainerBounds(bounds).getSize(),
                    snap = this.options.zoomSnap,
                    scalex = size.x / boundsSize.x,
                    scaley = size.y / boundsSize.y,
                    scale = inside ? Math.max(scalex, scaley) : Math.min(scalex, scaley);
            zoom = this.getScaleZoom(scale, zoom);
            if (snap) {
                zoom = Math.round(zoom / (snap / 100)) * (snap / 100); // don't jump if within 1% of a snap level
                zoom = inside ? Math.ceil(zoom / snap) * snap : Math.floor(zoom / snap) * snap;
            }
            return Math.max(min, Math.min(max, zoom));
        },
        _getCenterOffset: function(latlng) {
            var centerOffset = mapProto._getCenterOffset.apply(this, arguments);
            if (this._rotate) {
                centerOffset = centerOffset.rotate(this._bearing);
            }
            return centerOffset;
        },
        _getRotatePanePos: function() {
            return this._rotatePanePos || new L.Point(0, 0);
        },
        _getNewPixelOrigin: function(center, zoom) {
            if (!this._rotate) {
                return mapProto._getNewPixelOrigin.apply(this, arguments);
            }
            var viewHalf = this.getSize()._divideBy(2);
            return this.project(center, zoom)
                .rotate(this._bearing)
                ._subtract(viewHalf)
                ._add(this._getMapPanePos())
                ._add(this._getRotatePanePos())
                .rotate(-this._bearing)
                ._round();
        },
        _getNewPixelBounds: function(center, zoom) {
            center = center || this.getCenter();
            zoom = zoom || this.getZoom();
            if (!this._rotate && mapProto._getNewPixelBounds) {
                return mapProto._getNewPixelBounds.apply(this, arguments);
            }
            var mapZoom = this._animatingZoom ? Math.max(this._animateToZoom, this.getZoom()) : this.getZoom(),
                scale = this.getZoomScale(mapZoom, zoom),
                pixelCenter = this.project(center, zoom).floor(),
                size = this.getSize(),
                halfSize = new L.Bounds([
                    this.containerPointToLayerPoint([0, 0]).floor(),
                    this.containerPointToLayerPoint([size.x, 0]).floor(),
                    this.containerPointToLayerPoint([0, size.y]).floor(),
                    this.containerPointToLayerPoint([size.x, size.y]).floor()
                ]).getSize().divideBy(scale * 2);

            return new L.Bounds(pixelCenter.subtract(halfSize), pixelCenter.add(halfSize));
        },
        _getPixelCenter: function() {
            if (!this._rotate && mapProto._getPixelCenter) {
                return mapProto._getPixelCenter.apply(this, arguments);
            }
            return this.getSize()._divideBy(2)._subtract(this._getMapPanePos());
        },
        _getPaddedPixelBounds: function(padding) {
            if (!this._rotate && mapProto._getPaddedPixelBounds) {
                return mapProto._getPaddedPixelBounds.apply(this, arguments);
            }
            var p = padding,
                size = this.getSize(),
                padMin = size.multiplyBy(-p),
                padMax = size.multiplyBy(1 + p);
            return new L.Bounds([
                this.containerPointToLayerPoint([padMin.x, padMin.y]).floor(),
                this.containerPointToLayerPoint([padMin.x, padMax.y]).floor(),
                this.containerPointToLayerPoint([padMax.x, padMin.y]).floor(),
                this.containerPointToLayerPoint([padMax.x, padMax.y]).floor()
            ]);
        },
        _handleGeolocationResponse: function(pos) {
            if (!this._container._leaflet_id) { return; }
            var lat = pos.coords.latitude,
                lng = pos.coords.longitude,
                hdg = pos.coords.heading,
                latlng = new L.LatLng(lat, lng),
                bounds = latlng.toBounds(pos.coords.accuracy),
                options = this._locateOptions;
            if (options.setView) {
                var zoom = this.getBoundsZoom(bounds);
                this.setView(latlng, options.maxZoom ? Math.min(zoom, options.maxZoom) : zoom);
            }
            var data = {
                latlng: latlng,
                bounds: bounds,
                timestamp: pos.timestamp,
                heading: hdg
            };
            for (var i in pos.coords) {
                if (typeof pos.coords[i] === 'number') {
                    data[i] = pos.coords[i];
                }
            }
            this.fire('locationfound', data);
        },
    });
    L.Map.CompassBearing = L.Handler.extend({
        initialize: function(map) {
            this._map = map;
            if ('ondeviceorientationabsolute' in window) {
                this.__deviceOrientationEvent = 'deviceorientationabsolute';
            } else if('ondeviceorientation' in window) {
                this.__deviceOrientationEvent = 'deviceorientation';
            }
            this._throttled = L.Util.throttle(this._onDeviceOrientation, 100, this);
        },
        addHooks: function() {
            if (this._map._rotate && this.__deviceOrientationEvent) {
                L.DomEvent.on(window, this.__deviceOrientationEvent, this._throttled, this);
            } else {
                this.disable();
            }
        },
        removeHooks: function() {
            if (this._map._rotate && this.__deviceOrientationEvent) {
                L.DomEvent.off(window, this.__deviceOrientationEvent, this._throttled, this);
            }
        },
        _onDeviceOrientation: function(e) {
            var angle = e.webkitCompassHeading || e.alpha;
            var deviceOrientation = 0;
            if (!e.absolute && e.webkitCompassHeading) {
                angle = 360 - angle;
            }
            if (!e.absolute && 'undefined' !== typeof window.orientation) {
                deviceOrientation = window.orientation;
            }
            this._map.setBearing(angle - deviceOrientation);
        },
    });
    L.Map.addInitHook('addHandler', 'compassBearing', L.Map.CompassBearing);
    L.Map.mergeOptions({
        trackContainerMutation: false
    });
    L.Map.ContainerMutation = L.Handler.extend({
        addHooks: function() {
            if (!this._observer) {
                this._observer = new MutationObserver(L.Util.bind(this._map.invalidateSize, this._map));
            }
            this._observer.observe(this._map.getContainer(), {
                childList: false,
                attributes: true,
                characterData: false,
                subtree: false,
                attributeFilter: ['style']
            });
        },
        removeHooks: function() {
            this._observer.disconnect();
        },
    });
    L.Map.addInitHook('addHandler', 'trackContainerMutation', L.Map.ContainerMutation);
    L.Map.mergeOptions({
        bounceAtZoomLimits: true,
    });
    L.Map.TouchGestures = L.Handler.extend({
        initialize: function(map) {
            this._map = map;
            this.rotate = !!this._map.options.touchRotate;
            this.zoom = !!this._map.options.touchZoom;
        },
        addHooks: function() {
            L.DomEvent.on(this._map._container, 'touchstart', this._onTouchStart, this);
        },
        removeHooks: function() {
            L.DomEvent.off(this._map._container, 'touchstart', this._onTouchStart, this);
        },
        _onTouchStart: function(e) {
            var map = this._map;
            if (!e.touches || e.touches.length !== 2 || map._animatingZoom || this._zooming || this._rotating) { return; }
            var p1 = map.mouseEventToContainerPoint(e.touches[0]),
                p2 = map.mouseEventToContainerPoint(e.touches[1]),
                vector = p1.subtract(p2);
            this._centerPoint = map.getSize()._divideBy(2);
            this._startLatLng = map.containerPointToLatLng(this._centerPoint);
            if (this.zoom) {
                if (map.options.touchZoom !== 'center') {
                    this._pinchStartLatLng = map.containerPointToLatLng(p1.add(p2)._divideBy(2));
                }
                this._startDist = p1.distanceTo(p2);
                this._startZoom = map.getZoom();
                this._zooming = true;
            } else {
                this._zooming = false;
            }
            if (this.rotate) {
                this._startTheta = Math.atan(vector.x / vector.y);
                this._startBearing = map.getBearing();
                if (vector.y < 0) { this._startBearing += 180; }
                this._rotating = true;
            } else {
                this._rotating = false;
            }
            this._moved = false;
            map._stop();
            L.DomEvent
                .on(document, 'touchmove', this._onTouchMove, this)
                .on(document, 'touchend touchcancel', this._onTouchEnd, this);
            L.DomEvent.preventDefault(e);
        },
        _onTouchMove: function(e) {
            if (!e.touches || e.touches.length !== 2 || !(this._zooming || this._rotating)) { return; }
            var map = this._map,
                p1 = map.mouseEventToContainerPoint(e.touches[0]),
                p2 = map.mouseEventToContainerPoint(e.touches[1]),
                vector = p1.subtract(p2),
                scale = p1.distanceTo(p2) / this._startDist,
                delta;
            if (this._rotating) {
                var theta = Math.atan(vector.x / vector.y);
                var bearingDelta = (theta - this._startTheta) * L.DomUtil.RAD_TO_DEG;
                if (vector.y < 0) { bearingDelta += 180; }
                if (bearingDelta) {
                    map.setBearing(this._startBearing - bearingDelta);
                }
            }
            if (this._zooming) {
                this._zoom = map.getScaleZoom(scale, this._startZoom);
                if (!map.options.bounceAtZoomLimits && (
                        (this._zoom < map.getMinZoom() && scale < 1) ||
                        (this._zoom > map.getMaxZoom() && scale > 1))) {
                    this._zoom = map._limitZoom(this._zoom);
                }
                if (map.options.touchZoom === 'center') {
                    this._center = this._startLatLng;
                    if (scale === 1) { return; }
                } else {
                    delta = p1._add(p2)._divideBy(2)._subtract(this._centerPoint);
                    if (scale === 1 && delta.x === 0 && delta.y === 0) { return; }
                    var alpha = -map.getBearing() * L.DomUtil.DEG_TO_RAD;
                    this._center = map.unproject(map.project(this._pinchStartLatLng).subtract(delta.rotate(alpha)));
                }
            }
            if (!this._moved) {
                map._moveStart(true, false);
                this._moved = true;
            }
            L.Util.cancelAnimFrame(this._animRequest);
            var moveFn = map._move.bind(map, this._center, this._zoom, { pinch: true, round: false }, undefined);
            this._animRequest = L.Util.requestAnimFrame(moveFn, this, true);
            L.DomEvent.preventDefault(e);
        },
        _onTouchEnd: function() {
            if (!this._moved || !(this._zooming || this._rotating)) {
                this._zooming = false;
                return;
            }
            this._zooming = false;
            this._rotating = false;
            L.Util.cancelAnimFrame(this._animRequest);
            L.DomEvent
                .off(document, 'touchmove', this._onTouchMove, this)
                .off(document, 'touchend touchcancel', this._onTouchEnd, this);
            if (this.zoom) {
                if (this._map.options.zoomAnimation) {
                    this._map._animateZoom(this._center, this._map._limitZoom(this._zoom), true, this._map.options.zoomSnap);
                } else {
                    this._map._resetView(this._center, this._map._limitZoom(this._zoom));
                }
            }
        },
    });
    L.Map.addInitHook('addHandler', 'touchGestures', L.Map.TouchGestures);
    L.Map.mergeOptions({
        touchRotate: false,
    });
    L.Map.TouchRotate = L.Handler.extend({
        addHooks: function() {
            this._map.touchGestures.enable();
            this._map.touchGestures.rotate = true;
        },
        removeHooks: function() {
            this._map.touchGestures.rotate = false;
        },
    });
    L.Map.addInitHook('addHandler', 'touchRotate', L.Map.TouchRotate);
    L.Map.mergeOptions({
        shiftKeyRotate: true,
    });
    L.Map.ShiftKeyRotate = L.Handler.extend({
        addHooks: function() {
            L.DomEvent.on(this._map._container, "wheel", this._handleShiftScroll, this);
            this._map.shiftKeyRotate.rotate = true;
        },
        removeHooks: function() {
            L.DomEvent.off(this._map._container, "wheel", this._handleShiftScroll, this);
            this._map.shiftKeyRotate.rotate = false;
        },
        _handleShiftScroll: function(e) {
            if (e.shiftKey) {
                e.preventDefault();
                this._map.scrollWheelZoom.disable();
                this._map.setBearing((this._map._bearing * L.DomUtil.RAD_TO_DEG) + Math.sign(e.deltaY) * 5);
            } else {
                this._map.scrollWheelZoom.enable();
            }
        },
    });
    L.Map.addInitHook('addHandler', 'shiftKeyRotate', L.Map.ShiftKeyRotate);
    L.Map.addInitHook(function() {
        if (this.scrollWheelZoom.enabled() && this.shiftKeyRotate.enabled()) {
            this.scrollWheelZoom.disable();
            this.scrollWheelZoom.enable();
        }
    });
    L.Map.mergeOptions({
        touchZoom: L.Browser.touch,
        bounceAtZoomLimits: false,
    });
    L.Map.TouchZoom = L.Handler.extend({
        addHooks: function() {
            L.DomUtil.addClass(this._map._container, 'leaflet-touch-zoom');
            this._map.touchGestures.enable();
            this._map.touchGestures.zoom = true;
        },
        removeHooks: function() {
            L.DomUtil.removeClass(this._map._container, 'leaflet-touch-zoom');
            this._map.touchGestures.zoom = false;
        },
    });
    L.Map.addInitHook('addHandler', 'touchZoom', L.Map.TouchZoom);
    L.Control.Rotate = L.Control.extend({
        options: {
            position: 'topleft',
            closeOnZeroBearing: true
        },
        onAdd: function(map) {
            var container = this._container = L.DomUtil.create('div', 'leaflet-control-rotate leaflet-bar');
            var arrow = this._arrow = L.DomUtil.create('span', 'leaflet-control-rotate-arrow');
            arrow.style.backgroundImage = `url("data:image/svg+xml;charset=utf-8,%3Csvg width='29' height='29' viewBox='0 0 29 29' xmlns='http://www.w3.org/2000/svg' fill='%23333'%3E%3Cpath d='M10.5 14l4-8 4 8h-8z'/%3E%3Cpath d='M10.5 16l4 8 4-8h-8z' fill='%23ccc'/%3E%3C/svg%3E")`;
            arrow.style.cursor = 'grab';
            arrow.style.display = 'block';
            arrow.style.width = '100%';
            arrow.style.height = '100%';
            arrow.style.backgroundRepeat = 'no-repeat';
            arrow.style.backgroundPosition = '50%';
            var link = this._link = L.DomUtil.create('a', 'leaflet-control-rotate-toggle', container);
            link.appendChild(arrow);
            link.href = '#';
            link.title = 'Rotate map';
            L.DomEvent
                .on(link, 'dblclick', L.DomEvent.stopPropagation)
                .on(link, 'mousedown', this._handleMouseDown, this)
                .on(link, 'click', L.DomEvent.stop)
                .on(link, 'click', this._cycleState, this)
                .on(link, 'click', this._refocusOnMap, this);
            if (!L.Browser.any3d) {
                L.DomUtil.addClass(link, 'leaflet-disabled');
            }
            this._restyle();
            map.on('rotate', this._restyle, this);
            this._follow = false;
            this._canFollow = false;
            if (this.options.closeOnZeroBearing && map.getBearing() === 0) {
                container.style.display = 'none';
            }
            return container;
        },
        onRemove: function(map) {
            map.off('rotate', this._restyle, this);
        },
        _handleMouseDown: function(e) {
            L.DomEvent.stop(e);
            this.dragging = true;
            this.dragstartX = e.pageX;
            this.dragstartY = e.pageY;
            L.DomEvent
                .on(document, 'mousemove', this._handleMouseDrag, this)
                .on(document, 'mouseup', this._handleMouseUp, this);
        },
        _handleMouseUp: function(e) {
            L.DomEvent.stop(e);
            this.dragging = false;
            L.DomEvent
                .off(document, 'mousemove', this._handleMouseDrag, this)
                .off(document, 'mouseup', this._handleMouseUp, this);
        },
        _handleMouseDrag: function(e) {
            if (!this.dragging) { return; }
            var deltaX = e.clientX - this.dragstartX;
            this._map.setBearing(deltaX);
        },
        _cycleState: function(ev) {
            if (!this._map) {
                return;
            }
            var map = this._map;
            if (!map.touchRotate.enabled()/* && !map.compassBearing.enabled()*/) {
                map.touchRotate.enable();
            } else {
                map.touchRotate.disable();
            }
            this._restyle();
        },
        _restyle: function() {
            if (!this._map.options.rotate) {
                L.DomUtil.addClass(this._link, 'leaflet-disabled');
            } else {
                var map = this._map;
                var bearing = map.getBearing();
                this._arrow.style.transform = 'rotate(' + bearing + 'deg)';
                if (bearing && this.options.closeOnZeroBearing) {
                    this._container.style.display = 'block';
                }
                if (map.touchRotate.enabled()) {
                    this._link.style.backgroundColor = 'orange';
                } else {
                    this._link.style.backgroundColor = 'grey';
                    if (0 === bearing && this.options.closeOnZeroBearing) {
                        this._container.style.display = 'none';
                    }
                }
            }
        },
    });
    L.control.rotate = function(options) {
        return new L.Control.Rotate(options);
    };
    L.Map.mergeOptions({
        rotateControl: true,
    });
    L.Map.addInitHook(function() {
        if (this.options.rotateControl) {
            var options = typeof this.options.rotateControl === 'object' ? this.options.rotateControl : {};
            this.rotateControl = L.control.rotate(options);
            this.addControl(this.rotateControl);
        }
    });
}));
//# sourceMappingURL=leaflet-rotate-src.js.map 0.2.8

  /* ピッチインピッチアウトによる拡大縮小を禁止 */
  document.documentElement.addEventListener('touchstart', function (e) {
  if (e.touches.length >= 2) {e.preventDefault();}
  },  {passive: false} );

  /* ダブルタップによる拡大を禁止 */
  var t = 0;
  document.documentElement.addEventListener('touchend', function (e) {
  var now = new Date().getTime();
  if ((now - t) < 350){
    e.preventDefault();
  }
  t = now;
  }, false);
