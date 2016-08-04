angular.module("dias.annotations",["dias.api","dias.ui"]),angular.module("dias.annotations").config(["$compileProvider",function(t){"use strict";t.debugInfoEnabled(!1)}]),angular.module("dias.annotations").directive("annotationListItem",["annotations","mapAnnotations","USER_ID",function(t,e,n){"use strict";return{controller:["$scope","$element",function(o,i){var a=!1,r=o.a.annotation,l=o.a.label,s=function(){return e.isAnnotationSelected(o.a.annotation)};o.getUsername=function(){return l.user?l.user.firstname+" "+l.user.lastname:"(user deleted)"},o.getClass=function(){return{selected:a}},o.getShapeClass=function(){return"icon-"+o.a.shape.toLowerCase()},o.select=function(t){e.toggleSelect(o.a.annotation,t.shiftKey),o.keepElementPosition(i)},o.zoomTo=function(){e.fit(o.a.annotation)},o.canBeRemoved=function(){return l.user&&l.user.id===n},o.remove=function(n){n.stopPropagation(),r.labels.length>1?t.removeAnnotationLabel(r,l):1===r.labels.length&&confirm("Detaching the last label will delete the annotation. Proceed?")&&e.deleteAnnotation(r)},o.$watch(s,function(t){a=t,a?o.shouldBeVisible(i):o.shouldNotBeVisible(i)}),i.on("$destroy",function(){o.shouldNotBeVisible(i)})}]}}]),angular.module("dias.annotations").directive("labelCategoryItem",["$compile","$timeout","$templateCache",function(t,e,n){"use strict";return{restrict:"C",templateUrl:"label-item.html",scope:!0,link:function(o,i,a){var r=angular.element(n.get("label-subtree.html"));e(function(){i.append(t(r)(o))})},controller:["$scope","labels",function(t,e){var n=!1,o=!1,i=!1,a=function(){e.isOpen(t.item)?(n=!0,i=!1):e.isSelected(t.item)?(n=!0,i=!0):(n=!1,i=!1)},r=function(){o=t.tree&&!!t.tree[t.item.id]};t.getSubtree=function(){return n&&t.tree?t.tree[t.item.id]:[]},t.getClass=function(){return{open:n,expandable:o,selected:i}},t.$on("categories.selected",a),a(),r()}]}}]),angular.module("dias.annotations").directive("labelItem",function(){"use strict";return{controller:["$scope",function(t){var e=t.annotationLabel.confidence;.25>=e?t["class"]="label-danger":.5>=e?t["class"]="label-warning":.75>=e?t["class"]="label-success":t["class"]="label-primary"}]}}),angular.module("dias.annotations").directive("labelsListItem",["mapAnnotations",function(t){"use strict";return{restrict:"A",controller:["$scope",function(e){var n=!1,o=function(){for(var n=e.item.annotations,o=n.length-1;o>=0;o--)if(t.isAnnotationSelected(n[o].annotation))return!0;return!1},i=function(){return n||o()};e.getClass=function(){return{selected:i()}},e.isSelected=i,e.toggleOpen=function(){n=!n}}]}}]),angular.module("dias.annotations").factory("AnnotationFilters",function(){"use strict";return{label:function(t){return function(e){var n={};e.groupedByLabel.hasOwnProperty(t)&&(n[t]=e.groupedByLabel[t]);var o=e.flat.filter(function(e){return e.labels=e.labels.filter(function(e){return e.label.id===t}),e.labels.length>0});return{groupedByLabel:n,flat:o}}},user:function(t){return function(e){var n,o=e.groupedByLabel;for(var i in o)if(o.hasOwnProperty(i)){n=o[i].annotations;for(var a=n.length-1;a>=0;a--)n[a].label.user.id!==t&&n.splice(a,1);0===n.length&&delete o[i]}var r=e.flat.filter(function(e){return e.labels=e.labels.filter(function(e){return e.user.id===t}),e.labels.length>0});return{groupedByLabel:o,flat:r}}},shape:function(t){return function(e){var n,o=e.groupedByLabel;for(var i in o)if(o.hasOwnProperty(i)){n=o[i].annotations;for(var a=n.length-1;a>=0;a--)n[a].annotation.shape_id!==t&&n.splice(a,1);0===n.length&&delete o[i]}var r=e.flat.filter(function(e){return e.shape_id===t});return{groupedByLabel:o,flat:r}}}}}),angular.module("dias.annotations").factory("AttachLabelInteraction",["annotations","labels","msg",function(t,e,n){"use strict";function o(t){ol.interaction.Pointer.call(this,{handleUpEvent:o.handleUpEvent,handleDownEvent:o.handleDownEvent,handleMoveEvent:o.handleMoveEvent}),this.features=void 0!==t.features?t.features:null,this.currentFeature=void 0}return ol.inherits(o,ol.interaction.Pointer),o.handleDownEvent=function(t){return this.currentFeature=this.featuresAtPixel(t.pixel,t.map),!!this.currentFeature},o.handleUpEvent=function(n){this.currentFeature&&this.currentFeature.annotation&&e.hasSelected()&&t.attachAnnotationLabel(this.currentFeature.annotation),this.currentFeature=void 0},o.handleMoveEvent=function(t){var e=t.map.getTargetElement(),n=this.featuresAtPixel(t.pixel,t.map);n?e.style.cursor="pointer":e.style.cursor=""},o.prototype.featuresAtPixel=function(t,e){var n=null,o=e.forEachFeatureAtPixel(t,function(t){return t},this);return this.handlesFeature(o)&&(n=o),n},o.prototype.handlesFeature=function(t){return this.features?-1!==this.features.getArray().indexOf(t):!1},o}]),angular.module("dias.annotations").factory("ZoomToNativeControl",function(){"use strict";function t(t){var e=t||{},n=e.label?e.label:"1",o=document.createElement("button"),i=this;o.innerHTML=n,o.title="Zoom to original resolution",o.addEventListener("click",function(){i.zoomToNative.call(i)});var a=document.createElement("div");a.className="zoom-to-native ol-unselectable ol-control",a.appendChild(o),ol.control.Control.call(this,{element:a,target:e.target}),this.duration_=void 0!==e.duration?e.duration:250}return ol.inherits(t,ol.control.Control),t.prototype.zoomToNative=function(){var t=this.getMap(),e=t.getView();if(e){var n=e.getResolution();n&&(this.duration_>0&&t.beforeRender(ol.animation.zoom({resolution:n,duration:this.duration_,easing:ol.easing.easeOut})),e.setResolution(e.constrainResolution(1)))}},t}),angular.module("dias.annotations").factory("map",["ZoomToNativeControl",function(t){"use strict";var e=new ol.Map({target:"canvas",renderer:"canvas",controls:[new ol.control.Zoom,new ol.control.ZoomToExtent({tipLabel:"Zoom to show whole image",label:""}),new ol.control.FullScreen({label:""}),new t({label:""})],interactions:ol.interaction.defaults({keyboard:!1})});return e}]),angular.module("dias.annotations").controller("AnnotationFilterController",["$scope","annotations","AnnotationFilters",function(t,e,n){"use strict";var o=function(){t.selected.input=null,e.hasActiveFilters()&&(e.clearActiveFilters(),e.refreshFiltering())};t.available={filters:[{name:"label",typeahead:e.getAvailableLabels,create:n.label},{name:"user",typeahead:function(){var t=e.getAvailableUsers();return t.map(function(t){return t=angular.copy(t),t.name=t.firstname+" "+t.lastname,t})},create:n.user},{name:"shape",typeahead:e.getAvailableShapes,create:n.shape}]},t.selected={filter:t.available.filters[0],input:null},t.getTypeaheadItems=function(){return t.selected.filter.typeahead()},t.selectFilter=function(n){e.setFilter(t.selected.filter.create(n.id)),e.refreshFiltering()},t.$on("$destroy",o)}]),angular.module("dias.annotations").controller("AnnotationsController",["$scope","$element","annotations","mapAnnotations","$timeout",function(t,e,n,o,i){"use strict";var a=e[0],r=[],l=function(){if(0!==r.length){for(var t,e=a.scrollTop,n=a.offsetHeight,o=1/0,i=0,l=r.length-1;l>=0;l--)t=r[l],o=Math.min(t.offsetTop,o),i=Math.max(t.offsetTop+t.offsetHeight,i);e>o?a.scrollTop=o:i>e+n&&(n>=i-o?a.scrollTop=i-a.offsetHeight:a.scrollTop=o)}};t.shouldBeVisible=function(t){-1===r.indexOf(t[0])&&r.push(t[0])},t.shouldNotBeVisible=function(t){var e=r.indexOf(t[0]);-1!==e&&r.splice(e,1)},t.keepElementPosition=function(t){var e=t[0].offsetTop-a.scrollTop;i(function(){var n=t[0].offsetTop-a.scrollTop;a.scrollTop+=n-e})},t.getAnnotations=n.getGroupedByLabel,o.onSelectedAnnotation(l)}]),angular.module("dias.annotations").controller("AnnotatorController",["$scope","images","urlParams","msg","IMAGE_ID","keyboard","viewport",function(t,e,n,o,i,a,r){"use strict";var l=document.querySelector(".navbar-annotations-filename");t.imageLoading=!0;var s=function(t){return l.innerHTML=t._filename,t},c=function(e){return t.imageLoading=!1,t.$broadcast("image.shown",e),e},u=function(t){return n.setSlug(t._id),t},f=function(){t.imageLoading=!0},d=function(t){return f(),e.show(t).then(c)["catch"](o.responseError)};t.nextImage=function(){return f(),e.next().then(s).then(c).then(u)["catch"](o.responseError)},t.prevImage=function(){return f(),e.prev().then(s).then(c).then(u)["catch"](o.responseError)},t.$on("canvas.moveend",function(t,e){r.set(e)}),a.on(37,function(){t.prevImage(),t.$apply()}),a.on(39,function(){t.nextImage(),t.$apply()}),a.on(32,function(){t.nextImage(),t.$apply()}),e.init(),d(parseInt(i)).then(u)}]),angular.module("dias.annotations").controller("CanvasController",["$scope","mapImage","mapAnnotations","map","$timeout","debounce","annotations",function(t,e,n,o,i,a,r){"use strict";var l=o.getView();o.on("moveend",function(e){var n=function(){t.$emit("canvas.moveend",{center:l.getCenter(),zoom:l.getZoom()})};a(n,100,"annotator.canvas.moveend")}),o.on("change:view",function(){l=o.getView()}),t.$on("image.shown",e.renderImage),n.init(t),t.$on("image.shown",function(t,e){r.load(e._id)});var s=function(){i(function(){o.updateSize()},50,!1)};t.$on("sidebar.foldout.open",s),t.$on("sidebar.foldout.close",s)}]),angular.module("dias.annotations").controller("CategoriesController",["$scope","labels","keyboard",function(t,e,n){"use strict";var o=9,i="dias.annotations.label-favourites",a=function(){var e=t.favourites.map(function(t){return t.id});window.localStorage[i]=JSON.stringify(e)},r=function(){if(window.localStorage[i]){var e=JSON.parse(window.localStorage[i]);t.favourites=t.categories.filter(function(t){return-1!==e.indexOf(t.id)})}},l=function(e){e>=0&&e<t.favourites.length&&t.selectItem(t.favourites[e])};t.hotkeysMap=["𝟭","𝟮","𝟯","𝟰","𝟱","𝟲","𝟳","𝟴","𝟵"],t.categories=[],t.favourites=[],t.categories=e.getList(),t.categoriesTree=e.getTree(),r(),t.selectItem=function(n){e.setSelected(n),t.searchCategory="",t.$broadcast("categories.selected")},t.isFavourite=function(e){return-1!==t.favourites.indexOf(e)},t.toggleFavourite=function(e,n){e.stopPropagation();var i=t.favourites.indexOf(n);-1===i&&t.favourites.length<o?t.favourites.push(n):t.favourites.splice(i,1),a()},t.favouritesLeft=function(){return t.favourites.length<o},n.on("1",function(){l(0),t.$apply()}),n.on("2",function(){l(1),t.$apply()}),n.on("3",function(){l(2),t.$apply()}),n.on("4",function(){l(3),t.$apply()}),n.on("5",function(){l(4),t.$apply()}),n.on("6",function(){l(5),t.$apply()}),n.on("7",function(){l(6),t.$apply()}),n.on("8",function(){l(7),t.$apply()}),n.on("9",function(){l(8),t.$apply()})}]),angular.module("dias.annotations").controller("ConfidenceController",["$scope","labels",function(t,e){"use strict";t.confidence=1,t.$watch("confidence",function(n){e.setCurrentConfidence(parseFloat(n)),.25>=n?t.confidenceClass="label-danger":.5>=n?t.confidenceClass="label-warning":.75>=n?t.confidenceClass="label-success":t.confidenceClass="label-primary"})}]),angular.module("dias.annotations").controller("DrawingControlsController",["$scope","mapAnnotations","labels","msg","$attrs","keyboard",function(t,e,n,o,i,a){"use strict";var r;t.selectShape=function(a){if(null===a||t.isSelected(a))e.finishDrawing(),r=void 0;else{if(!n.hasSelected())return t.$emit("sidebar.foldout.do-open","categories"),void o.info(i.selectCategory);e.startDrawing(a),r=a}},t.isSelected=function(t){return r===t},a.on(27,function(){t.selectShape(null),t.$apply()}),a.on("a",function(){t.selectShape("Point"),t.$apply()}),a.on("s",function(){t.selectShape("Rectangle"),t.$apply()}),a.on("d",function(){t.selectShape("Circle"),t.$apply()}),a.on("f",function(){t.selectShape("LineString"),t.$apply()}),a.on("g",function(){t.selectShape("Polygon"),t.$apply()})}]),angular.module("dias.annotations").controller("EditControlsController",["$scope","mapAnnotations","keyboard","$timeout","labels","msg","mapInteractions",function(t,e,n,o,i,a,r){"use strict";var l,s=!1,c=1e4;t.deleteSelectedAnnotations=function(){e.hasSelectedFeatures()&&confirm("Are you sure you want to delete all selected annotations?")&&e.deleteSelected()},t.hasSelectedAnnotations=e.hasSelectedFeatures;var u=function(){r.activate("translate")},f=function(){r.deactivate("translate")},d=function(){r.activate("attachLabel")},g=function(){r.deactivate("attachLabel")};t.toggleMoving=function(){t.isMoving()?f():u()},t.toggleAttaching=function(){t.isAttaching()?g():i.hasSelected()?d():(t.$emit("sidebar.foldout.do-open","categories"),a.info("Please select a label to attach to the annotations."))},t.canDeleteLastAnnotation=function(){return s&&e.hasDrawnAnnotation()},t.deleteLastDrawnAnnotation=function(){e.deleteLastDrawnAnnotation()},t.isMoving=function(){return r.active("translate")},t.isAttaching=function(){return r.active("attachLabel")},t.$on("annotations.drawn",function(t,e){s=!0,o.cancel(l),l=o(function(){s=!1},c)}),n.on(46,function(e){t.deleteSelectedAnnotations(),t.$apply()}),n.on(27,function(){t.isMoving()&&t.$apply(f)}),n.on(8,function(e){t.canDeleteLastAnnotation()&&(e.preventDefault(),t.deleteLastDrawnAnnotation(),t.$apply())}),n.on("m",function(){t.$apply(t.toggleMoving)}),n.on("l",function(){t.$apply(t.toggleAttaching)})}]),angular.module("dias.annotations").controller("FiltersControlController",["$scope","mapImage",function(t,e){"use strict";t.supportsFilters=e.supportsFilters}]),angular.module("dias.annotations").controller("FiltersController",["$scope","debounce","mapImage",function(t,e,n){"use strict";var o="dias.annotations.filter",i=!1,a={brightnessContrast:[0,0],brightnessRGB:[0,0,0],hueSaturation:[0,0],vibrance:[0]};t.filters={brightnessContrast:[0,0],brightnessRGB:[0,0,0],hueSaturation:[0,0],vibrance:[0]};var r=function(){n.filter(t.filters)};t.reset=function(e,n){void 0===e?(t.filters=angular.copy(a),r()):a.hasOwnProperty(e)&&(t.filters[e][n]=a[e][n],r())},t.toggleBrightnessRGB=function(){i?t.filters.brightnessRGB=angular.copy(a.brightnessRGB):t.filters.brightnessContrast[0]=a.brightnessContrast[0],i=!i,r()},t.isBrightnessRgbActive=function(){return i},t.$watch("filters",function(t){e(r,100,o)},!0)}]),angular.module("dias.annotations").controller("MinimapController",["$scope","map","mapImage","$element","styles",function(t,e,n,o,i){"use strict";var a=o[0],r=new ol.source.Vector,l=new ol.Map({target:a,controls:[],interactions:[]}),s=e.getSize(),c=e.getView();l.addLayer(n.getLayer()),l.addLayer(new ol.layer.Vector({source:r,style:i.viewport}));var u=new ol.Feature;r.addFeature(u),t.$on("image.shown",function(){var t=n.getExtent();l.setView(new ol.View({projection:n.getProjection(),center:ol.extent.getCenter(t),resolution:Math.max(t[2]/a.clientWidth,t[3]/a.clientHeight)}))});var f=function(){u.setGeometry(ol.geom.Polygon.fromExtent(c.calculateExtent(s)))};e.on("change:size",function(){s=e.getSize()}),e.on("change:view",function(){c=e.getView()}),e.on("postcompose",f);var d=function(t){c.setCenter(t.coordinate)};l.on("pointerdrag",d),o.on("mouseleave",function(){l.un("pointerdrag",d)}),o.on("mouseenter",function(){l.on("pointerdrag",d)})}]),angular.module("dias.annotations").controller("SelectedLabelController",["$scope","labels",function(t,e){"use strict";t.getSelectedLabel=e.getSelected,t.hasSelectedLabel=e.hasSelected}]),angular.module("dias.annotations").controller("SettingsAnnotationOpacityController",["$scope","mapAnnotations",function(t,e){"use strict";t.setDefaultSettings("annotation_opacity","1"),t.$watch("settings.annotation_opacity",function(t){e.setOpacity(t)})}]),angular.module("dias.annotations").controller("SettingsAnnotationsCyclingController",["$scope","mapAnnotations","annotations","labels","keyboard",function(t,e,n,o,i){"use strict";var a=!1,r="annotations",l=function(n){return!a&&t.cycling()?(e.hasNext()?e.cycleNext():(t.nextImage().then(e.jumpToFirst),a=!0),n&&t.$apply(),!1):void 0},s=function(n){return!a&&t.cycling()?(e.hasPrevious()?e.cyclePrevious():(t.prevImage().then(e.jumpToLast),a=!0),n&&t.$apply(),!1):void 0},c=function(i){a||(i&&i.preventDefault(),t.cycling()&&o.hasSelected()?n.attachAnnotationLabel(e.getCurrent()).$promise.then(function(){e.flicker(1)}):e.flicker())},u=function(e){return e.preventDefault(),t.stopCycling(),t.$apply(),!1};t.attributes={restrict:!1},t.cycling=function(){return t.getVolatileSettings("cycle")===r},t.startCycling=function(){t.setVolatileSettings("cycle",r)},t.stopCycling=function(){t.setVolatileSettings("cycle","")},t.$watch("volatileSettings.cycle",function(t,o){t===r?(i.on(37,s,10),i.on(39,l,10),i.on(32,l,10),i.on(13,c,10),i.on(27,u,10),e.jumpToCurrent(),n.observeFilter(e.jumpToFirst)):o===r&&(i.off(37,s),i.off(39,l),i.off(32,l),i.off(13,c),i.off(27,u),e.clearSelection(),n.unobserveFilter(e.jumpToFirst))}),t.$on("image.shown",function(){a=!1}),t.prevAnnotation=s,t.nextAnnotation=l,t.attachLabel=c}]),angular.module("dias.annotations").controller("SettingsController",["$scope","debounce",function(t,e){"use strict";var n="dias.annotations.settings",o={};t.settings={},t.volatileSettings={};var i=function(){var e=angular.copy(t.settings);for(var i in e)e[i]===o[i]&&delete e[i];window.localStorage[n]=JSON.stringify(e)},a=function(){e(i,250,n)},r=function(){var t={};return window.localStorage[n]&&(t=JSON.parse(window.localStorage[n])),angular.extend(t,o)};t.setSettings=function(e,n){t.settings[e]=n},t.getSettings=function(e){return t.settings[e]},t.setDefaultSettings=function(e,n){o[e]=n,t.settings.hasOwnProperty(e)||t.setSettings(e,n)},t.setVolatileSettings=function(e,n){t.volatileSettings[e]=n},t.getVolatileSettings=function(e){return t.volatileSettings[e]},t.$watch("settings",a,!0),angular.extend(t.settings,r())}]),angular.module("dias.annotations").controller("SettingsSectionCyclingController",["$scope","map","mapImage","keyboard",function(t,e,n,o){"use strict";var i,a=!1,r="sections",l=[0,0],s=[0,0],c=[0,0],u=[0,0],f=function(t,e){return Math.sqrt(Math.pow(t[0]-e[0],2)+Math.pow(t[1]-e[1],2))},d=function(t){for(var e=1/0,n=0,o=[0,0],i=0;i<=c[1];i++)for(var a=0;a<=c[0];a++)n=f(t,y([a,i])),e>n&&(o[0]=a,o[1]=i,e=n);return o},g=function(){i=e.getView(),i.on("change:resolution",h);var t=n.getExtent(),o=i.calculateExtent(e.getSize());s[0]=o[2]-o[0],s[1]=o[3]-o[1],l[0]=s[0]/2,l[1]=s[1]/2,c[0]=Math.ceil(t[2]/s[0])-1,c[1]=Math.ceil(t[3]/s[1])-1;var a;c[0]>0?(a=s[0]*(c[0]+1)-t[2],s[0]-=a/c[0]):(s[0]=o[2],l[0]=t[2]/2),c[1]>0?(a=s[1]*(c[1]+1)-t[3],s[1]-=a/c[1]):(s[1]=o[3],l[1]=t[3]/2)},h=function(){g();var t=d(y(u));u[0]=t[0],u[1]=t[1]},p=function(){g(),b(d(i.getCenter()))},v=function(){b([0,0])},m=function(){b(c)},y=function(t){return[t[0]*s[0]+l[0],t[1]*s[1]+l[1]]},b=function(t){u[0]=t[0],u[1]=t[1],i.setCenter(y(u))},w=function(){return u[0]<c[0]?[u[0]+1,u[1]]:[0,u[1]+1]},S=function(){return u[0]>0?[u[0]-1,u[1]]:[c[0],u[1]-1]},$=function(e){return!a&&t.cycling()?(u[0]<c[0]||u[1]<c[1]?b(w()):(t.nextImage().then(g).then(v),a=!0),e&&t.$apply(),!1):void 0},C=function(e){return!a&&t.cycling()?(u[0]>0||u[1]>0?b(S()):(t.prevImage().then(g).then(m),a=!0),e&&t.$apply(),!1):void 0},A=function(e){return e.preventDefault(),t.stopCycling(),t.$apply(),!1};t.cycling=function(){return t.getVolatileSettings("cycle")===r},t.startCycling=function(){t.setVolatileSettings("cycle",r)},t.stopCycling=function(){t.setVolatileSettings("cycle","")},t.$watch("volatileSettings.cycle",function(t,n){t===r?(e.on("change:size",p),g(),v(),o.on(37,C,10),o.on(39,$,10),o.on(32,$,10),o.on(27,A,10)):n===r&&(e.un("change:size",p),i.un("change:resolution",h),o.off(37,C),o.off(39,$),o.off(32,$),o.off(27,A))}),t.$on("image.shown",function(){a=!1}),t.prevSection=C,t.nextSection=$}]),angular.module("dias.annotations").controller("SidebarCategoryFoldoutController",["$scope","keyboard",function(t,e){"use strict";e.on(9,function(e){e.preventDefault(),t.toggleFoldout("categories"),t.$apply()})}]),angular.module("dias.annotations").controller("SidebarController",["$scope","$rootScope",function(t,e){"use strict";var n="dias.annotations.sidebar-foldout",o=!1;t.toggleAnnotationFilter=function(){o=!o},t.isAnnotationFilterOpen=function(){return o},t.foldout="",t.openFoldout=function(o){window.localStorage[n]=o,t.foldout=o,e.$broadcast("sidebar.foldout.open",o)},t.closeFoldout=function(){window.localStorage.removeItem(n),t.foldout="",e.$broadcast("sidebar.foldout.close")},t.toggleFoldout=function(e){t.foldout===e?t.closeFoldout():t.openFoldout(e)},e.$on("sidebar.foldout.do-open",function(e,n){t.openFoldout(n)}),window.localStorage[n]&&t.openFoldout(window.localStorage[n])}]),angular.module("dias.annotations").service("annotations",["Annotation","shapes","msg","AnnotationLabel","labels",function(t,e,n,o,i){"use strict";var a,r,l=this,s=[],c=[],u={},f={groupedByLabel:{},flat:[]},d=[],g=[],h=[],p={},v=function(t,e,n){for(var o=t.length-1;o>=0;o--)if(t[o].id===e)return n(t[o],o)},m=function(t){return t.shape=e.getName(t.shape_id),t},y=function(t){return a.push(t),w(t,t.labels[0]),t},b=function(t){var e=a.indexOf(t);return a.splice(e,1),$(t),t},w=function(t,e){var n={annotation:t,label:e,shape:t.shape},o=e.label;u.hasOwnProperty(o.id)?u[o.id].annotations.push(n):u[o.id]={label:o,annotations:[n]}},S=function(t,e){for(var n=u[e.id].annotations,o=n.length-1;o>=0;o--)if(n[o].annotation.id===t.id){n.splice(o,1);break}0===n.length&&delete u[e.id]},$=function(t){for(var e in u)u.hasOwnProperty(e)&&S(t,u[e].label)},C=function(){for(var t in u)u.hasOwnProperty(t)&&delete u[t]},A=function(t){for(var e,n,o=t.length-1;o>=0;o--){e=t[o],n=e.labels;for(var i=n.length-1;i>=0;i--)w(e,n[i])}},L=function(t){for(var e={groupedByLabel:angular.copy(u),flat:angular.copy(a)},n=d.length-1;n>=0;n--)e=d[n](e);f.groupedByLabel=e.groupedByLabel,f.flat=e.flat,t||s.forEach(function(t){t(f.flat)})},F=function(){g.length=0;for(var t in u)u.hasOwnProperty(t)&&g.push(u[t].label)},I=function(){h.length=0;var t={};a.forEach(function(e){e.labels.forEach(function(e){t.hasOwnProperty(e.user.id)||(t[e.user.id]=1,h.push(e.user))})})},x=function(t){I(),F(),L(t===!0)};this.get=function(){return f.flat},this.getGroupedByLabel=function(){return f.groupedByLabel},this.load=function(e){C(),p.hasOwnProperty(e)?a=p[e]:(a=t.query({id:e}),p[e]=a,a.$promise.then(function(t){t.forEach(m)})),x(),r=a.$promise.then(A).then(x).then(l.get)},this.add=function(o){!o.shape_id&&o.shape&&(o.shape_id=e.getId(o.shape));var i=t.add(o);return i.$promise["catch"](n.responseError).then(m).then(y).then(x),i},this["delete"]=function(t){return v(a,t.id,function(t){return t.$delete()["catch"](n.responseError).then(b).then(x)})},this.getPromise=function(){return r},this.attachAnnotationLabel=function(t,e,r){e=e||i.getSelected(),r=r||i.getCurrentConfidence();var l=o.attach({annotation_id:t.id,label_id:e.id,confidence:r},function(){v(a,t.id,function(t){t.labels.push(l),w(t,l),x(!0)})},n.responseError);return l},this.removeAnnotationLabel=function(t,e){return o["delete"]({id:e.id},function(){v(a,t.id,function(t){v(t.labels,e.id,function(e,n){t.labels.splice(n,1)}),S(t,e.label),x()})},n.responseError)},this.setFilter=function(t){l.clearActiveFilters(),d.push(t)},this.refreshFiltering=function(){L(),c.forEach(function(t){t()})},this.clearActiveFilters=function(){d.length=0},this.hasActiveFilters=function(){return d.length>0},this.getAvailableLabels=function(){return g},this.getAvailableUsers=function(){return h},this.getAvailableShapes=e.getAll,this.observe=function(t){s.push(t)},this.observeFilter=function(t){c.push(t)},this.unobserveFilter=function(t){var e=c.indexOf(t);-1!==e&&c.splice(e,1)}}]),angular.module("dias.annotations").service("images",["$rootScope","URL","$q","filterSubset","TRANSECT_ID","IMAGES_IDS","IMAGES_FILENAMES",function(t,e,n,o,i,a,r){"use strict";var l=this,s=[],c=5,u=[];this.currentImage=void 0;var f=function(t){var e=a.indexOf(t);return r[e]},d=function(t){t=t||l.currentImage._id;var e=s.indexOf(t);return s[(e+1)%s.length]},g=function(t){t=t||l.currentImage._id;var e=s.indexOf(t),n=s.length;return s[(e-1+n)%n]},h=function(t){t=t||l.currentImage._id;for(var e=u.length-1;e>=0;e--)if(u[e]._id==t)return u[e]},p=function(t){return l.currentImage=t,t},v=function(o){var i=n.defer(),a=h(o);return a?i.resolve(a):(a=document.createElement("img"),a._id=o,a._filename=f(o),a.onload=function(){u.push(a),u.length>c&&u.shift(),i.resolve(a)},a.onerror=function(t){i.reject(t)},a.src=e+"/api/v1/images/"+o+"/file"),t.$broadcast("image.fetching",a),i.promise},m=function(t){return v(d(t._id)),v(g(t._id)),t};this.init=function(){s=a;var t=window.localStorage["dias.transects."+i+".images"];t&&(t=JSON.parse(t),o(t,s),s=t)},this.show=function(t){return v(t).then(p).then(m)},this.next=function(){return l.show(d())},this.prev=function(){return l.show(g())},this.getCurrentId=function(){return l.currentImage._id}}]),angular.module("dias.annotations").service("labels",["AnnotationLabel","LABEL_TREES",function(t,e){"use strict";var n,o=1,i=e,a={},r=[],l=[],s=function(){for(var t=null,e=function(e){var n=e.parent_id;a[t][n]?a[t][n].push(e):a[t][n]=[e]},n=i.length-1;n>=0;n--)t=i[n].name,a[t]={},i[n].labels.forEach(e),r=r.concat(i[n].labels)},c=function(t){for(var e=r.length-1;e>=0;e--)if(r[e].id===t)return r[e];return null},u=function(t){var e=t;if(l.length=0,e)for(;null!==e.parent_id;)l.unshift(e.parent_id),e=c(e.parent_id)};this.fetchForAnnotation=function(e){return e?(e.labels||(e.labels=t.query({annotation_id:e.id})),e.labels):void 0},this.getTree=function(){return a},this.getList=function(){return r},this.setSelected=function(t){n=t,u(t)},this.getSelected=function(){return n},this.hasSelected=function(){return!!n},this.getSelectedId=function(){return n?n.id:null},this.setCurrentConfidence=function(t){o=t},this.getCurrentConfidence=function(){return o},this.isOpen=function(t){return-1!==l.indexOf(t.id)},this.isSelected=function(t){return n&&n.id===t.id},s()}]),angular.module("dias.annotations").service("mapAnnotations",["map","images","annotations","debounce","styles","$interval","labels","mapInteractions",function(t,e,n,o,i,a,r,l){"use strict";var s=new ol.Collection,c=new ol.source.Vector({features:s}),u=new ol.layer.Vector({source:c,style:i.features,zIndex:100,updateWhileAnimating:!0,updateWhileInteracting:!0});t.addLayer(u);var f=l.init("select",[u]).getFeatures();l.init("modify",s),l.deactivate("modify"),l.init("translate",f),l.deactivate("translate"),l.init("attachLabel",s),l.deactivate("attachLabel");var d,g,h=0,p={padding:[50,50,50,50],minResolution:1},v=this,m=function(e){v.clearSelection(),e&&(f.push(e),t.getView().fit(e.getGeometry(),t.getSize(),p))},y=function(t,n){return n%2===1?e.currentImage.height-t:t},b=function(t){var e;switch(t.getType()){case"Circle":e=[t.getCenter(),[t.getRadius()]];break;case"Polygon":case"Rectangle":e=t.getCoordinates()[0];break;case"Point":e=[t.getCoordinates()];break;default:e=t.getCoordinates()}return Array.prototype.concat.apply([],e).map(Math.round).map(y)},w=function(t){var e=t.target,n=function(){e.annotation.points=b(e.getGeometry()),e.annotation.$save()};o(n,500,e.annotation.id)},S=function(t){for(var n,o=t.points,i=[],a=e.currentImage.height,r=0;r<o.length;r+=2)i.push([o[r],a-(o[r+1]||0)]);switch(t.shape){case"Point":n=new ol.geom.Point(i[0]);break;case"Rectangle":n=new ol.geom.Rectangle([i]);break;case"Polygon":n=new ol.geom.Polygon([i]);break;case"LineString":n=new ol.geom.LineString(i);break;case"Circle":n=new ol.geom.Circle(i[0],i[1][0]);break;default:return void console.error("Unknown annotation shape: "+t.shape)}var l=new ol.Feature({geometry:n});l.annotation=t,t.labels&&t.labels.length>0&&(l.color=t.labels[0].label.color),l.on("change",w),c.addFeature(l)},$=function(t){c.clear(),v.clearSelection(),d=null,t.forEach(S)};n.observe($);var C=function(t){var o=t.feature.getGeometry(),i=r.getSelected();return t.feature.color=i.color,t.feature.annotation=n.add({id:e.getCurrentId(),shape:o.getType(),points:b(o),label_id:i.id,confidence:r.getCurrentConfidence()}),t.feature.annotation.$promise["catch"](function(){c.removeFeature(t.feature)}),t.feature.on("change",w),d=t.feature,t.feature.annotation.$promise},A=function(t){t&&t.annotation&&(t===d&&(d=null),n["delete"](t.annotation))},L=function(t){for(var e=s.getArray(),n=e.length-1;n>=0;n--)if(e[n].annotation.id===t.id)return e[n];return null};this.init=function(t){g=t,v.onSelectedAnnotation(function(){t.$$phase||t.$apply()})},this.startDrawing=function(t){l.init("draw",t,c),l.on("draw","drawend",C),l.on("draw","drawend",function(t){g.$broadcast("annotations.drawn",t.feature)})},this.finishDrawing=function(){l.deactivate("draw")},this.hasDrawnAnnotation=function(){return d&&d.annotation&&d.annotation.$resolved},this.deleteLastDrawnAnnotation=function(){A(d)},this.deleteSelected=function(){f.forEach(A)},this.deleteAnnotation=function(t){A(L(t))},this.toggleSelect=function(t,e){var n=L(t);n&&(f.remove(n)||(e||v.clearSelection(),f.push(n)))},this.hasSelectedFeatures=function(){return f.getLength()>0},this.onSelectedAnnotation=function(t){return l.on("select","select",t)},this.offSelectedAnnotation=function(t){return l.un("select","select",t)},this.fit=function(e){var n=L(e);if(n){var o=t.getView(),i=ol.animation.pan({source:o.getCenter()}),a=ol.animation.zoom({resolution:o.getResolution()});t.beforeRender(i,a),o.fit(n.getGeometry(),t.getSize(),p)}},this.isAnnotationSelected=function(t){for(var e=f.getArray(),n=e.length-1;n>=0;n--)if(e[n].annotation&&e[n].annotation.id===t.id)return!0;return!1},this.clearSelection=function(){f.clear()},this.getSelectedFeatures=function(){return f},this.addFeature=function(t){return c.addFeature(t),C({feature:t})},this.setOpacity=function(t){u.setOpacity(t)},this.cycleNext=function(){h=(h+1)%s.getLength(),v.jumpToCurrent()},this.hasNext=function(){return h+1<s.getLength()},this.cyclePrevious=function(){var t=s.getLength();h=(h+t-1)%t,v.jumpToCurrent()},this.hasPrevious=function(){return h>0},this.jumpToCurrent=function(){n.getPromise().then(function(){m(s.item(h))})},this.jumpToFirst=function(){h=0,v.jumpToCurrent()},this.jumpToLast=function(){n.getPromise().then(function(t){0!==t.length&&(h=t.length-1),v.jumpToCurrent()})},this.flicker=function(t){var e=f.item(0);if(e){t=t||3;var n=function(){f.getLength()>0?f.clear():f.push(e)};a(n,100,2*t)}},this.getCurrent=function(){return s.item(h).annotation}}]),angular.module("dias.annotations").service("mapImage",["map","viewport",function(t,e){"use strict";var n=[0,0,0,0],o=null,i=document.createElement("canvas"),a=i.getContext("2d"),r=!0,l=!0;try{var s=fx.canvas(),c=null,u=null}catch(f){r=!1,console.log(f)}window.onbeforeunload=function(){c&&(c.destroy(),s.width=1,s.height=1)};var d=new ol.proj.Projection({code:"dias-image",units:"pixels",extent:n}),g=new ol.layer.Image;t.addLayer(g);var h={brightnessContrast:[0,0],brightnessRGB:[0,0,0],hueSaturation:[0,0],vibrance:[0]},p={brightnessContrast:[0,0],brightnessRGB:[0,0,0],hueSaturation:[0,0],vibrance:[0]},v=function(t,e){var n=s._.gl.getParameter(s._.gl.MAX_TEXTURE_SIZE);r=n>=e&&n>=t,r||console.log("Insufficient WebGL texture size. Required: "+t+"x"+e+", available: "+n+"x"+n+".")},m=function(){return!angular.equals(p,h)},y=function(e){if(o){u!==o.src&&(c?c.loadContentsOf(o):c=s.texture(o),u=o.src),s.draw(c);for(var n in p)p.hasOwnProperty(n)&&(angular.equals(p[n],h[n])||s[n].apply(s,p[n]));s.update(),a.drawImage(s,0,0),e&&t.render()}};this.renderImage=function(s,c){o=c,n[2]=o.width,n[3]=o.height,i.width=o.width,i.height=o.height,r&&l&&(l=!1,v(o.width,o.height)),r&&m()?y():a.drawImage(o,0,0),g.setSource(new ol.source.Canvas({canvas:i,projection:d,canvasExtent:n,canvasSize:[i.width,i.height]}));var u=e.getCenter();void 0!==u[0]&&void 0!==u[1]||(u=ol.extent.getCenter(n));var f=e.getZoom();t.setView(new ol.View({projection:d,center:u,zoom:f,zoomFactor:1.5,minResolution:.25,extent:n})),void 0===f&&t.getView().fit(n,t.getSize())},this.getExtent=function(){return n},this.getProjection=function(){return d},this.getLayer=function(){return g},this.filter=function(t){if(r){for(var e in p)t.hasOwnProperty(e)&&p.hasOwnProperty(e)&&(p[e]=t[e].map(parseFloat));y(!0)}},this.supportsFilters=function(){return r}}]),angular.module("dias.annotations").service("mapInteractions",["map","styles","AttachLabelInteraction",function(t,e,n){"use strict";
var o=this,i={},a={select:function(t,n){return i.select=new ol.interaction.Select({style:e.highlight,layers:n,multi:!0}),i.select},modify:function(t,e){return i.modify=new ol.interaction.Modify({features:e,deleteCondition:function(t){return ol.events.condition.shiftKeyOnly(t)&&ol.events.condition.singleClick(t)}}),i.modify},draw:function(t,n,o){return i.draw=new ol.interaction.Draw({source:o,type:n,style:e.editing}),i.draw},translate:function(t,e){return i.translate=new ol.interaction.Translate({features:e}),i.translate},attachLabel:function(t,e){return i.attachLabel=new n({features:e}),i.attachLabel}},r={select:function(t){t.target.getFeatures().clear()},draw:function(t){t.oldValue?(g("draw"),u("modify"),c("select")):(d("draw"),u("select"),u("translate"),u("attachLabel"),c("modify"))},translate:function(t){t.oldValue||(u("draw"),u("attachLabel"))},attachLabel:function(t){t.oldValue||(u("draw"),u("translate"))}},l=function(t){return i.hasOwnProperty(t)},s=function(t){return i[t]},c=function(t){l(t)&&i[t].setActive(!0)},u=function(t){l(t)&&i[t].setActive(!1)},f=function(t){return l(t)&&i[t].getActive()},d=function(e){l(e)&&t.addInteraction(i[e])},g=function(e){l(e)&&t.removeInteraction(i[e])},h=function(t,e,n){l(t)&&i[t].on(e,n)},p=function(t,e,n){l(t)&&i[t].on(e,n)},v=function(t){u(t),g(t);var e=a[t].apply(o,arguments);return d(t),r.hasOwnProperty(t)&&(h(t,"change:active",r[t]),r[t]({key:"active",target:e})),e};this.get=s,this.activate=c,this.deactivate=u,this.active=f,this.add=d,this.remove=g,this.on=h,this.un=p,this.init=v}]),angular.module("dias.annotations").service("styles",function(){"use strict";var t=this;this.colors={white:[255,255,255,1],blue:[0,153,255,1],orange:"#ff5e00"};var e=6,n=3,o=new ol.style.Stroke({color:this.colors.white,width:5}),i=new ol.style.Stroke({color:this.colors.white,width:6}),a=new ol.style.Stroke({color:this.colors.blue,width:n}),r=new ol.style.Stroke({color:this.colors.orange,width:n}),l=new ol.style.Fill({color:this.colors.blue}),s=new ol.style.Fill({color:this.colors.orange}),c=new ol.style.Stroke({color:this.colors.white,width:2}),u=new ol.style.Stroke({color:this.colors.white,width:n}),f=new ol.style.Stroke({color:this.colors.white,width:2,lineDash:[3]}),d=new ol.style.Stroke({color:this.colors.blue,width:n,lineDash:[5]});new ol.style.Fill({color:this.colors.blue}),new ol.style.Fill({color:this.colors.orange});this.features=function(n){var i=n.color?"#"+n.color:t.colors.blue;return[new ol.style.Style({stroke:o,image:new ol.style.Circle({radius:e,fill:new ol.style.Fill({color:i}),stroke:c})}),new ol.style.Style({stroke:new ol.style.Stroke({color:i,width:3})})]},this.highlight=[new ol.style.Style({stroke:i,image:new ol.style.Circle({radius:e,fill:s,stroke:u}),zIndex:200}),new ol.style.Style({stroke:r,zIndex:200})],this.editing=[new ol.style.Style({stroke:o,image:new ol.style.Circle({radius:e,fill:l,stroke:f})}),new ol.style.Style({stroke:d})],this.viewport=[new ol.style.Style({stroke:a}),new ol.style.Style({stroke:new ol.style.Stroke({color:this.colors.white,width:1})})]}),angular.module("dias.annotations").service("viewport",["urlParams",function(t){"use strict";var e={zoom:t.get("z"),center:[t.get("x"),t.get("y")]};this.set=function(n){e.zoom=n.zoom,e.center[0]=Math.round(n.center[0]),e.center[1]=Math.round(n.center[1]),t.set({z:e.zoom,x:e.center[0],y:e.center[1]})},this.get=function(){return e},this.getZoom=function(){return e.zoom},this.getCenter=function(){return e.center}}]);