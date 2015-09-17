/**
 * @namespace dias.annotations
 * @description The DIAS annotations module.
 */
angular.module('dias.annotations', ['dias.api', 'dias.ui.messages']);

/**
 * @namespace dias.annotations
 * @ngdoc controller
 * @name AnnotationsController
 * @memberOf dias.annotations
 * @description Controller for the annotations list in the sidebar
 */
angular.module('dias.annotations').controller('AnnotationsController', ["$scope", "mapAnnotations", "labels", "annotations", "shapes", function ($scope, mapAnnotations, labels, annotations, shapes) {
		"use strict";

		$scope.selectedFeatures = mapAnnotations.getSelectedFeatures().getArray();

		$scope.$watchCollection('selectedFeatures', function (features) {
			features.forEach(function (feature) {
				labels.fetchForAnnotation(feature.annotation);
			});
		});

		var refreshAnnotations = function () {
			$scope.annotations = annotations.current();
		};

		var selectedFeatures = mapAnnotations.getSelectedFeatures();

		$scope.annotations = [];

		$scope.clearSelection = mapAnnotations.clearSelection;

		$scope.selectAnnotation = function (e, id) {
			// allow multiple selections
			if (!e.shiftKey) {
				$scope.clearSelection();
			}
			mapAnnotations.select(id);
		};

		$scope.isSelected = function (id) {
			var selected = false;
			selectedFeatures.forEach(function (feature) {
				if (feature.annotation && feature.annotation.id == id) {
					selected = true;
				}
			});
			return selected;
		};

		$scope.$on('image.shown', refreshAnnotations);
	}]
);

/**
 * @namespace dias.annotations
 * @ngdoc controller
 * @name AnnotatorController
 * @memberOf dias.annotations
 * @description Main controller of the Annotator application.
 */
angular.module('dias.annotations').controller('AnnotatorController', ["$scope", "$attrs", "images", "urlParams", "msg", "labels", function ($scope, $attrs, images, urlParams, msg, labels) {
        "use strict";

        $scope.images = images;
        $scope.imageLoading = true;
        $scope.editMode = !!$attrs.editMode;
        // don't parse an empty string
        $scope.projectIds = $attrs.projectIds ? $attrs.projectIds.split(',') : [];

        labels.setProjectIds($scope.projectIds);

        // the current canvas viewport, synced with the URL parameters
        $scope.viewport = {
            zoom: urlParams.get('z'),
            center: [urlParams.get('x'), urlParams.get('y')]
        };

        // finish image loading process
        var finishLoading = function () {
            $scope.imageLoading = false;
            $scope.$broadcast('image.shown', $scope.images.currentImage);
        };

        // create a new history entry
        var pushState = function () {
            urlParams.pushState($scope.images.currentImage._id);
        };

        // start image loading process
        var startLoading = function () {
            $scope.imageLoading = true;
        };

        // load the image by id. doesn't create a new history entry by itself
        var loadImage = function (id) {
            startLoading();
            return images.show(parseInt(id))
                         .then(finishLoading)
                         .catch(msg.responseError);
        };

        var handleKeyEvents = function (e) {
            switch (e.keyCode) {
                case 37:
                    $scope.prevImage();
                    break;
                case 39:
                    $scope.nextImage();
                    break;
                default:
                    $scope.$apply(function () {
                        $scope.$broadcast('keypress', e);
                    });
            }
        };

        // show the next image and create a new history entry
        $scope.nextImage = function () {
            startLoading();
            images.next()
                  .then(finishLoading)
                  .then(pushState)
                  .catch(msg.responseError);
        };

        // show the previous image and create a new history entry
        $scope.prevImage = function () {
            startLoading();
            images.prev()
                  .then(finishLoading)
                  .then(pushState)
                  .catch(msg.responseError);
        };

        // update the URL parameters of the viewport
        $scope.$on('canvas.moveend', function(e, params) {
            $scope.viewport.zoom = params.zoom;
            $scope.viewport.center[0] = Math.round(params.center[0]);
            $scope.viewport.center[1] = Math.round(params.center[1]);
            urlParams.set({
                z: $scope.viewport.zoom,
                x: $scope.viewport.center[0],
                y: $scope.viewport.center[1]
            });
        });

        // listen to the browser "back" button
        window.onpopstate = function(e) {
            var state = e.state;
            if (state && state.slug !== undefined) {
                loadImage(state.slug);
            }
        };

        document.addEventListener('keypress', handleKeyEvents);

        // initialize the images service
        images.init($attrs.transectId);
        // display the first image
        loadImage($attrs.imageId).then(pushState);
    }]
);

/**
 * @namespace dias.annotations
 * @ngdoc controller
 * @name CanvasController
 * @memberOf dias.annotations
 * @description Main controller for the annotation canvas element
 */
angular.module('dias.annotations').controller('CanvasController', ["$scope", "mapImage", "mapAnnotations", "map", "$timeout", function ($scope, mapImage, mapAnnotations, map, $timeout) {
		"use strict";

		// update the URL parameters
		map.on('moveend', function(e) {
			var view = map.getView();
			$scope.$emit('canvas.moveend', {
				center: view.getCenter(),
				zoom: view.getZoom()
			});
		});

		mapImage.init($scope);
		mapAnnotations.init($scope);

		var updateSize = function () {
			// workaround, so the function is called *after* the angular digest
			// and *after* the foldout was rendered
			$timeout(function() {
				map.updateSize();
			}, 0, false);
		};

		$scope.$on('sidebar.foldout.open', updateSize);
		$scope.$on('sidebar.foldout.close', updateSize);
	}]
);
/**
 * @namespace dias.annotations
 * @ngdoc controller
 * @name CategoriesController
 * @memberOf dias.annotations
 * @description Controller for the sidebar label categories foldout
 */
angular.module('dias.annotations').controller('CategoriesController', ["$scope", "labels", function ($scope, labels) {
        "use strict";

        $scope.categories = [];
        labels.promise.then(function (all) {
            for (var key in all) {
                $scope.categories = $scope.categories.concat(all[key]);
            }
        });

        $scope.categoriesTree = labels.getTree();

        $scope.selectItem = function (item) {
            labels.setSelected(item);
            $scope.searchCategory = ''; // clear search field
            $scope.$broadcast('categories.selected', item);
        };
    }]
);

/**
 * @namespace dias.annotations
 * @ngdoc controller
 * @name ConfidenceController
 * @memberOf dias.annotations
 * @description Controller for the confidence control
 */
angular.module('dias.annotations').controller('ConfidenceController', ["$scope", "labels", function ($scope, labels) {
		"use strict";

		$scope.confidence = 1.0;

		$scope.$watch('confidence', function (confidence) {
			labels.setCurrentConfidence(parseFloat(confidence));

			if (confidence <= 0.25) {
				$scope.confidenceClass = 'label-danger';
			} else if (confidence <= 0.5 ) {
				$scope.confidenceClass = 'label-warning';
			} else if (confidence <= 0.75 ) {
				$scope.confidenceClass = 'label-success';
			} else {
				$scope.confidenceClass = 'label-primary';
			}
		});
	}]
);

/**
 * @namespace dias.annotations
 * @ngdoc controller
 * @name ControlsController
 * @memberOf dias.annotations
 * @description Controller for the sidebar control buttons
 */
angular.module('dias.annotations').controller('ControlsController', ["$scope", "mapAnnotations", "labels", "msg", "$attrs", function ($scope, mapAnnotations, labels, msg, $attrs) {
		"use strict";

		var drawing = false;

		$scope.selectShape = function (name) {
			if (!labels.hasSelected()) {
                $scope.$emit('sidebar.foldout.do-open', 'categories');
				msg.info($attrs.selectCategory);
				return;
			}

			mapAnnotations.finishDrawing();

			if (name === null || (drawing && $scope.selectedShape === name)) {
				$scope.selectedShape = '';
				drawing = false;
			} else {
				$scope.selectedShape = name;
				mapAnnotations.startDrawing(name);
				drawing = true;
			}
		};

        $scope.$on('keypress', function (e, keyEvent) {
            var charCode = (keyEvent.which) ? keyEvent.which : keyEvent.keyCode;
            switch (String.fromCharCode(charCode)) {
                case 'a':
                    $scope.selectShape('Point');
                    break;
                case 's':
                    $scope.selectShape('Rectangle');
                    break;
                case 'd':
                    $scope.selectShape('Circle');
                    break;
                case 'f':
                    $scope.selectShape('LineString');
                    break;
                case 'g':
                    $scope.selectShape('Polygon');
                    break;
            }
        });
	}]
);

/**
 * @namespace dias.annotations
 * @ngdoc controller
 * @name MinimapController
 * @memberOf dias.annotations
 * @description Controller for the minimap in the sidebar
 */
angular.module('dias.annotations').controller('MinimapController', ["$scope", "map", "mapImage", "$element", "styles", function ($scope, map, mapImage, $element, styles) {
		"use strict";

		var minimap = new ol.Map({
			target: 'minimap',
			// remove controls
			controls: [],
			// disable interactions
			interactions: []
		});

		// get the same layers than the map
		minimap.setLayerGroup(map.getLayerGroup());

		var featureOverlay = new ol.FeatureOverlay({
			map: minimap,
			style: styles.viewport
		});

		var viewport = new ol.Feature();
		featureOverlay.addFeature(viewport);

		// refresh the view (the image size could have been changed)
		$scope.$on('image.shown', function () {
			minimap.setView(new ol.View({
				projection: mapImage.getProjection(),
				center: ol.extent.getCenter(mapImage.getExtent()),
				zoom: 0
			}));
		});

		// move the viewport rectangle on the minimap
		var refreshViewport = function () {
			var extent = map.getView().calculateExtent(map.getSize());
			viewport.setGeometry(ol.geom.Polygon.fromExtent(extent));
		};

		map.on('moveend', refreshViewport);

		var dragViewport = function (e) {
			map.getView().setCenter(e.coordinate);
		};

		minimap.on('pointerdrag', dragViewport);

		$element.on('mouseleave', function () {
			minimap.un('pointerdrag', dragViewport);
		});

		$element.on('mouseenter', function () {
			minimap.on('pointerdrag', dragViewport);
		});
	}]
);
/**
 * @namespace dias.annotations
 * @ngdoc controller
 * @name SidebarController
 * @memberOf dias.annotations
 * @description Controller for the sidebar
 */
angular.module('dias.annotations').controller('SidebarController', ["$scope", "$rootScope", "mapAnnotations", function ($scope, $rootScope, mapAnnotations) {
		"use strict";

		// the currently opened sidebar-'extension'
		$scope.foldout = '';

		$scope.openFoldout = function (name) {
			$scope.foldout = name;
			$rootScope.$broadcast('sidebar.foldout.open');
		};

		$scope.closeFoldout = function () {
			$scope.foldout = '';
			$rootScope.$broadcast('sidebar.foldout.close');
		};

		$scope.toggleFoldout = function (name) {
			if ($scope.foldout === name) {
				$scope.closeFoldout();
			} else {
				$scope.openFoldout(name);
			}
		};

		$scope.deleteSelectedAnnotations = function () {
            if (mapAnnotations.getSelectedFeatures().getLength() > 0 && confirm('Are you sure you want to delete all selected annotations?')) {
                mapAnnotations.deleteSelected();
            }
        };

        $rootScope.$on('sidebar.foldout.do-open', function (e, name) {
            $scope.openFoldout(name);
        });

        $scope.$on('keypress', function (e, keyEvent) {
            if (keyEvent.keyCode === 46) {
                $scope.deleteSelectedAnnotations();
            }
        });
	}]
);

/**
 * @namespace dias.annotations
 * @ngdoc directive
 * @name annotationListItem
 * @memberOf dias.annotations
 * @description An annotation list item.
 */
angular.module('dias.annotations').directive('annotationListItem', ["labels", function (labels) {
		"use strict";

		return {
			scope: true,
			controller: ["$scope", function ($scope) {
				$scope.shapeClass = 'icon-' + $scope.annotation.shape.toLowerCase();

				$scope.selected = function () {
					return $scope.isSelected($scope.annotation.id);
				};

				$scope.attachLabel = function () {
					labels.attachToAnnotation($scope.annotation);
				};

				$scope.removeLabel = function (label) {
					labels.removeFromAnnotation($scope.annotation, label);
				};

				$scope.canAttachLabel = function () {
					return $scope.selected() && labels.hasSelected();
				};

				$scope.currentLabel = labels.getSelected;

				$scope.currentConfidence = labels.getCurrentConfidence;
			}]
		};
	}]
);

/**
 * @namespace dias.annotations
 * @ngdoc directive
 * @name labelCategoryItem
 * @memberOf dias.annotations
 * @description A label category list item.
 */
angular.module('dias.annotations').directive('labelCategoryItem', ["$compile", "$timeout", "$templateCache", function ($compile, $timeout, $templateCache) {
        "use strict";

        return {
            restrict: 'C',

            templateUrl: 'label-item.html',

            scope: true,

            link: function (scope, element, attrs) {
                // wait for this element to be rendered until the children are
                // appended, otherwise there would be too much recursion for
                // angular
                var content = angular.element($templateCache.get('label-subtree.html'));
                $timeout(function () {
                    element.append($compile(content)(scope));
                });
            },

            controller: ["$scope", function ($scope) {
                // open the subtree of this item
                $scope.isOpen = false;
                // this item has children
                $scope.isExpandable = !!$scope.tree[$scope.item.id];
                // this item is currently selected
                $scope.isSelected = false;

                // handle this by the event rather than an own click handler to
                // deal with click and search field actions in a unified way
                $scope.$on('categories.selected', function (e, category) {
                    // if an item is selected, its subtree and all parent items
                    // should be opened
                    if ($scope.item.id === category.id) {
                        $scope.isOpen = true;
                        $scope.isSelected = true;
                        // this hits all parent scopes/items
                        $scope.$emit('categories.openParents');
                    } else {
                        $scope.isOpen = false;
                        $scope.isSelected = false;
                    }
                });

                // if a child item was selected, this item should be opened, too
                // so the selected item becomes visible in the tree
                $scope.$on('categories.openParents', function (e) {
                    $scope.isOpen = true;
                    // stop propagation if this is a root element
                    if ($scope.item.parent_id === null) {
                        e.stopPropagation();
                    }
                });
            }]
        };
    }]
);

/**
 * @namespace dias.annotations
 * @ngdoc directive
 * @name labelItem
 * @memberOf dias.annotations
 * @description An annotation label list item.
 */
angular.module('dias.annotations').directive('labelItem', function () {
		"use strict";

		return {
			controller: ["$scope", function ($scope) {
				var confidence = $scope.annotationLabel.confidence;

				if (confidence <= 0.25) {
					$scope.class = 'label-danger';
				} else if (confidence <= 0.5 ) {
					$scope.class = 'label-warning';
				} else if (confidence <= 0.75 ) {
					$scope.class = 'label-success';
				} else {
					$scope.class = 'label-primary';
				}
			}]
		};
	}
);

/**
 * @namespace dias.annotations
 * @ngdoc factory
 * @name debounce
 * @memberOf dias.annotations
 * @description A debounce service to perform an action only when this function
 * wasn't called again in a short period of time.
 * see http://stackoverflow.com/a/13320016/1796523
 */
angular.module('dias.annotations').factory('debounce', ["$timeout", "$q", function ($timeout, $q) {
		"use strict";

		var timeouts = {};

		return function (func, wait, id) {
			// Create a deferred object that will be resolved when we need to
			// actually call the func
			var deferred = $q.defer();
			return (function() {
				var context = this, args = arguments;
				var later = function() {
					timeouts[id] = undefined;
					deferred.resolve(func.apply(context, args));
					deferred = $q.defer();
				};
				if (timeouts[id]) {
					$timeout.cancel(timeouts[id]);
				}
				timeouts[id] = $timeout(later, wait);
				return deferred.promise;
			})();
		};
	}]
);
/**
 * @namespace dias.annotations
 * @ngdoc factory
 * @name map
 * @memberOf dias.annotations
 * @description Wrapper factory handling OpenLayers map
 */
angular.module('dias.annotations').factory('map', function () {
		"use strict";

		var map = new ol.Map({
			target: 'canvas',
			controls: [
				new ol.control.Zoom(),
				new ol.control.ZoomToExtent(),
				new ol.control.FullScreen()
			]
		});

		return map;
	}
);
/**
 * @namespace dias.annotations
 * @ngdoc service
 * @name annotations
 * @memberOf dias.annotations
 * @description Wrapper service the annotations to make them available in multiple controllers.
 */
angular.module('dias.annotations').service('annotations', ["Annotation", "shapes", "labels", "msg", function (Annotation, shapes, labels, msg) {
		"use strict";

		var annotations;

		var resolveShapeName = function (annotation) {
			annotation.shape = shapes.getName(annotation.shape_id);
			return annotation;
		};

		var addAnnotation = function (annotation) {
			annotations.push(annotation);
			return annotation;
		};

		this.query = function (params) {
			annotations = Annotation.query(params);
			annotations.$promise.then(function (a) {
				a.forEach(resolveShapeName);
			});
			return annotations;
		};

		this.add = function (params) {
			if (!params.shape_id && params.shape) {
				params.shape_id = shapes.getId(params.shape);
			}
			var label = labels.getSelected();
			params.label_id = label.id;
			params.confidence = labels.getCurrentConfidence();
			var annotation = Annotation.add(params);
			annotation.$promise
			          .then(resolveShapeName)
			          .then(addAnnotation)
			          .catch(msg.responseError);

			return annotation;
		};

		this.delete = function (annotation) {
			// use index to see if the annotation exists in the annotations list
			var index = annotations.indexOf(annotation);
			if (index > -1) {
				return annotation.$delete(function () {
					// update the index since the annotations list may have been 
					// modified in the meantime
					index = annotations.indexOf(annotation);
					annotations.splice(index, 1);
				}, msg.responseError);
			}
		};

		this.forEach = function (fn) {
			return annotations.forEach(fn);
		};

		this.current = function () {
			return annotations;
		};
	}]
);
/**
 * @namespace dias.annotations
 * @ngdoc service
 * @name images
 * @memberOf dias.annotations
 * @description Manages (pre-)loading of the images to annotate.
 */
angular.module('dias.annotations').service('images', ["TransectImage", "URL", "$q", function (TransectImage, URL, $q) {
		"use strict";

		var _this = this;
		// array of all image IDs of the transect
		var imageIds = [];
		// maximum number of images to hold in buffer
		var MAX_BUFFER_SIZE = 10;
		// buffer of already loaded images
		var buffer = [];

		// the currently shown image
		this.currentImage = undefined;

		/**
		 * Returns the next ID of the specified image or the next ID of the 
		 * current image if no image was specified.
		 */
		var nextId = function (id) {
			id = id || _this.currentImage._id;
			var index = imageIds.indexOf(id);
			return imageIds[(index + 1) % imageIds.length];
		};

		/**
		 * Returns the previous ID of the specified image or the previous ID of
		 * the current image if no image was specified.
		 */
		var prevId = function (id) {
			id = id || _this.currentImage._id;
			var index = imageIds.indexOf(id);
			var length = imageIds.length;
			return imageIds[(index - 1 + length) % length];
		};

		/**
		 * Returns the specified image from the buffer or `undefined` if it is
		 * not buffered.
		 */
		var getImage = function (id) {
			id = id || _this.currentImage._id;
			for (var i = buffer.length - 1; i >= 0; i--) {
				if (buffer[i]._id == id) return buffer[i];
			}

			return undefined;
		};

		/**
		 * Sets the specified image to as the currently shown image.
		 */
		var show = function (id) {
			_this.currentImage = getImage(id);
		};

		/**
		 * Loads the specified image either from buffer or from the external 
		 * resource. Returns a promise that gets resolved when the image is
		 * loaded.
		 */
		var fetchImage = function (id) {
			var deferred = $q.defer();
			var img = getImage(id);

			if (img) {
				deferred.resolve(img);
			} else {
				img = document.createElement('img');
				img._id = id;
				img.onload = function () {
					buffer.push(img);
					// control maximum buffer size
					if (buffer.length > MAX_BUFFER_SIZE) {
						buffer.shift();
					}
					deferred.resolve(img);
				};
				img.onerror = function (msg) {
					deferred.reject(msg);
				};
				img.src = URL + "/api/v1/images/" + id + "/file";
			}

			return deferred.promise;
		};

		/**
		 * Initializes the service for a given transect. Returns a promise that
		 * is resolved, when the service is initialized.
		 */
		this.init = function (transectId) {
			imageIds = TransectImage.query({transect_id: transectId});
			
			return imageIds.$promise;
		};

		/**
		 * Show the image with the specified ID. Returns a promise that is
		 * resolved when the image is shown.
		 */
		this.show = function (id) {
			var promise = fetchImage(id).then(function() {
				show(id);
			});

			// wait for imageIds to be loaded
			imageIds.$promise.then(function () {
				// pre-load previous and next images but don't display them
				fetchImage(nextId(id));
				fetchImage(prevId(id));
			});

			return promise;
		};

		/**
		 * Show the next image. Returns a promise that is
		 * resolved when the image is shown.
		 */
		this.next = function () {
			return _this.show(nextId());
		};

		/**
		 * Show the previous image. Returns a promise that is
		 * resolved when the image is shown.
		 */
		this.prev = function () {
			return _this.show(prevId());
		};

		this.getCurrentId = function () {
			return _this.currentImage._id;
		};
	}]
);
/**
 * @namespace dias.annotations
 * @ngdoc service
 * @name labels
 * @memberOf dias.annotations
 * @description Wrapper service for annotation labels to provide some convenience functions.
 */
angular.module('dias.annotations').service('labels', ["AnnotationLabel", "Label", "ProjectLabel", "Project", "msg", "$q", function (AnnotationLabel, Label, ProjectLabel, Project, msg, $q) {
        "use strict";

        var selectedLabel;
        var currentConfidence = 1.0;

        var labels = {};

        // this promise is resolved when all labels were loaded
        this.promise = null;

        this.setProjectIds = function (ids) {
            var deferred = $q.defer();
            this.promise = deferred.promise;
            // -1 bcause of global labels
            var finished = -1;

            // check if all labels are there. if yes, resolve
            var maybeResolve = function () {
                if (++finished === ids.length) {
                    deferred.resolve(labels);
                }
            };

            labels[null] = Label.query(maybeResolve);

            ids.forEach(function (id) {
                Project.get({id: id}, function (project) {
                    labels[project.name] = ProjectLabel.query({project_id: id}, maybeResolve);
                });
            });
        };

        this.fetchForAnnotation = function (annotation) {
            if (!annotation) return;

            // don't fetch twice
            if (!annotation.labels) {
                annotation.labels = AnnotationLabel.query({
                    annotation_id: annotation.id
                });
            }

            return annotation.labels;
        };

        this.attachToAnnotation = function (annotation) {
            var label = AnnotationLabel.attach({
                annotation_id: annotation.id,
                label_id: selectedLabel.id,
                confidence: currentConfidence
            });

            label.$promise.then(function () {
                annotation.labels.push(label);
            });

            label.$promise.catch(msg.responseError);

            return label;
        };

        this.removeFromAnnotation = function (annotation, label) {
            // use index to see if the label exists for the annotation
            var index = annotation.labels.indexOf(label);
            if (index > -1) {
                return label.$delete(function () {
                    // update the index since the label list may have been modified
                    // in the meantime
                    index = annotation.labels.indexOf(label);
                    annotation.labels.splice(index, 1);
                }, msg.responseError);
            }
        };

        this.getTree = function () {
            var tree = {};
            var key = null;
            var build = function (label) {
                var parent = label.parent_id;
                if (tree[key][parent]) {
                    tree[key][parent].push(label);
                } else {
                    tree[key][parent] = [label];
                }
            };

            this.promise.then(function (labels) {
                for (key in labels) {
                    tree[key] = {};
                    labels[key].forEach(build);
                }
            });

            return tree;
        };

        this.getAll = function () {
            return labels;
        };

        this.setSelected = function (label) {
            selectedLabel = label;
        };

        this.getSelected = function () {
            return selectedLabel;
        };

        this.hasSelected = function () {
            return !!selectedLabel;
        };

        this.setCurrentConfidence = function (confidence) {
            currentConfidence = confidence;
        };

        this.getCurrentConfidence = function () {
            return currentConfidence;
        };
    }]
);

/**
 * @namespace dias.annotations
 * @ngdoc service
 * @name mapAnnotations
 * @memberOf dias.annotations
 * @description Wrapper service handling the annotations layer on the OpenLayers map
 */
angular.module('dias.annotations').service('mapAnnotations', ["map", "images", "annotations", "debounce", "styles", function (map, images, annotations, debounce, styles) {
		"use strict";

		var featureOverlay = new ol.FeatureOverlay({
			style: styles.features
		});

		var features = new ol.Collection();

		featureOverlay.setFeatures(features);

		// select interaction working on "singleclick"
		var select = new ol.interaction.Select({
			style: styles.highlight
		});

		var selectedFeatures = select.getFeatures();

		var modify = new ol.interaction.Modify({
			features: featureOverlay.getFeatures(),
			// the SHIFT key must be pressed to delete vertices, so
			// that new vertices can be drawn at the same position
			// of existing vertices
			deleteCondition: function(event) {
				return ol.events.condition.shiftKeyOnly(event) && ol.events.condition.singleClick(event);
			}
		});

		// drawing interaction
		var draw;

		// convert a point array to a point object
		// re-invert the y axis
		var convertFromOLPoint = function (point) {
			return {x: point[0], y: images.currentImage.height - point[1]};
		};

		// convert a point object to a point array
		// invert the y axis
		var convertToOLPoint = function (point) {
			return [point.x, images.currentImage.height - point.y];
		};

		// assembles the coordinate arrays depending on the geometry type
		// so they have a unified format
		var getCoordinates = function (geometry) {
			switch (geometry.getType()) {
				case 'Circle':
					// radius is the x value of the second point of the circle
					return [geometry.getCenter(), [geometry.getRadius(), 0]];
				case 'Polygon':
				case 'Rectangle':
					return geometry.getCoordinates()[0];
				case 'Point':
					return [geometry.getCoordinates()];
				default:
					return geometry.getCoordinates();
			}
		};

		// saves the updated geometry of an annotation feature
		var handleGeometryChange = function (e) {
			var feature = e.target;
			var save = function () {
				var coordinates = getCoordinates(feature.getGeometry());
				feature.annotation.points = coordinates.map(convertFromOLPoint);
				feature.annotation.$save();
			};
			// this event is rapidly fired, so wait until the firing stops
			// before saving the changes
			debounce(save, 500, feature.annotation.id);
		};

		var createFeature = function (annotation) {
			var geometry;
			var points = annotation.points.map(convertToOLPoint);

			switch (annotation.shape) {
				case 'Point':
					geometry = new ol.geom.Point(points[0]);
					break;
				case 'Rectangle':
					geometry = new ol.geom.Rectangle([ points ]);
					break;
				case 'Polygon':
					// example: https://github.com/openlayers/ol3/blob/master/examples/geojson.js#L126
					geometry = new ol.geom.Polygon([ points ]);
					break;
				case 'LineString':
					geometry = new ol.geom.LineString(points);
					break;
				case 'Circle':
					// radius is the x value of the second point of the circle
					geometry = new ol.geom.Circle(points[0], points[1][0]);
					break;
			}

			var feature = new ol.Feature({ geometry: geometry });
			feature.on('change', handleGeometryChange);
			feature.annotation = annotation;
			features.push(feature);
		};

		var refreshAnnotations = function (e, image) {
			// clear features of previous image
			features.clear();
			selectedFeatures.clear();

			annotations.query({id: image._id}).$promise.then(function () {
				annotations.forEach(createFeature);
			});
		};

		var handleNewFeature = function (e) {
			var geometry = e.feature.getGeometry();
			var coordinates = getCoordinates(geometry);

			e.feature.annotation = annotations.add({
				id: images.getCurrentId(),
				shape: geometry.getType(),
				points: coordinates.map(convertFromOLPoint)
			});

			// if the feature couldn't be saved, remove it again
			e.feature.annotation.$promise.catch(function () {
				features.remove(e.feature);
			});

			e.feature.on('change', handleGeometryChange);
		};

		this.init = function (scope) {
			featureOverlay.setMap(map);
			map.addInteraction(select);
			scope.$on('image.shown', refreshAnnotations);

			selectedFeatures.on('change:length', function () {
				// if not already digesting, digest
				if (!scope.$$phase) {
					// propagate new selections through the angular application
					scope.$apply();
				}
			});
		};

		this.startDrawing = function (type) {
			map.removeInteraction(select);

			type = type || 'Point';
			draw = new ol.interaction.Draw({
				features: features,
				type: type,
				style: styles.editing
			});

			map.addInteraction(modify);
			map.addInteraction(draw);
			draw.on('drawend', handleNewFeature);
		};

		this.finishDrawing = function () {
			map.removeInteraction(draw);
			map.removeInteraction(modify);
			map.addInteraction(select);
			// non't select the last drawn point
			selectedFeatures.clear();
		};

		this.deleteSelected = function () {
			selectedFeatures.forEach(function (feature) {
				annotations.delete(feature.annotation).then(function () {
					features.remove(feature);
					selectedFeatures.remove(feature);
				});
			});
		};

		this.select = function (id) {
			var feature;
			features.forEach(function (f) {
				if (f.annotation.id === id) {
					feature = f;
				}
			});
			// remove selection if feature was already selected. otherwise select.
			if (!selectedFeatures.remove(feature)) {
				selectedFeatures.push(feature);
			}
		};

		this.clearSelection = function () {
			selectedFeatures.clear();
		};

		this.getSelectedFeatures = function () {
			return selectedFeatures;
		};
	}]
);

/**
 * @namespace dias.annotations
 * @ngdoc service
 * @name mapImage
 * @memberOf dias.annotations
 * @description Wrapper service handling the image layer on the OpenLayers map
 */
angular.module('dias.annotations').service('mapImage', ["map", function (map) {
		"use strict";
		var extent = [0, 0, 0, 0];

		var projection = new ol.proj.Projection({
			code: 'dias-image',
			units: 'pixels',
			extent: extent
		});

		var imageLayer = new ol.layer.Image();

		this.init = function (scope) {
			map.addLayer(imageLayer);

			// refresh the image source
			scope.$on('image.shown', function (e, image) {
				extent[2] = image.width;
				extent[3] = image.height;

				var zoom = scope.viewport.zoom;

				var center = scope.viewport.center;
				// viewport center is still uninitialized
				if (center[0] === undefined && center[1] === undefined) {
					center = ol.extent.getCenter(extent);
				}

				var imageStatic = new ol.source.ImageStatic({
					url: image.src,
					projection: projection,
					imageExtent: extent
				});

				imageLayer.setSource(imageStatic);

				map.setView(new ol.View({
					projection: projection,
					center: center,
					zoom: zoom,
					zoomFactor: 1.5,
					// allow a maximum of 4x magnification
					minResolution: 0.25,
					// restrict movement
					extent: extent
				}));

				// if zoom is not initialized, fit the view to the image extent
				if (zoom === undefined) {
					map.getView().fitExtent(extent, map.getSize());
				}
			});
		};

		this.getExtent = function () {
			return extent;
		};

		this.getProjection = function () {
			return projection;
		};
	}]
);
/**
 * @namespace dias.annotations
 * @ngdoc service
 * @name styles
 * @memberOf dias.annotations
 * @description Wrapper service for the OpenLayers styles
 */
angular.module('dias.annotations').service('styles', function () {
		"use strict";

		var white = [255, 255, 255, 1];
		var blue = [0, 153, 255, 1];
		var orange = '#ff5e00';
		var width = 3;

		this.features = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: white,
					width: 5
				}),
				image: new ol.style.Circle({
					radius: 6,
					fill: new ol.style.Fill({
						color: blue
					}),
					stroke: new ol.style.Stroke({
						color: white,
						width: 2
					})
				})
			}),
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: blue,
					width: 3
				})
			})
		];

		this.highlight = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: white,
					width: 6
				}),
				image: new ol.style.Circle({
					radius: 6,
					fill: new ol.style.Fill({
						color: orange
					}),
					stroke: new ol.style.Stroke({
						color: white,
						width: 3
					})
				})
			}),
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: orange,
					width: 3
				})
			})
		];

		this.editing = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: white,
					width: 5
				}),
				image: new ol.style.Circle({
					radius: 6,
					fill: new ol.style.Fill({
						color: blue
					}),
					stroke: new ol.style.Stroke({
						color: white,
						width: 2,
						lineDash: [3]
					})
				})
			}),
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: blue,
					width: 3,
					lineDash: [5]
				})
			})
		];

		this.viewport = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: blue,
					width: 3
				}),
			}),
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: white,
					width: 1
				})
			})
		];
	}
);
/**
 * @namespace dias.annotations
 * @ngdoc service
 * @name urlParams
 * @memberOf dias.annotations
 * @description The GET parameters of the url.
 */
angular.module('dias.annotations').service('urlParams', function () {
		"use strict";

		var state = {};

		// transforms a URL parameter string like #a=1&b=2 to an object
		var decodeState = function () {
			var params = location.hash.replace('#', '')
			                          .split('&');

			var state = {};

			params.forEach(function (param) {
				// capture key-value pairs
				var capture = param.match(/(.+)\=(.+)/);
				if (capture && capture.length === 3) {
					state[capture[1]] = decodeURIComponent(capture[2]);
				}
			});

			return state;
		};

		// transforms an object to a URL parameter string
		var encodeState = function (state) {
			var params = '';
			for (var key in state) {
				params += key + '=' + encodeURIComponent(state[key]) + '&';
			}
			return params.substring(0, params.length - 1);
		};

		this.pushState = function (s) {
			state.slug = s;
			history.pushState(state, '', state.slug + '#' + encodeState(state));
		};

		// sets a URL parameter and updates the history state
		this.set = function (params) {
			for (var key in params) {
				state[key] = params[key];
			}
			history.replaceState(state, '', state.slug + '#' + encodeState(state));
		};

		// returns a URL parameter
		this.get = function (key) {
			return state[key];
		};

		state = history.state;

		if (!state) {
			state = decodeState();
		}
	}
);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJjb250cm9sbGVycy9Bbm5vdGF0aW9uc0NvbnRyb2xsZXIuanMiLCJjb250cm9sbGVycy9Bbm5vdGF0b3JDb250cm9sbGVyLmpzIiwiY29udHJvbGxlcnMvQ2FudmFzQ29udHJvbGxlci5qcyIsImNvbnRyb2xsZXJzL0NhdGVnb3JpZXNDb250cm9sbGVyLmpzIiwiY29udHJvbGxlcnMvQ29uZmlkZW5jZUNvbnRyb2xsZXIuanMiLCJjb250cm9sbGVycy9Db250cm9sc0NvbnRyb2xsZXIuanMiLCJjb250cm9sbGVycy9NaW5pbWFwQ29udHJvbGxlci5qcyIsImNvbnRyb2xsZXJzL1NpZGViYXJDb250cm9sbGVyLmpzIiwiZGlyZWN0aXZlcy9hbm5vdGF0aW9uTGlzdEl0ZW0uanMiLCJkaXJlY3RpdmVzL2xhYmVsQ2F0ZWdvcnlJdGVtLmpzIiwiZGlyZWN0aXZlcy9sYWJlbEl0ZW0uanMiLCJmYWN0b3JpZXMvZGVib3VuY2UuanMiLCJmYWN0b3JpZXMvbWFwLmpzIiwic2VydmljZXMvYW5ub3RhdGlvbnMuanMiLCJzZXJ2aWNlcy9pbWFnZXMuanMiLCJzZXJ2aWNlcy9sYWJlbHMuanMiLCJzZXJ2aWNlcy9tYXBBbm5vdGF0aW9ucy5qcyIsInNlcnZpY2VzL21hcEltYWdlLmpzIiwic2VydmljZXMvc3R5bGVzLmpzIiwic2VydmljZXMvdXJsUGFyYW1zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBSUEsUUFBQSxPQUFBLG9CQUFBLENBQUEsWUFBQTs7Ozs7Ozs7O0FDR0EsUUFBQSxPQUFBLG9CQUFBLFdBQUEseUZBQUEsVUFBQSxRQUFBLGdCQUFBLFFBQUEsYUFBQSxRQUFBO0VBQ0E7O0VBRUEsT0FBQSxtQkFBQSxlQUFBLHNCQUFBOztFQUVBLE9BQUEsaUJBQUEsb0JBQUEsVUFBQSxVQUFBO0dBQ0EsU0FBQSxRQUFBLFVBQUEsU0FBQTtJQUNBLE9BQUEsbUJBQUEsUUFBQTs7OztFQUlBLElBQUEscUJBQUEsWUFBQTtH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QUEsSUFBQTtFQUNBOztFQUVBLElBQUEsV0FBQTs7RUFFQSxPQUFBLFVBQUEsTUFBQSxNQUFBLElBQUE7OztHQUdBLElBQUEsV0FBQSxHQUFBO0dBQ0EsT0FBQSxDQUFBLFdBQUE7SUFDQSxJQUFBLFVBQUEsTUFBQSxPQUFBO0lBQ0EsSUFBQSxRQUFBLFdBQUE7S0FDQSxTQUFBLE1BQUE7S0FDQSxTQUFBLFFBQUEsS0FBQSxNQUFBLFNBQUE7S0FDQSxXQUFBLEdBQUE7O0lBRUEsSUFBQSxTQUFBLEtBQUE7S0FDQSxTQUFBLE9BQUEsU0FBQTs7SUFFQSxTQUFBLE1BQUEsU0FBQSxPQUFBO0lBQ0EsT0FBQSxTQUFBOzs7Ozs7Ozs7Ozs7QUN0QkEsUUFBQSxPQUFBLG9CQUFBLFFBQUEsT0FBQSxZQUFBO0VBQ0E7O0VBRUEsSUFBQSxNQUFBLElBQUEsR0FBQSxJQUFBO0dBQ0EsUUFBQTtHQUNBLFVBQUE7SUFDQSxJQUFBLEdBQUEsUUFBQTtJQUNBLElBQUEsR0FBQSxRQUFBO0lBQ0EsSUFBQSxHQUFBLFFBQUE7Ozs7RUFJQSxPQUFBOzs7Ozs7Ozs7O0FDWkEsUUFBQSxPQUFBLG9CQUFBLFFBQUEseURBQUEsVUFBQSxZQUFBLFFBQUEsUUFBQSxLQUFBO0VBQ0E7O0VBRUEsSUFBQTs7RUFFQSxJQUFBLG1CQUFBLFVBQUEsWUFBQTtHQUNBLFdBQUEsUUFBQSxPQUFBLFFBQUEsV0FBQTtHQUNBLE9BQUE7OztFQUdBLElBQUEsZ0JBQUEsVUFBQSxZQUFBO0dBQ0EsWUFBQSxLQUFBO0dBQ0EsT0FBQTs7O0VBR0EsS0FBQSxRQUFBLFVBQUEsUUFBQTtHQUNBLGNBQUEsV0FBQSxNQUFBO0dBQ0EsWUFBQSxTQUFBLEtBQUEsVUFBQSxHQUFBO0lBQ0EsRUFBQSxRQUFBOztHQUVBLE9BQUE7OztFQUdBLEtBQUEsTUFBQSxVQUFBLFFBQUE7R0FDQSxJQUFBLENBQUEsT0FBQSxZQUFBLE9BQUEsT0FBQTtJQUNBLE9BQUEsV0FBQSxPQUFBLE1BQUEsT0FBQTs7R0FFQSxJQUFBLFFBQUEsT0FBQTtHQUNBLE9BQUEsV0FBQSxNQUFBO0dBQ0EsT0FBQSxhQUFBLE9BQUE7R0FDQSxJQUFBLGFBQUEsV0FBQSxJQUFBO0dBQ0EsV0FBQTtjQUNBLEtBQUE7Y0FDQSxLQUFBO2NBQ0EsTUFBQSxJQUFBOztHQUVBLE9BQUE7OztFQUdBLEtBQUEsU0FBQSxVQUFBLFlBQUE7O0dBRUEsSUFBQSxRQUFBLFlBQUEsUUFBQTtHQUNBLElBQUEsUUFBQSxDQUFBLEdBQUE7SUFDQSxPQUFBLFdBQUEsUUFBQSxZQUFBOzs7S0FHQSxRQUFBLFlBQUEsUUFBQTtLQUNBLFlBQUEsT0FBQSxPQUFBO09BQ0EsSUFBQTs7OztFQUlBLEtBQUEsVUFBQSxVQUFBLElBQUE7R0FDQSxPQUFBLFlBQUEsUUFBQTs7O0VBR0EsS0FBQSxVQUFBLFlBQUE7R0FDQSxPQUFBOzs7Ozs7Ozs7OztBQ3pEQSxRQUFBLE9BQUEsb0JBQUEsUUFBQSx5Q0FBQSxVQUFBLGVBQUEsS0FBQSxJQUFBO0VBQ0E7O0VBRUEsSUFBQSxRQUFBOztFQUVBLElBQUEsV0FBQTs7RUFFQSxJQUFBLGtCQUFBOztFQUVBLElBQUEsU0FBQTs7O0VBR0EsS0FBQSxlQUFBOzs7Ozs7RUFNQSxJQUFBLFNBQUEsVUFBQSxJQUFBO0dBQ0EsS0FBQSxNQUFBLE1BQUEsYUFBQTtHQUNBLElBQUEsUUFBQSxTQUFBLFFBQUE7R0FDQSxPQUFBLFNBQUEsQ0FBQSxRQUFBLEtBQUEsU0FBQTs7Ozs7OztFQU9BLElBQUEsU0FBQSxVQUFBLElBQUE7R0FDQSxLQUFBLE1BQUEsTUFBQSxhQUFBO0dBQ0EsSUFBQSxRQUFBLFNBQUEsUUFBQTtHQUNBLElBQUEsU0FBQSxTQUFBO0dBQ0EsT0FBQSxTQUFBLENBQUEsUUFBQSxJQUFBLFVBQUE7Ozs7Ozs7RUFPQSxJQUFBLFdBQUEsVUFBQSxJQUFBO0dBQ0EsS0FBQSxNQUFBLE1BQUEsYUFBQTtHQUNBLEtBQUEsSUFBQSxJQUFBLE9BQUEsU0FBQSxHQUFBLEtBQUEsR0FBQSxLQUFBO0lBQ0EsSUFBQSxPQUFBLEdBQUEsT0FBQSxJQUFBLE9BQUEsT0FBQTs7O0dBR0EsT0FBQTs7Ozs7O0VBTUEsSUFBQSxPQUFBLFVBQUEsSUFBQTtHQUNBLE1BQUEsZUFBQSxTQUFBOzs7Ozs7OztFQVFBLElBQUEsYUFBQSxVQUFBLElBQUE7R0FDQSxJQUFBLFdBQUEsR0FBQTtHQUNBLElBQUEsTUFBQSxTQUFBOztHQUVBLElBQUEsS0FBQTtJQUNBLFNBQUEsUUFBQTtVQUNBO0lBQ0EsTUFBQSxTQUFBLGNBQUE7SUFDQSxJQUFBLE1BQUE7SUFDQSxJQUFBLFNBQUEsWUFBQTtLQUNBLE9BQUEsS0FBQTs7S0FFQSxJQUFBLE9BQUEsU0FBQSxpQkFBQTtNQUNBLE9BQUE7O0tBRUEsU0FBQSxRQUFBOztJQUVBLElBQUEsVUFBQSxVQUFBLEtBQUE7S0FDQSxTQUFBLE9BQUE7O0lBRUEsSUFBQSxNQUFBLE1BQUEsb0JBQUEsS0FBQTs7O0dBR0EsT0FBQSxTQUFBOzs7Ozs7O0VBT0EsS0FBQSxPQUFBLFVBQUEsWUFBQTtHQUNBLFdBQUEsY0FBQSxNQUFBLENBQUEsYUFBQTs7R0FFQSxPQUFBLFNBQUE7Ozs7Ozs7RUFPQSxLQUFBLE9BQUEsVUFBQSxJQUFBO0dBQ0EsSUFBQSxVQUFBLFdBQUEsSUFBQSxLQUFBLFdBQUE7SUFDQSxLQUFBOzs7O0dBSUEsU0FBQSxTQUFBLEtBQUEsWUFBQTs7SUFFQSxXQUFBLE9BQUE7SUFDQSxXQUFBLE9BQUE7OztHQUdBLE9BQUE7Ozs7Ozs7RUFPQSxLQUFBLE9BQUEsWUFBQTtHQUNBLE9BQUEsTUFBQSxLQUFBOzs7Ozs7O0VBT0EsS0FBQSxPQUFBLFlBQUE7R0FDQSxPQUFBLE1BQUEsS0FBQTs7O0VBR0EsS0FBQSxlQUFBLFlBQUE7R0FDQSxPQUFBLE1BQUEsYUFBQTs7Ozs7Ozs7Ozs7QUNwSUEsUUFBQSxPQUFBLG9CQUFBLFFBQUEsK0VBQUEsVUFBQSxpQkFBQSxPQUFBLGNBQUEsU0FBQSxLQUFBLElBQUE7UUFDQTs7UUFFQSxJQUFBO1FBQ0EsSUFBQSxvQkFBQTs7UUFFQSxJQUFBLFNBQUE7OztRQUdBLEtBQUEsVUFBQTs7UUFFQSxLQUFBLGdCQUFBLFVBQUEsS0FBQTtZQUNBLElBQUEsV0FBQSxHQUFBO1lBQ0EsS0FBQSxVQUFBLFNBQUE7O1lBRUEsSUFBQSxXQUFBLENBQUE7OztZQUdBLElBQUEsZUFBQSxZQUFBO2dCQUNBLElBQUEsRUFBQSxhQUFBLElBQUEsUUFBQTtvQkFDQSxTQUFBLFFBQUE7Ozs7WUFJQSxPQUFBLFFBQUEsTUFBQSxNQUFBOztZQUVBLElBQUEsUUFBQSxVQUFBLElBQUE7Z0JBQ0EsUUFBQSxJQUFBLENBQUEsSUFBQSxLQUFBLFVBQUEsU0FBQTtvQkFDQSxPQUFBLFFBQUEsUUFBQSxhQUFBLE1BQUEsQ0FBQSxZQUFBLEtBQUE7Ozs7O1FBS0EsS0FBQSxxQkFBQSxVQUFBLFlBQUE7WUFDQSxJQUFBLENBQUEsWUFBQTs7O1lBR0EsSUFBQSxDQUFBLFdBQUEsUUFBQTtnQkFDQSxXQUFBLFNBQUEsZ0JBQUEsTUFBQTtvQkFDQSxlQUFBLFdBQUE7Ozs7WUFJQSxPQUFBLFdBQUE7OztRQUdBLEtBQUEscUJBQUEsVUFBQSxZQUFBO1lBQ0EsSUFBQSxRQUFBLGdCQUFBLE9BQUE7Z0JBQ0EsZUFBQSxXQUFBO2dCQUNBLFVBQUEsY0FBQTtnQkFDQSxZQUFBOzs7WUFHQSxNQUFBLFNBQUEsS0FBQSxZQUFBO2dCQUNBLFdBQUEsT0FBQSxLQUFBOzs7WUFHQSxNQUFBLFNBQUEsTUFBQSxJQUFBOztZQUVBLE9BQUE7OztRQUdBLEtBQUEsdUJBQUEsVUFBQSxZQUFBLE9BQUE7O1lBRUEsSUFBQSxRQUFBLFdBQUEsT0FBQSxRQUFBO1lBQ0EsSUFBQSxRQUFBLENBQUEsR0FBQTtnQkFDQSxPQUFBLE1BQUEsUUFBQSxZQUFBOzs7b0JBR0EsUUFBQSxXQUFBLE9BQUEsUUFBQTtvQkFDQSxXQUFBLE9BQUEsT0FBQSxPQUFBO21CQUNBLElBQUE7Ozs7UUFJQSxLQUFBLFVBQUEsWUFBQTtZQUNBLElBQUEsT0FBQTtZQUNBLElBQUEsTUFBQTtZQUNBLElBQUEsUUFBQSxVQUFBLE9BQUE7Z0JBQ0EsSUFBQSxTQUFBLE1BQUE7Z0JBQ0EsSUFBQSxLQUFBLEtBQUEsU0FBQTtvQkFDQSxLQUFBLEtBQUEsUUFBQSxLQUFBO3VCQUNBO29CQUNBLEtBQUEsS0FBQSxVQUFBLENBQUE7Ozs7WUFJQSxLQUFBLFFBQUEsS0FBQSxVQUFBLFFBQUE7Z0JBQ0EsS0FBQSxPQUFBLFFBQUE7b0JBQ0EsS0FBQSxPQUFBO29CQUNBLE9BQUEsS0FBQSxRQUFBOzs7O1lBSUEsT0FBQTs7O1FBR0EsS0FBQSxTQUFBLFlBQUE7WUFDQSxPQUFBOzs7UUFHQSxLQUFBLGNBQUEsVUFBQSxPQUFBO1lBQ0EsZ0JBQUE7OztRQUdBLEtBQUEsY0FBQSxZQUFBO1lBQ0EsT0FBQTs7O1FBR0EsS0FBQSxjQUFBLFlBQUE7WUFDQSxPQUFBLENBQUEsQ0FBQTs7O1FBR0EsS0FBQSx1QkFBQSxVQUFBLFlBQUE7WUFDQSxvQkFBQTs7O1FBR0EsS0FBQSx1QkFBQSxZQUFBO1lBQ0EsT0FBQTs7Ozs7Ozs7Ozs7O0FDdEhBLFFBQUEsT0FBQSxvQkFBQSxRQUFBLHlFQUFBLFVBQUEsS0FBQSxRQUFBLGFBQUEsVUFBQSxRQUFBO0VBQ0E7O0VBRUEsSUFBQSxpQkFBQSxJQUFBLEdBQUEsZUFBQTtHQUNBLE9BQUEsT0FBQTs7O0VBR0EsSUFBQSxXQUFBLElBQUEsR0FBQTs7RUFFQSxlQUFBLFlBQUE7OztFQUdBLElBQUEsU0FBQSxJQUFBLEdBQUEsWUFBQSxPQUFBO0dBQ0EsT0FBQSxPQUFBOzs7RUFHQSxJQUFBLG1CQUFBLE9BQUE7O0VBRUEsSUFBQSxTQUFBLElBQUEsR0FBQSxZQUFBLE9BQUE7R0FDQSxVQUFBLGVBQUE7Ozs7R0FJQSxpQkFBQSxTQUFBLE9BQUE7SUFDQSxPQUFBLEdBQUEsT0FBQSxVQUFBLGFBQUEsVUFBQSxHQUFBLE9BQUEsVUFBQSxZQUFBOzs7OztFQUtBLElBQUE7Ozs7RUFJQSxJQUFBLHFCQUFBLFVBQUEsT0FBQTtHQUNBLE9BQUEsQ0FBQSxHQUFBLE1BQUEsSUFBQSxHQUFBLE9BQUEsYUFBQSxTQUFBLE1BQUE7Ozs7O0VBS0EsSUFBQSxtQkFBQSxVQUFBLE9BQUE7R0FDQSxPQUFBLENBQUEsTUFBQSxHQUFBLE9BQUEsYUFBQSxTQUFBLE1BQUE7Ozs7O0VBS0EsSUFBQSxpQkFBQSxVQUFBLFVBQUE7R0FDQSxRQUFBLFNBQUE7SUFDQSxLQUFBOztLQUVBLE9BQUEsQ0FBQSxTQUFBLGFBQUEsQ0FBQSxTQUFBLGFBQUE7SUFDQSxLQUFBO0lBQ0EsS0FBQTtLQUNBLE9BQUEsU0FBQSxpQkFBQTtJQUNBLEtBQUE7S0FDQSxPQUFBLENBQUEsU0FBQTtJQUNBO0tBQ0EsT0FBQSxTQUFBOzs7OztFQUtBLElBQUEsdUJBQUEsVUFBQSxHQUFBO0dBQ0EsSUFBQSxVQUFBLEVBQUE7R0FDQSxJQUFBLE9BQUEsWUFBQTtJQUNBLElBQUEsY0FBQSxlQUFBLFFBQUE7SUFDQSxRQUFBLFdBQUEsU0FBQSxZQUFBLElBQUE7SUFDQSxRQUFBLFdBQUE7Ozs7R0FJQSxTQUFBLE1BQUEsS0FBQSxRQUFBLFdBQUE7OztFQUdBLElBQUEsZ0JBQUEsVUFBQSxZQUFBO0dBQ0EsSUFBQTtHQUNBLElBQUEsU0FBQSxXQUFBLE9BQUEsSUFBQTs7R0FFQSxRQUFBLFdBQUE7SUFDQSxLQUFBO0tBQ0EsV0FBQSxJQUFBLEdBQUEsS0FBQSxNQUFBLE9BQUE7S0FDQTtJQUNBLEtBQUE7S0FDQSxXQUFBLElBQUEsR0FBQSxLQUFBLFVBQUEsRUFBQTtLQUNBO0lBQ0EsS0FBQTs7S0FFQSxXQUFBLElBQUEsR0FBQSxLQUFBLFFBQUEsRUFBQTtLQUNBO0lBQ0EsS0FBQTtLQUNBLFdBQUEsSUFBQSxHQUFBLEtBQUEsV0FBQTtLQUNBO0lBQ0EsS0FBQTs7S0FFQSxXQUFBLElBQUEsR0FBQSxLQUFBLE9BQUEsT0FBQSxJQUFBLE9BQUEsR0FBQTtLQUNBOzs7R0FHQSxJQUFBLFVBQUEsSUFBQSxHQUFBLFFBQUEsRUFBQSxVQUFBO0dBQ0EsUUFBQSxHQUFBLFVBQUE7R0FDQSxRQUFBLGFBQUE7R0FDQSxTQUFBLEtBQUE7OztFQUdBLElBQUEscUJBQUEsVUFBQSxHQUFBLE9BQUE7O0dBRUEsU0FBQTtHQUNBLGlCQUFBOztHQUVBLFlBQUEsTUFBQSxDQUFBLElBQUEsTUFBQSxNQUFBLFNBQUEsS0FBQSxZQUFBO0lBQ0EsWUFBQSxRQUFBOzs7O0VBSUEsSUFBQSxtQkFBQSxVQUFBLEdBQUE7R0FDQSxJQUFBLFdBQUEsRUFBQSxRQUFBO0dBQ0EsSUFBQSxjQUFBLGVBQUE7O0dBRUEsRUFBQSxRQUFBLGFBQUEsWUFBQSxJQUFBO0lBQ0EsSUFBQSxPQUFBO0lBQ0EsT0FBQSxTQUFBO0lBQ0EsUUFBQSxZQUFBLElBQUE7Ozs7R0FJQSxFQUFBLFFBQUEsV0FBQSxTQUFBLE1BQUEsWUFBQTtJQUNBLFNBQUEsT0FBQSxFQUFBOzs7R0FHQSxFQUFBLFFBQUEsR0FBQSxVQUFBOzs7RUFHQSxLQUFBLE9BQUEsVUFBQSxPQUFBO0dBQ0EsZUFBQSxPQUFBO0dBQ0EsSUFBQSxlQUFBO0dBQ0EsTUFBQSxJQUFBLGVBQUE7O0dBRUEsaUJBQUEsR0FBQSxpQkFBQSxZQUFBOztJQUVBLElBQUEsQ0FBQSxNQUFBLFNBQUE7O0tBRUEsTUFBQTs7Ozs7RUFLQSxLQUFBLGVBQUEsVUFBQSxNQUFBO0dBQ0EsSUFBQSxrQkFBQTs7R0FFQSxPQUFBLFFBQUE7R0FDQSxPQUFBLElBQUEsR0FBQSxZQUFBLEtBQUE7SUFDQSxVQUFBO0lBQ0EsTUFBQTtJQUNBLE9BQUEsT0FBQTs7O0dBR0EsSUFBQSxlQUFBO0dBQ0EsSUFBQSxlQUFBO0dBQ0EsS0FBQSxHQUFBLFdBQUE7OztFQUdBLEtBQUEsZ0JBQUEsWUFBQTtHQUNBLElBQUEsa0JBQUE7R0FDQSxJQUFBLGtCQUFBO0dBQ0EsSUFBQSxlQUFBOztHQUVBLGlCQUFBOzs7RUFHQSxLQUFBLGlCQUFBLFlBQUE7R0FDQSxpQkFBQSxRQUFBLFVBQUEsU0FBQTtJQUNBLFlBQUEsT0FBQSxRQUFBLFlBQUEsS0FBQSxZQUFBO0tBQ0EsU0FBQSxPQUFBO0tBQ0EsaUJBQUEsT0FBQTs7Ozs7RUFLQSxLQUFBLFNBQUEsVUFBQSxJQUFBO0dBQ0EsSUFBQTtHQUNBLFNBQUEsUUFBQSxVQUFBLEdBQUE7SUFDQSxJQUFBLEVBQUEsV0FBQSxPQUFBLElBQUE7S0FDQSxVQUFBOzs7O0dBSUEsSUFBQSxDQUFBLGlCQUFBLE9BQUEsVUFBQTtJQUNBLGlCQUFBLEtBQUE7Ozs7RUFJQSxLQUFBLGlCQUFBLFlBQUE7R0FDQSxpQkFBQTs7O0VBR0EsS0FBQSxzQkFBQSxZQUFBO0dBQ0EsT0FBQTs7Ozs7Ozs7Ozs7O0FDbk1BLFFBQUEsT0FBQSxvQkFBQSxRQUFBLG9CQUFBLFVBQUEsS0FBQTtFQUNBO0VBQ0EsSUFBQSxTQUFBLENBQUEsR0FBQSxHQUFBLEdBQUE7O0VBRUEsSUFBQSxhQUFBLElBQUEsR0FBQSxLQUFBLFdBQUE7R0FDQSxNQUFBO0dBQ0EsT0FBQTtHQUNBLFFBQUE7OztFQUdBLElBQUEsYUFBQSxJQUFBLEdBQUEsTUFBQTs7RUFFQSxLQUFBLE9BQUEsVUFBQSxPQUFBO0dBQ0EsSUFBQSxTQUFBOzs7R0FHQSxNQUFBLElBQUEsZUFBQSxVQUFBLEdBQUEsT0FBQTtJQUNBLE9BQUEsS0FBQSxNQUFBO0lBQ0EsT0FBQSxLQUFBLE1BQUE7O0lBRUEsSUFBQSxPQUFBLE1BQUEsU0FBQTs7SUFFQSxJQUFBLFNBQUEsTUFBQSxTQUFBOztJQUVBLElBQUEsT0FBQSxPQUFBLGFBQUEsT0FBQSxPQUFBLFdBQUE7S0FDQSxTQUFBLEdBQUEsT0FBQSxVQUFBOzs7SUFHQSxJQUFBLGNBQUEsSUFBQSxHQUFBLE9BQUEsWUFBQTtLQUNBLEtBQUEsTUFBQTtLQUNBLFlBQUE7S0FDQSxhQUFBOzs7SUFHQSxXQUFBLFVBQUE7O0lBRUEsSUFBQSxRQUFBLElBQUEsR0FBQSxLQUFBO0tBQ0EsWUFBQTtLQUNBLFFBQUE7S0FDQSxNQUFBO0tBQ0EsWUFBQTs7S0FFQSxlQUFBOztLQUVBLFFBQUE7Ozs7SUFJQSxJQUFBLFNBQUEsV0FBQTtLQUNBLElBQUEsVUFBQSxVQUFBLFFBQUEsSUFBQTs7Ozs7RUFLQSxLQUFBLFlBQUEsWUFBQTtHQUNBLE9BQUE7OztFQUdBLEtBQUEsZ0JBQUEsWUFBQTtHQUNBLE9BQUE7Ozs7Ozs7Ozs7O0FDM0RBLFFBQUEsT0FBQSxvQkFBQSxRQUFBLFVBQUEsWUFBQTtFQUNBOztFQUVBLElBQUEsUUFBQSxDQUFBLEtBQUEsS0FBQSxLQUFBO0VBQ0EsSUFBQSxPQUFBLENBQUEsR0FBQSxLQUFBLEtBQUE7RUFDQSxJQUFBLFNBQUE7RUFDQSxJQUFBLFFBQUE7O0VBRUEsS0FBQSxXQUFBO0dBQ0EsSUFBQSxHQUFBLE1BQUEsTUFBQTtJQUNBLFFBQUEsSUFBQSxHQUFBLE1BQUEsT0FBQTtLQUNBLE9BQUE7S0FDQSxPQUFBOztJQUVBLE9BQUEsSUFBQSxHQUFBLE1BQUEsT0FBQTtLQUNBLFFBQUE7S0FDQSxNQUFBLElBQUEsR0FBQSxNQUFBLEtBQUE7TUFDQSxPQUFBOztLQUVBLFFBQUEsSUFBQSxHQUFBLE1BQUEsT0FBQTtNQUNBLE9BQUE7TUFDQSxPQUFBOzs7O0dBSUEsSUFBQSxHQUFBLE1BQUEsTUFBQTtJQUNBLFFBQUEsSUFBQSxHQUFBLE1BQUEsT0FBQTtLQUNBLE9BQUE7S0FDQSxPQUFBOzs7OztFQUtBLEtBQUEsWUFBQTtHQUNBLElBQUEsR0FBQSxNQUFBLE1BQUE7SUFDQSxRQUFBLElBQUEsR0FBQSxNQUFBLE9BQUE7S0FDQSxPQUFBO0tBQ0EsT0FBQTs7SUFFQSxPQUFBLElBQUEsR0FBQSxNQUFBLE9BQUE7S0FDQSxRQUFBO0tBQ0EsTUFBQSxJQUFBLEdBQUEsTUFBQSxLQUFBO01BQ0EsT0FBQTs7S0FFQSxRQUFBLElBQUEsR0FBQSxNQUFBLE9BQUE7TUFDQSxPQUFBO01BQ0EsT0FBQTs7OztHQUlBLElBQUEsR0FBQSxNQUFBLE1BQUE7SUFDQSxRQUFBLElBQUEsR0FBQSxNQUFBLE9BQUE7S0FDQSxPQUFBO0tBQ0EsT0FBQTs7Ozs7RUFLQSxLQUFBLFVBQUE7R0FDQSxJQUFBLEdBQUEsTUFBQSxNQUFBO0lBQ0EsUUFBQSxJQUFBLEdBQUEsTUFBQSxPQUFBO0tBQ0EsT0FBQTtLQUNBLE9BQUE7O0lBRUEsT0FBQSxJQUFBLEdBQUEsTUFBQSxPQUFBO0tBQ0EsUUFBQTtLQUNBLE1BQUEsSUFBQSxHQUFBLE1BQUEsS0FBQTtNQUNBLE9BQUE7O0tBRUEsUUFBQSxJQUFBLEdBQUEsTUFBQSxPQUFBO01BQ0EsT0FBQTtNQUNBLE9BQUE7TUFDQSxVQUFBLENBQUE7Ozs7R0FJQSxJQUFBLEdBQUEsTUFBQSxNQUFBO0lBQ0EsUUFBQSxJQUFBLEdBQUEsTUFBQSxPQUFBO0tBQ0EsT0FBQTtLQUNBLE9BQUE7S0FDQSxVQUFBLENBQUE7Ozs7O0VBS0EsS0FBQSxXQUFBO0dBQ0EsSUFBQSxHQUFBLE1BQUEsTUFBQTtJQUNBLFFBQUEsSUFBQSxHQUFBLE1BQUEsT0FBQTtLQUNBLE9BQUE7S0FDQSxPQUFBOzs7R0FHQSxJQUFBLEdBQUEsTUFBQSxNQUFBO0lBQ0EsUUFBQSxJQUFBLEdBQUEsTUFBQSxPQUFBO0tBQ0EsT0FBQTtLQUNBLE9BQUE7Ozs7Ozs7Ozs7Ozs7QUMvRkEsUUFBQSxPQUFBLG9CQUFBLFFBQUEsYUFBQSxZQUFBO0VBQ0E7O0VBRUEsSUFBQSxRQUFBOzs7RUFHQSxJQUFBLGNBQUEsWUFBQTtHQUNBLElBQUEsU0FBQSxTQUFBLEtBQUEsUUFBQSxLQUFBOzhCQUNBLE1BQUE7O0dBRUEsSUFBQSxRQUFBOztHQUVBLE9BQUEsUUFBQSxVQUFBLE9BQUE7O0lBRUEsSUFBQSxVQUFBLE1BQUEsTUFBQTtJQUNBLElBQUEsV0FBQSxRQUFBLFdBQUEsR0FBQTtLQUNBLE1BQUEsUUFBQSxNQUFBLG1CQUFBLFFBQUE7Ozs7R0FJQSxPQUFBOzs7O0VBSUEsSUFBQSxjQUFBLFVBQUEsT0FBQTtHQUNBLElBQUEsU0FBQTtHQUNBLEtBQUEsSUFBQSxPQUFBLE9BQUE7SUFDQSxVQUFBLE1BQUEsTUFBQSxtQkFBQSxNQUFBLFFBQUE7O0dBRUEsT0FBQSxPQUFBLFVBQUEsR0FBQSxPQUFBLFNBQUE7OztFQUdBLEtBQUEsWUFBQSxVQUFBLEdBQUE7R0FDQSxNQUFBLE9BQUE7R0FDQSxRQUFBLFVBQUEsT0FBQSxJQUFBLE1BQUEsT0FBQSxNQUFBLFlBQUE7Ozs7RUFJQSxLQUFBLE1BQUEsVUFBQSxRQUFBO0dBQ0EsS0FBQSxJQUFBLE9BQUEsUUFBQTtJQUNBLE1BQUEsT0FBQSxPQUFBOztHQUVBLFFBQUEsYUFBQSxPQUFBLElBQUEsTUFBQSxPQUFBLE1BQUEsWUFBQTs7OztFQUlBLEtBQUEsTUFBQSxVQUFBLEtBQUE7R0FDQSxPQUFBLE1BQUE7OztFQUdBLFFBQUEsUUFBQTs7RUFFQSxJQUFBLENBQUEsT0FBQTtHQUNBLFFBQUE7OztFQUdBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBuYW1lc3BhY2UgZGlhcy5hbm5vdGF0aW9uc1xuICogQGRlc2NyaXB0aW9uIFRoZSBESUFTIGFubm90YXRpb25zIG1vZHVsZS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2RpYXMuYW5ub3RhdGlvbnMnLCBbJ2RpYXMuYXBpJywgJ2RpYXMudWkubWVzc2FnZXMnXSk7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgZGlhcy5hbm5vdGF0aW9uc1xuICogQG5nZG9jIGNvbnRyb2xsZXJcbiAqIEBuYW1lIEFubm90YXRpb25zQ29udHJvbGxlclxuICogQG1lbWJlck9mIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBkZXNjcmlwdGlvbiBDb250cm9sbGVyIGZvciB0aGUgYW5ub3RhdGlvbnMgbGlzdCBpbiB0aGUgc2lkZWJhclxuICovXG5hbmd1bGFyLm1vZHVsZSgnZGlhcy5hbm5vdGF0aW9ucycpLmNvbnRyb2xsZXIoJ0Fubm90YXRpb25zQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIG1hcEFubm90YXRpb25zLCBsYWJlbHMsIGFubm90YXRpb25zLCBzaGFwZXMpIHtcblx0XHRcInVzZSBzdHJpY3RcIjtcblxuXHRcdCRzY29wZS5zZWxlY3RlZEZlYXR1cmVzID0gbWFwQW5ub3RhdGlvbnMuZ2V0U2VsZWN0ZWRGZWF0dXJlcygpLmdldEFycmF5KCk7XG5cblx0XHQkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbignc2VsZWN0ZWRGZWF0dXJlcycsIGZ1bmN0aW9uIChmZWF0dXJlcykge1xuXHRcdFx0ZmVhdHVyZXMuZm9yRWFjaChmdW5jdGlvbiAoZmVhdHVyZSkge1xuXHRcdFx0XHRsYWJlbHMuZmV0Y2hGb3JBbm5vdGF0aW9uKGZlYXR1cmUuYW5ub3RhdGlvbik7XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHZhciByZWZyZXNoQW5ub3RhdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHQkc2NvcGUuYW5ub3RhdGlvbnMgPSBhbm5vdGF0aW9ucy5jdXJyZW50KCk7XG5cdFx0fTtcblxuXHRcdHZhciBzZWxlY3RlZEZlYXR1cmVzID0gbWFwQW5ub3RhdGlvbnMuZ2V0U2VsZWN0ZWRGZWF0dXJlcygpO1xuXG5cdFx0JHNjb3BlLmFubm90YXRpb25zID0gW107XG5cblx0XHQkc2NvcGUuY2xlYXJTZWxlY3Rpb24gPSBtYXBBbm5vdGF0aW9ucy5jbGVhclNlbGVjdGlvbjtcblxuXHRcdCRzY29wZS5zZWxlY3RBbm5vdGF0aW9uID0gZnVuY3Rpb24gKGUsIGlkKSB7XG5cdFx0XHQvLyBhbGxvdyBtdWx0aXBsZSBzZWxlY3Rpb25zXG5cdFx0XHRpZiAoIWUuc2hpZnRLZXkpIHtcblx0XHRcdFx0JHNjb3BlLmNsZWFyU2VsZWN0aW9uKCk7XG5cdFx0XHR9XG5cdFx0XHRtYXBBbm5vdGF0aW9ucy5zZWxlY3QoaWQpO1xuXHRcdH07XG5cblx0XHQkc2NvcGUuaXNTZWxlY3RlZCA9IGZ1bmN0aW9uIChpZCkge1xuXHRcdFx0dmFyIHNlbGVjdGVkID0gZmFsc2U7XG5cdFx0XHRzZWxlY3RlZEZlYXR1cmVzLmZvckVhY2goZnVuY3Rpb24gKGZlYXR1cmUpIHtcblx0XHRcdFx0aWYgKGZlYXR1cmUuYW5ub3RhdGlvbiAmJiBmZWF0dXJlLmFubm90YXRpb24uaWQgPT0gaWQpIHtcblx0XHRcdFx0XHRzZWxlY3RlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHNlbGVjdGVkO1xuXHRcdH07XG5cblx0XHQkc2NvcGUuJG9uKCdpbWFnZS5zaG93bicsIHJlZnJlc2hBbm5vdGF0aW9ucyk7XG5cdH1cbik7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgZGlhcy5hbm5vdGF0aW9uc1xuICogQG5nZG9jIGNvbnRyb2xsZXJcbiAqIEBuYW1lIEFubm90YXRvckNvbnRyb2xsZXJcbiAqIEBtZW1iZXJPZiBkaWFzLmFubm90YXRpb25zXG4gKiBAZGVzY3JpcHRpb24gTWFpbiBjb250cm9sbGVyIG9mIHRoZSBBbm5vdGF0b3IgYXBwbGljYXRpb24uXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdkaWFzLmFubm90YXRpb25zJykuY29udHJvbGxlcignQW5ub3RhdG9yQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRhdHRycywgaW1hZ2VzLCB1cmxQYXJhbXMsIG1zZywgbGFiZWxzKSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgICAgICRzY29wZS5pbWFnZXMgPSBpbWFnZXM7XG4gICAgICAgICRzY29wZS5pbWFnZUxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAkc2NvcGUuZWRpdE1vZGUgPSAhISRhdHRycy5lZGl0TW9kZTtcbiAgICAgICAgLy8gZG9uJ3QgcGFyc2UgYW4gZW1wdHkgc3RyaW5nXG4gICAgICAgICRzY29wZS5wcm9qZWN0SWRzID0gJGF0dHJzLnByb2plY3RJZHMgPyAkYXR0cnMucHJvamVjdElkcy5zcGxpdCgnLCcpIDogW107XG5cbiAgICAgICAgbGFiZWxzLnNldFByb2plY3RJZHMoJHNjb3BlLnByb2plY3RJZHMpO1xuXG4gICAgICAgIC8vIHRoZSBjdXJyZW50IGNhbnZhcyB2aWV3cG9ydCwgc3luY2VkIHdpdGggdGhlIFVSTCBwYXJhbWV0ZXJzXG4gICAgICAgICRzY29wZS52aWV3cG9ydCA9IHtcbiAgICAgICAgICAgIHpvb206IHVybFBhcmFtcy5nZXQoJ3onKSxcbiAgICAgICAgICAgIGNlbnRlcjogW3VybFBhcmFtcy5nZXQoJ3gnKSwgdXJsUGFyYW1zLmdldCgneScpXVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGZpbmlzaCBpbWFnZSBsb2FkaW5nIHByb2Nlc3NcbiAgICAgICAgdmFyIGZpbmlzaExvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuaW1hZ2VMb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnaW1hZ2Uuc2hvd24nLCAkc2NvcGUuaW1hZ2VzLmN1cnJlbnRJbWFnZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgbmV3IGhpc3RvcnkgZW50cnlcbiAgICAgICAgdmFyIHB1c2hTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHVybFBhcmFtcy5wdXNoU3RhdGUoJHNjb3BlLmltYWdlcy5jdXJyZW50SW1hZ2UuX2lkKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBzdGFydCBpbWFnZSBsb2FkaW5nIHByb2Nlc3NcbiAgICAgICAgdmFyIHN0YXJ0TG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5pbWFnZUxvYWRpbmcgPSB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGxvYWQgdGhlIGltYWdlIGJ5IGlkLiBkb2Vzbid0IGNyZWF0ZSBhIG5ldyBoaXN0b3J5IGVudHJ5IGJ5IGl0c2VsZlxuICAgICAgICB2YXIgbG9hZEltYWdlID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICBzdGFydExvYWRpbmcoKTtcbiAgICAgICAgICAgIHJldHVybiBpbWFnZXMuc2hvdyhwYXJzZUludChpZCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZmluaXNoTG9hZGluZylcbiAgICAgICAgICAgICAgICAgICAgICAgICAuY2F0Y2gobXNnLnJlc3BvbnNlRXJyb3IpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBoYW5kbGVLZXlFdmVudHMgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgc3dpdGNoIChlLmtleUNvZGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDM3OlxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUucHJldkltYWdlKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzk6XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5uZXh0SW1hZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgna2V5cHJlc3MnLCBlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gc2hvdyB0aGUgbmV4dCBpbWFnZSBhbmQgY3JlYXRlIGEgbmV3IGhpc3RvcnkgZW50cnlcbiAgICAgICAgJHNjb3BlLm5leHRJbWFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXJ0TG9hZGluZygpO1xuICAgICAgICAgICAgaW1hZ2VzLm5leHQoKVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZmluaXNoTG9hZGluZylcbiAgICAgICAgICAgICAgICAgIC50aGVuKHB1c2hTdGF0ZSlcbiAgICAgICAgICAgICAgICAgIC5jYXRjaChtc2cucmVzcG9uc2VFcnJvcik7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gc2hvdyB0aGUgcHJldmlvdXMgaW1hZ2UgYW5kIGNyZWF0ZSBhIG5ldyBoaXN0b3J5IGVudHJ5XG4gICAgICAgICRzY29wZS5wcmV2SW1hZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGFydExvYWRpbmcoKTtcbiAgICAgICAgICAgIGltYWdlcy5wcmV2KClcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZpbmlzaExvYWRpbmcpXG4gICAgICAgICAgICAgICAgICAudGhlbihwdXNoU3RhdGUpXG4gICAgICAgICAgICAgICAgICAuY2F0Y2gobXNnLnJlc3BvbnNlRXJyb3IpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgVVJMIHBhcmFtZXRlcnMgb2YgdGhlIHZpZXdwb3J0XG4gICAgICAgICRzY29wZS4kb24oJ2NhbnZhcy5tb3ZlZW5kJywgZnVuY3Rpb24oZSwgcGFyYW1zKSB7XG4gICAgICAgICAgICAkc2NvcGUudmlld3BvcnQuem9vbSA9IHBhcmFtcy56b29tO1xuICAgICAgICAgICAgJHNjb3BlLnZpZXdwb3J0LmNlbnRlclswXSA9IE1hdGgucm91bmQocGFyYW1zLmNlbnRlclswXSk7XG4gICAgICAgICAgICAkc2NvcGUudmlld3BvcnQuY2VudGVyWzFdID0gTWF0aC5yb3VuZChwYXJhbXMuY2VudGVyWzFdKTtcbiAgICAgICAgICAgIHVybFBhcmFtcy5zZXQoe1xuICAgICAgICAgICAgICAgIHo6ICRzY29wZS52aWV3cG9ydC56b29tLFxuICAgICAgICAgICAgICAgIHg6ICRzY29wZS52aWV3cG9ydC5jZW50ZXJbMF0sXG4gICAgICAgICAgICAgICAgeTogJHNjb3BlLnZpZXdwb3J0LmNlbnRlclsxXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGxpc3RlbiB0byB0aGUgYnJvd3NlciBcImJhY2tcIiBidXR0b25cbiAgICAgICAgd2luZG93Lm9ucG9wc3RhdGUgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICB2YXIgc3RhdGUgPSBlLnN0YXRlO1xuICAgICAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlLnNsdWcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGxvYWRJbWFnZShzdGF0ZS5zbHVnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGhhbmRsZUtleUV2ZW50cyk7XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZSB0aGUgaW1hZ2VzIHNlcnZpY2VcbiAgICAgICAgaW1hZ2VzLmluaXQoJGF0dHJzLnRyYW5zZWN0SWQpO1xuICAgICAgICAvLyBkaXNwbGF5IHRoZSBmaXJzdCBpbWFnZVxuICAgICAgICBsb2FkSW1hZ2UoJGF0dHJzLmltYWdlSWQpLnRoZW4ocHVzaFN0YXRlKTtcbiAgICB9XG4pO1xuIiwiLyoqXG4gKiBAbmFtZXNwYWNlIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBuZ2RvYyBjb250cm9sbGVyXG4gKiBAbmFtZSBDYW52YXNDb250cm9sbGVyXG4gKiBAbWVtYmVyT2YgZGlhcy5hbm5vdGF0aW9uc1xuICogQGRlc2NyaXB0aW9uIE1haW4gY29udHJvbGxlciBmb3IgdGhlIGFubm90YXRpb24gY2FudmFzIGVsZW1lbnRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2RpYXMuYW5ub3RhdGlvbnMnKS5jb250cm9sbGVyKCdDYW52YXNDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgbWFwSW1hZ2UsIG1hcEFubm90YXRpb25zLCBtYXAsICR0aW1lb3V0KSB7XG5cdFx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0XHQvLyB1cGRhdGUgdGhlIFVSTCBwYXJhbWV0ZXJzXG5cdFx0bWFwLm9uKCdtb3ZlZW5kJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIHZpZXcgPSBtYXAuZ2V0VmlldygpO1xuXHRcdFx0JHNjb3BlLiRlbWl0KCdjYW52YXMubW92ZWVuZCcsIHtcblx0XHRcdFx0Y2VudGVyOiB2aWV3LmdldENlbnRlcigpLFxuXHRcdFx0XHR6b29tOiB2aWV3LmdldFpvb20oKVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRtYXBJbWFnZS5pbml0KCRzY29wZSk7XG5cdFx0bWFwQW5ub3RhdGlvbnMuaW5pdCgkc2NvcGUpO1xuXG5cdFx0dmFyIHVwZGF0ZVNpemUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLyB3b3JrYXJvdW5kLCBzbyB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkICphZnRlciogdGhlIGFuZ3VsYXIgZGlnZXN0XG5cdFx0XHQvLyBhbmQgKmFmdGVyKiB0aGUgZm9sZG91dCB3YXMgcmVuZGVyZWRcblx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRtYXAudXBkYXRlU2l6ZSgpO1xuXHRcdFx0fSwgMCwgZmFsc2UpO1xuXHRcdH07XG5cblx0XHQkc2NvcGUuJG9uKCdzaWRlYmFyLmZvbGRvdXQub3BlbicsIHVwZGF0ZVNpemUpO1xuXHRcdCRzY29wZS4kb24oJ3NpZGViYXIuZm9sZG91dC5jbG9zZScsIHVwZGF0ZVNpemUpO1xuXHR9XG4pOyIsIi8qKlxuICogQG5hbWVzcGFjZSBkaWFzLmFubm90YXRpb25zXG4gKiBAbmdkb2MgY29udHJvbGxlclxuICogQG5hbWUgQ2F0ZWdvcmllc0NvbnRyb2xsZXJcbiAqIEBtZW1iZXJPZiBkaWFzLmFubm90YXRpb25zXG4gKiBAZGVzY3JpcHRpb24gQ29udHJvbGxlciBmb3IgdGhlIHNpZGViYXIgbGFiZWwgY2F0ZWdvcmllcyBmb2xkb3V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdkaWFzLmFubm90YXRpb25zJykuY29udHJvbGxlcignQ2F0ZWdvcmllc0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBsYWJlbHMpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAgICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBbXTtcbiAgICAgICAgbGFiZWxzLnByb21pc2UudGhlbihmdW5jdGlvbiAoYWxsKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYWxsKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNhdGVnb3JpZXMgPSAkc2NvcGUuY2F0ZWdvcmllcy5jb25jYXQoYWxsW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuY2F0ZWdvcmllc1RyZWUgPSBsYWJlbHMuZ2V0VHJlZSgpO1xuXG4gICAgICAgICRzY29wZS5zZWxlY3RJdGVtID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIGxhYmVscy5zZXRTZWxlY3RlZChpdGVtKTtcbiAgICAgICAgICAgICRzY29wZS5zZWFyY2hDYXRlZ29yeSA9ICcnOyAvLyBjbGVhciBzZWFyY2ggZmllbGRcbiAgICAgICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdjYXRlZ29yaWVzLnNlbGVjdGVkJywgaXRlbSk7XG4gICAgICAgIH07XG4gICAgfVxuKTtcbiIsIi8qKlxuICogQG5hbWVzcGFjZSBkaWFzLmFubm90YXRpb25zXG4gKiBAbmdkb2MgY29udHJvbGxlclxuICogQG5hbWUgQ29uZmlkZW5jZUNvbnRyb2xsZXJcbiAqIEBtZW1iZXJPZiBkaWFzLmFubm90YXRpb25zXG4gKiBAZGVzY3JpcHRpb24gQ29udHJvbGxlciBmb3IgdGhlIGNvbmZpZGVuY2UgY29udHJvbFxuICovXG5hbmd1bGFyLm1vZHVsZSgnZGlhcy5hbm5vdGF0aW9ucycpLmNvbnRyb2xsZXIoJ0NvbmZpZGVuY2VDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgbGFiZWxzKSB7XG5cdFx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0XHQkc2NvcGUuY29uZmlkZW5jZSA9IDEuMDtcblxuXHRcdCRzY29wZS4kd2F0Y2goJ2NvbmZpZGVuY2UnLCBmdW5jdGlvbiAoY29uZmlkZW5jZSkge1xuXHRcdFx0bGFiZWxzLnNldEN1cnJlbnRDb25maWRlbmNlKHBhcnNlRmxvYXQoY29uZmlkZW5jZSkpO1xuXG5cdFx0XHRpZiAoY29uZmlkZW5jZSA8PSAwLjI1KSB7XG5cdFx0XHRcdCRzY29wZS5jb25maWRlbmNlQ2xhc3MgPSAnbGFiZWwtZGFuZ2VyJztcblx0XHRcdH0gZWxzZSBpZiAoY29uZmlkZW5jZSA8PSAwLjUgKSB7XG5cdFx0XHRcdCRzY29wZS5jb25maWRlbmNlQ2xhc3MgPSAnbGFiZWwtd2FybmluZyc7XG5cdFx0XHR9IGVsc2UgaWYgKGNvbmZpZGVuY2UgPD0gMC43NSApIHtcblx0XHRcdFx0JHNjb3BlLmNvbmZpZGVuY2VDbGFzcyA9ICdsYWJlbC1zdWNjZXNzJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRzY29wZS5jb25maWRlbmNlQ2xhc3MgPSAnbGFiZWwtcHJpbWFyeSc7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbik7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgZGlhcy5hbm5vdGF0aW9uc1xuICogQG5nZG9jIGNvbnRyb2xsZXJcbiAqIEBuYW1lIENvbnRyb2xzQ29udHJvbGxlclxuICogQG1lbWJlck9mIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBkZXNjcmlwdGlvbiBDb250cm9sbGVyIGZvciB0aGUgc2lkZWJhciBjb250cm9sIGJ1dHRvbnNcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2RpYXMuYW5ub3RhdGlvbnMnKS5jb250cm9sbGVyKCdDb250cm9sc0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBtYXBBbm5vdGF0aW9ucywgbGFiZWxzLCBtc2csICRhdHRycykge1xuXHRcdFwidXNlIHN0cmljdFwiO1xuXG5cdFx0dmFyIGRyYXdpbmcgPSBmYWxzZTtcblxuXHRcdCRzY29wZS5zZWxlY3RTaGFwZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRpZiAoIWxhYmVscy5oYXNTZWxlY3RlZCgpKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzaWRlYmFyLmZvbGRvdXQuZG8tb3BlbicsICdjYXRlZ29yaWVzJyk7XG5cdFx0XHRcdG1zZy5pbmZvKCRhdHRycy5zZWxlY3RDYXRlZ29yeSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0bWFwQW5ub3RhdGlvbnMuZmluaXNoRHJhd2luZygpO1xuXG5cdFx0XHRpZiAobmFtZSA9PT0gbnVsbCB8fCAoZHJhd2luZyAmJiAkc2NvcGUuc2VsZWN0ZWRTaGFwZSA9PT0gbmFtZSkpIHtcblx0XHRcdFx0JHNjb3BlLnNlbGVjdGVkU2hhcGUgPSAnJztcblx0XHRcdFx0ZHJhd2luZyA9IGZhbHNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JHNjb3BlLnNlbGVjdGVkU2hhcGUgPSBuYW1lO1xuXHRcdFx0XHRtYXBBbm5vdGF0aW9ucy5zdGFydERyYXdpbmcobmFtZSk7XG5cdFx0XHRcdGRyYXdpbmcgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH07XG5cbiAgICAgICAgJHNjb3BlLiRvbigna2V5cHJlc3MnLCBmdW5jdGlvbiAoZSwga2V5RXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBjaGFyQ29kZSA9IChrZXlFdmVudC53aGljaCkgPyBrZXlFdmVudC53aGljaCA6IGtleUV2ZW50LmtleUNvZGU7XG4gICAgICAgICAgICBzd2l0Y2ggKFN0cmluZy5mcm9tQ2hhckNvZGUoY2hhckNvZGUpKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnYSc6XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RTaGFwZSgnUG9pbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAncyc6XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RTaGFwZSgnUmVjdGFuZ2xlJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2QnOlxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0U2hhcGUoJ0NpcmNsZScpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdmJzpcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdFNoYXBlKCdMaW5lU3RyaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2cnOlxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0U2hhcGUoJ1BvbHlnb24nKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXHR9XG4pO1xuIiwiLyoqXG4gKiBAbmFtZXNwYWNlIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBuZ2RvYyBjb250cm9sbGVyXG4gKiBAbmFtZSBNaW5pbWFwQ29udHJvbGxlclxuICogQG1lbWJlck9mIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBkZXNjcmlwdGlvbiBDb250cm9sbGVyIGZvciB0aGUgbWluaW1hcCBpbiB0aGUgc2lkZWJhclxuICovXG5hbmd1bGFyLm1vZHVsZSgnZGlhcy5hbm5vdGF0aW9ucycpLmNvbnRyb2xsZXIoJ01pbmltYXBDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgbWFwLCBtYXBJbWFnZSwgJGVsZW1lbnQsIHN0eWxlcykge1xuXHRcdFwidXNlIHN0cmljdFwiO1xuXG5cdFx0dmFyIG1pbmltYXAgPSBuZXcgb2wuTWFwKHtcblx0XHRcdHRhcmdldDogJ21pbmltYXAnLFxuXHRcdFx0Ly8gcmVtb3ZlIGNvbnRyb2xzXG5cdFx0XHRjb250cm9sczogW10sXG5cdFx0XHQvLyBkaXNhYmxlIGludGVyYWN0aW9uc1xuXHRcdFx0aW50ZXJhY3Rpb25zOiBbXVxuXHRcdH0pO1xuXG5cdFx0Ly8gZ2V0IHRoZSBzYW1lIGxheWVycyB0aGFuIHRoZSBtYXBcblx0XHRtaW5pbWFwLnNldExheWVyR3JvdXAobWFwLmdldExheWVyR3JvdXAoKSk7XG5cblx0XHR2YXIgZmVhdHVyZU92ZXJsYXkgPSBuZXcgb2wuRmVhdHVyZU92ZXJsYXkoe1xuXHRcdFx0bWFwOiBtaW5pbWFwLFxuXHRcdFx0c3R5bGU6IHN0eWxlcy52aWV3cG9ydFxuXHRcdH0pO1xuXG5cdFx0dmFyIHZpZXdwb3J0ID0gbmV3IG9sLkZlYXR1cmUoKTtcblx0XHRmZWF0dXJlT3ZlcmxheS5hZGRGZWF0dXJlKHZpZXdwb3J0KTtcblxuXHRcdC8vIHJlZnJlc2ggdGhlIHZpZXcgKHRoZSBpbWFnZSBzaXplIGNvdWxkIGhhdmUgYmVlbiBjaGFuZ2VkKVxuXHRcdCRzY29wZS4kb24oJ2ltYWdlLnNob3duJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0bWluaW1hcC5zZXRWaWV3KG5ldyBvbC5WaWV3KHtcblx0XHRcdFx0cHJvamVjdGlvbjogbWFwSW1hZ2UuZ2V0UHJvamVjdGlvbigpLFxuXHRcdFx0XHRjZW50ZXI6IG9sLmV4dGVudC5nZXRDZW50ZXIobWFwSW1hZ2UuZ2V0RXh0ZW50KCkpLFxuXHRcdFx0XHR6b29tOiAwXG5cdFx0XHR9KSk7XG5cdFx0fSk7XG5cblx0XHQvLyBtb3ZlIHRoZSB2aWV3cG9ydCByZWN0YW5nbGUgb24gdGhlIG1pbmltYXBcblx0XHR2YXIgcmVmcmVzaFZpZXdwb3J0ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIGV4dGVudCA9IG1hcC5nZXRWaWV3KCkuY2FsY3VsYXRlRXh0ZW50KG1hcC5nZXRTaXplKCkpO1xuXHRcdFx0dmlld3BvcnQuc2V0R2VvbWV0cnkob2wuZ2VvbS5Qb2x5Z29uLmZyb21FeHRlbnQoZXh0ZW50KSk7XG5cdFx0fTtcblxuXHRcdG1hcC5vbignbW92ZWVuZCcsIHJlZnJlc2hWaWV3cG9ydCk7XG5cblx0XHR2YXIgZHJhZ1ZpZXdwb3J0ID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdG1hcC5nZXRWaWV3KCkuc2V0Q2VudGVyKGUuY29vcmRpbmF0ZSk7XG5cdFx0fTtcblxuXHRcdG1pbmltYXAub24oJ3BvaW50ZXJkcmFnJywgZHJhZ1ZpZXdwb3J0KTtcblxuXHRcdCRlbGVtZW50Lm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0bWluaW1hcC51bigncG9pbnRlcmRyYWcnLCBkcmFnVmlld3BvcnQpO1xuXHRcdH0pO1xuXG5cdFx0JGVsZW1lbnQub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRtaW5pbWFwLm9uKCdwb2ludGVyZHJhZycsIGRyYWdWaWV3cG9ydCk7XG5cdFx0fSk7XG5cdH1cbik7IiwiLyoqXG4gKiBAbmFtZXNwYWNlIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBuZ2RvYyBjb250cm9sbGVyXG4gKiBAbmFtZSBTaWRlYmFyQ29udHJvbGxlclxuICogQG1lbWJlck9mIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBkZXNjcmlwdGlvbiBDb250cm9sbGVyIGZvciB0aGUgc2lkZWJhclxuICovXG5hbmd1bGFyLm1vZHVsZSgnZGlhcy5hbm5vdGF0aW9ucycpLmNvbnRyb2xsZXIoJ1NpZGViYXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHJvb3RTY29wZSwgbWFwQW5ub3RhdGlvbnMpIHtcblx0XHRcInVzZSBzdHJpY3RcIjtcblxuXHRcdC8vIHRoZSBjdXJyZW50bHkgb3BlbmVkIHNpZGViYXItJ2V4dGVuc2lvbidcblx0XHQkc2NvcGUuZm9sZG91dCA9ICcnO1xuXG5cdFx0JHNjb3BlLm9wZW5Gb2xkb3V0ID0gZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRcdCRzY29wZS5mb2xkb3V0ID0gbmFtZTtcblx0XHRcdCRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2lkZWJhci5mb2xkb3V0Lm9wZW4nKTtcblx0XHR9O1xuXG5cdFx0JHNjb3BlLmNsb3NlRm9sZG91dCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdCRzY29wZS5mb2xkb3V0ID0gJyc7XG5cdFx0XHQkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3NpZGViYXIuZm9sZG91dC5jbG9zZScpO1xuXHRcdH07XG5cblx0XHQkc2NvcGUudG9nZ2xlRm9sZG91dCA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRpZiAoJHNjb3BlLmZvbGRvdXQgPT09IG5hbWUpIHtcblx0XHRcdFx0JHNjb3BlLmNsb3NlRm9sZG91dCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JHNjb3BlLm9wZW5Gb2xkb3V0KG5hbWUpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQkc2NvcGUuZGVsZXRlU2VsZWN0ZWRBbm5vdGF0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChtYXBBbm5vdGF0aW9ucy5nZXRTZWxlY3RlZEZlYXR1cmVzKCkuZ2V0TGVuZ3RoKCkgPiAwICYmIGNvbmZpcm0oJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgYWxsIHNlbGVjdGVkIGFubm90YXRpb25zPycpKSB7XG4gICAgICAgICAgICAgICAgbWFwQW5ub3RhdGlvbnMuZGVsZXRlU2VsZWN0ZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbignc2lkZWJhci5mb2xkb3V0LmRvLW9wZW4nLCBmdW5jdGlvbiAoZSwgbmFtZSkge1xuICAgICAgICAgICAgJHNjb3BlLm9wZW5Gb2xkb3V0KG5hbWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJG9uKCdrZXlwcmVzcycsIGZ1bmN0aW9uIChlLCBrZXlFdmVudCkge1xuICAgICAgICAgICAgaWYgKGtleUV2ZW50LmtleUNvZGUgPT09IDQ2KSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmRlbGV0ZVNlbGVjdGVkQW5ub3RhdGlvbnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cdH1cbik7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgZGlhcy5hbm5vdGF0aW9uc1xuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgYW5ub3RhdGlvbkxpc3RJdGVtXG4gKiBAbWVtYmVyT2YgZGlhcy5hbm5vdGF0aW9uc1xuICogQGRlc2NyaXB0aW9uIEFuIGFubm90YXRpb24gbGlzdCBpdGVtLlxuICovXG5hbmd1bGFyLm1vZHVsZSgnZGlhcy5hbm5vdGF0aW9ucycpLmRpcmVjdGl2ZSgnYW5ub3RhdGlvbkxpc3RJdGVtJywgZnVuY3Rpb24gKGxhYmVscykge1xuXHRcdFwidXNlIHN0cmljdFwiO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHNjb3BlOiB0cnVlLFxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSkge1xuXHRcdFx0XHQkc2NvcGUuc2hhcGVDbGFzcyA9ICdpY29uLScgKyAkc2NvcGUuYW5ub3RhdGlvbi5zaGFwZS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0XHRcdCRzY29wZS5zZWxlY3RlZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gJHNjb3BlLmlzU2VsZWN0ZWQoJHNjb3BlLmFubm90YXRpb24uaWQpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS5hdHRhY2hMYWJlbCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRsYWJlbHMuYXR0YWNoVG9Bbm5vdGF0aW9uKCRzY29wZS5hbm5vdGF0aW9uKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkc2NvcGUucmVtb3ZlTGFiZWwgPSBmdW5jdGlvbiAobGFiZWwpIHtcblx0XHRcdFx0XHRsYWJlbHMucmVtb3ZlRnJvbUFubm90YXRpb24oJHNjb3BlLmFubm90YXRpb24sIGxhYmVsKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkc2NvcGUuY2FuQXR0YWNoTGFiZWwgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuICRzY29wZS5zZWxlY3RlZCgpICYmIGxhYmVscy5oYXNTZWxlY3RlZCgpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS5jdXJyZW50TGFiZWwgPSBsYWJlbHMuZ2V0U2VsZWN0ZWQ7XG5cblx0XHRcdFx0JHNjb3BlLmN1cnJlbnRDb25maWRlbmNlID0gbGFiZWxzLmdldEN1cnJlbnRDb25maWRlbmNlO1xuXHRcdFx0fVxuXHRcdH07XG5cdH1cbik7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgZGlhcy5hbm5vdGF0aW9uc1xuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgbGFiZWxDYXRlZ29yeUl0ZW1cbiAqIEBtZW1iZXJPZiBkaWFzLmFubm90YXRpb25zXG4gKiBAZGVzY3JpcHRpb24gQSBsYWJlbCBjYXRlZ29yeSBsaXN0IGl0ZW0uXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdkaWFzLmFubm90YXRpb25zJykuZGlyZWN0aXZlKCdsYWJlbENhdGVnb3J5SXRlbScsIGZ1bmN0aW9uICgkY29tcGlsZSwgJHRpbWVvdXQsICR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0MnLFxuXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2xhYmVsLWl0ZW0uaHRtbCcsXG5cbiAgICAgICAgICAgIHNjb3BlOiB0cnVlLFxuXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgdGhpcyBlbGVtZW50IHRvIGJlIHJlbmRlcmVkIHVudGlsIHRoZSBjaGlsZHJlbiBhcmVcbiAgICAgICAgICAgICAgICAvLyBhcHBlbmRlZCwgb3RoZXJ3aXNlIHRoZXJlIHdvdWxkIGJlIHRvbyBtdWNoIHJlY3Vyc2lvbiBmb3JcbiAgICAgICAgICAgICAgICAvLyBhbmd1bGFyXG4gICAgICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSBhbmd1bGFyLmVsZW1lbnQoJHRlbXBsYXRlQ2FjaGUuZ2V0KCdsYWJlbC1zdWJ0cmVlLmh0bWwnKSk7XG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZCgkY29tcGlsZShjb250ZW50KShzY29wZSkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSkge1xuICAgICAgICAgICAgICAgIC8vIG9wZW4gdGhlIHN1YnRyZWUgb2YgdGhpcyBpdGVtXG4gICAgICAgICAgICAgICAgJHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXRlbSBoYXMgY2hpbGRyZW5cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNFeHBhbmRhYmxlID0gISEkc2NvcGUudHJlZVskc2NvcGUuaXRlbS5pZF07XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpdGVtIGlzIGN1cnJlbnRseSBzZWxlY3RlZFxuICAgICAgICAgICAgICAgICRzY29wZS5pc1NlbGVjdGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAvLyBoYW5kbGUgdGhpcyBieSB0aGUgZXZlbnQgcmF0aGVyIHRoYW4gYW4gb3duIGNsaWNrIGhhbmRsZXIgdG9cbiAgICAgICAgICAgICAgICAvLyBkZWFsIHdpdGggY2xpY2sgYW5kIHNlYXJjaCBmaWVsZCBhY3Rpb25zIGluIGEgdW5pZmllZCB3YXlcbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdjYXRlZ29yaWVzLnNlbGVjdGVkJywgZnVuY3Rpb24gKGUsIGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIGFuIGl0ZW0gaXMgc2VsZWN0ZWQsIGl0cyBzdWJ0cmVlIGFuZCBhbGwgcGFyZW50IGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBvcGVuZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5pdGVtLmlkID09PSBjYXRlZ29yeS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlzT3BlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNTZWxlY3RlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGhpdHMgYWxsIHBhcmVudCBzY29wZXMvaXRlbXNcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnY2F0ZWdvcmllcy5vcGVuUGFyZW50cycpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlzU2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gaWYgYSBjaGlsZCBpdGVtIHdhcyBzZWxlY3RlZCwgdGhpcyBpdGVtIHNob3VsZCBiZSBvcGVuZWQsIHRvb1xuICAgICAgICAgICAgICAgIC8vIHNvIHRoZSBzZWxlY3RlZCBpdGVtIGJlY29tZXMgdmlzaWJsZSBpbiB0aGUgdHJlZVxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2NhdGVnb3JpZXMub3BlblBhcmVudHMnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNPcGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3RvcCBwcm9wYWdhdGlvbiBpZiB0aGlzIGlzIGEgcm9vdCBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuaXRlbS5wYXJlbnRfaWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4pO1xuIiwiLyoqXG4gKiBAbmFtZXNwYWNlIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIGxhYmVsSXRlbVxuICogQG1lbWJlck9mIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBkZXNjcmlwdGlvbiBBbiBhbm5vdGF0aW9uIGxhYmVsIGxpc3QgaXRlbS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2RpYXMuYW5ub3RhdGlvbnMnKS5kaXJlY3RpdmUoJ2xhYmVsSXRlbScsIGZ1bmN0aW9uICgpIHtcblx0XHRcInVzZSBzdHJpY3RcIjtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlKSB7XG5cdFx0XHRcdHZhciBjb25maWRlbmNlID0gJHNjb3BlLmFubm90YXRpb25MYWJlbC5jb25maWRlbmNlO1xuXG5cdFx0XHRcdGlmIChjb25maWRlbmNlIDw9IDAuMjUpIHtcblx0XHRcdFx0XHQkc2NvcGUuY2xhc3MgPSAnbGFiZWwtZGFuZ2VyJztcblx0XHRcdFx0fSBlbHNlIGlmIChjb25maWRlbmNlIDw9IDAuNSApIHtcblx0XHRcdFx0XHQkc2NvcGUuY2xhc3MgPSAnbGFiZWwtd2FybmluZyc7XG5cdFx0XHRcdH0gZWxzZSBpZiAoY29uZmlkZW5jZSA8PSAwLjc1ICkge1xuXHRcdFx0XHRcdCRzY29wZS5jbGFzcyA9ICdsYWJlbC1zdWNjZXNzJztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkc2NvcGUuY2xhc3MgPSAnbGFiZWwtcHJpbWFyeSc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHR9XG4pO1xuIiwiLyoqXG4gKiBAbmFtZXNwYWNlIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBuZ2RvYyBmYWN0b3J5XG4gKiBAbmFtZSBkZWJvdW5jZVxuICogQG1lbWJlck9mIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBkZXNjcmlwdGlvbiBBIGRlYm91bmNlIHNlcnZpY2UgdG8gcGVyZm9ybSBhbiBhY3Rpb24gb25seSB3aGVuIHRoaXMgZnVuY3Rpb25cbiAqIHdhc24ndCBjYWxsZWQgYWdhaW4gaW4gYSBzaG9ydCBwZXJpb2Qgb2YgdGltZS5cbiAqIHNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMzMyMDAxNi8xNzk2NTIzXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdkaWFzLmFubm90YXRpb25zJykuZmFjdG9yeSgnZGVib3VuY2UnLCBmdW5jdGlvbiAoJHRpbWVvdXQsICRxKSB7XG5cdFx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0XHR2YXIgdGltZW91dHMgPSB7fTtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoZnVuYywgd2FpdCwgaWQpIHtcblx0XHRcdC8vIENyZWF0ZSBhIGRlZmVycmVkIG9iamVjdCB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgd2hlbiB3ZSBuZWVkIHRvXG5cdFx0XHQvLyBhY3R1YWxseSBjYWxsIHRoZSBmdW5jXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXHRcdFx0cmV0dXJuIChmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGNvbnRleHQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xuXHRcdFx0XHR2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR0aW1lb3V0c1tpZF0gPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpKTtcblx0XHRcdFx0XHRkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdGlmICh0aW1lb3V0c1tpZF0pIHtcblx0XHRcdFx0XHQkdGltZW91dC5jYW5jZWwodGltZW91dHNbaWRdKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aW1lb3V0c1tpZF0gPSAkdGltZW91dChsYXRlciwgd2FpdCk7XG5cdFx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdFx0fSkoKTtcblx0XHR9O1xuXHR9XG4pOyIsIi8qKlxuICogQG5hbWVzcGFjZSBkaWFzLmFubm90YXRpb25zXG4gKiBAbmdkb2MgZmFjdG9yeVxuICogQG5hbWUgbWFwXG4gKiBAbWVtYmVyT2YgZGlhcy5hbm5vdGF0aW9uc1xuICogQGRlc2NyaXB0aW9uIFdyYXBwZXIgZmFjdG9yeSBoYW5kbGluZyBPcGVuTGF5ZXJzIG1hcFxuICovXG5hbmd1bGFyLm1vZHVsZSgnZGlhcy5hbm5vdGF0aW9ucycpLmZhY3RvcnkoJ21hcCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcInVzZSBzdHJpY3RcIjtcblxuXHRcdHZhciBtYXAgPSBuZXcgb2wuTWFwKHtcblx0XHRcdHRhcmdldDogJ2NhbnZhcycsXG5cdFx0XHRjb250cm9sczogW1xuXHRcdFx0XHRuZXcgb2wuY29udHJvbC5ab29tKCksXG5cdFx0XHRcdG5ldyBvbC5jb250cm9sLlpvb21Ub0V4dGVudCgpLFxuXHRcdFx0XHRuZXcgb2wuY29udHJvbC5GdWxsU2NyZWVuKClcblx0XHRcdF1cblx0XHR9KTtcblxuXHRcdHJldHVybiBtYXA7XG5cdH1cbik7IiwiLyoqXG4gKiBAbmFtZXNwYWNlIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSBhbm5vdGF0aW9uc1xuICogQG1lbWJlck9mIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBkZXNjcmlwdGlvbiBXcmFwcGVyIHNlcnZpY2UgdGhlIGFubm90YXRpb25zIHRvIG1ha2UgdGhlbSBhdmFpbGFibGUgaW4gbXVsdGlwbGUgY29udHJvbGxlcnMuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdkaWFzLmFubm90YXRpb25zJykuc2VydmljZSgnYW5ub3RhdGlvbnMnLCBmdW5jdGlvbiAoQW5ub3RhdGlvbiwgc2hhcGVzLCBsYWJlbHMsIG1zZykge1xuXHRcdFwidXNlIHN0cmljdFwiO1xuXG5cdFx0dmFyIGFubm90YXRpb25zO1xuXG5cdFx0dmFyIHJlc29sdmVTaGFwZU5hbWUgPSBmdW5jdGlvbiAoYW5ub3RhdGlvbikge1xuXHRcdFx0YW5ub3RhdGlvbi5zaGFwZSA9IHNoYXBlcy5nZXROYW1lKGFubm90YXRpb24uc2hhcGVfaWQpO1xuXHRcdFx0cmV0dXJuIGFubm90YXRpb247XG5cdFx0fTtcblxuXHRcdHZhciBhZGRBbm5vdGF0aW9uID0gZnVuY3Rpb24gKGFubm90YXRpb24pIHtcblx0XHRcdGFubm90YXRpb25zLnB1c2goYW5ub3RhdGlvbik7XG5cdFx0XHRyZXR1cm4gYW5ub3RhdGlvbjtcblx0XHR9O1xuXG5cdFx0dGhpcy5xdWVyeSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcblx0XHRcdGFubm90YXRpb25zID0gQW5ub3RhdGlvbi5xdWVyeShwYXJhbXMpO1xuXHRcdFx0YW5ub3RhdGlvbnMuJHByb21pc2UudGhlbihmdW5jdGlvbiAoYSkge1xuXHRcdFx0XHRhLmZvckVhY2gocmVzb2x2ZVNoYXBlTmFtZSk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBhbm5vdGF0aW9ucztcblx0XHR9O1xuXG5cdFx0dGhpcy5hZGQgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG5cdFx0XHRpZiAoIXBhcmFtcy5zaGFwZV9pZCAmJiBwYXJhbXMuc2hhcGUpIHtcblx0XHRcdFx0cGFyYW1zLnNoYXBlX2lkID0gc2hhcGVzLmdldElkKHBhcmFtcy5zaGFwZSk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgbGFiZWwgPSBsYWJlbHMuZ2V0U2VsZWN0ZWQoKTtcblx0XHRcdHBhcmFtcy5sYWJlbF9pZCA9IGxhYmVsLmlkO1xuXHRcdFx0cGFyYW1zLmNvbmZpZGVuY2UgPSBsYWJlbHMuZ2V0Q3VycmVudENvbmZpZGVuY2UoKTtcblx0XHRcdHZhciBhbm5vdGF0aW9uID0gQW5ub3RhdGlvbi5hZGQocGFyYW1zKTtcblx0XHRcdGFubm90YXRpb24uJHByb21pc2Vcblx0XHRcdCAgICAgICAgICAudGhlbihyZXNvbHZlU2hhcGVOYW1lKVxuXHRcdFx0ICAgICAgICAgIC50aGVuKGFkZEFubm90YXRpb24pXG5cdFx0XHQgICAgICAgICAgLmNhdGNoKG1zZy5yZXNwb25zZUVycm9yKTtcblxuXHRcdFx0cmV0dXJuIGFubm90YXRpb247XG5cdFx0fTtcblxuXHRcdHRoaXMuZGVsZXRlID0gZnVuY3Rpb24gKGFubm90YXRpb24pIHtcblx0XHRcdC8vIHVzZSBpbmRleCB0byBzZWUgaWYgdGhlIGFubm90YXRpb24gZXhpc3RzIGluIHRoZSBhbm5vdGF0aW9ucyBsaXN0XG5cdFx0XHR2YXIgaW5kZXggPSBhbm5vdGF0aW9ucy5pbmRleE9mKGFubm90YXRpb24pO1xuXHRcdFx0aWYgKGluZGV4ID4gLTEpIHtcblx0XHRcdFx0cmV0dXJuIGFubm90YXRpb24uJGRlbGV0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBpbmRleCBzaW5jZSB0aGUgYW5ub3RhdGlvbnMgbGlzdCBtYXkgaGF2ZSBiZWVuIFxuXHRcdFx0XHRcdC8vIG1vZGlmaWVkIGluIHRoZSBtZWFudGltZVxuXHRcdFx0XHRcdGluZGV4ID0gYW5ub3RhdGlvbnMuaW5kZXhPZihhbm5vdGF0aW9uKTtcblx0XHRcdFx0XHRhbm5vdGF0aW9ucy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHR9LCBtc2cucmVzcG9uc2VFcnJvcik7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuZm9yRWFjaCA9IGZ1bmN0aW9uIChmbikge1xuXHRcdFx0cmV0dXJuIGFubm90YXRpb25zLmZvckVhY2goZm4pO1xuXHRcdH07XG5cblx0XHR0aGlzLmN1cnJlbnQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gYW5ub3RhdGlvbnM7XG5cdFx0fTtcblx0fVxuKTsiLCIvKipcbiAqIEBuYW1lc3BhY2UgZGlhcy5hbm5vdGF0aW9uc1xuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIGltYWdlc1xuICogQG1lbWJlck9mIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBkZXNjcmlwdGlvbiBNYW5hZ2VzIChwcmUtKWxvYWRpbmcgb2YgdGhlIGltYWdlcyB0byBhbm5vdGF0ZS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2RpYXMuYW5ub3RhdGlvbnMnKS5zZXJ2aWNlKCdpbWFnZXMnLCBmdW5jdGlvbiAoVHJhbnNlY3RJbWFnZSwgVVJMLCAkcSkge1xuXHRcdFwidXNlIHN0cmljdFwiO1xuXG5cdFx0dmFyIF90aGlzID0gdGhpcztcblx0XHQvLyBhcnJheSBvZiBhbGwgaW1hZ2UgSURzIG9mIHRoZSB0cmFuc2VjdFxuXHRcdHZhciBpbWFnZUlkcyA9IFtdO1xuXHRcdC8vIG1heGltdW0gbnVtYmVyIG9mIGltYWdlcyB0byBob2xkIGluIGJ1ZmZlclxuXHRcdHZhciBNQVhfQlVGRkVSX1NJWkUgPSAxMDtcblx0XHQvLyBidWZmZXIgb2YgYWxyZWFkeSBsb2FkZWQgaW1hZ2VzXG5cdFx0dmFyIGJ1ZmZlciA9IFtdO1xuXG5cdFx0Ly8gdGhlIGN1cnJlbnRseSBzaG93biBpbWFnZVxuXHRcdHRoaXMuY3VycmVudEltYWdlID0gdW5kZWZpbmVkO1xuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgbmV4dCBJRCBvZiB0aGUgc3BlY2lmaWVkIGltYWdlIG9yIHRoZSBuZXh0IElEIG9mIHRoZSBcblx0XHQgKiBjdXJyZW50IGltYWdlIGlmIG5vIGltYWdlIHdhcyBzcGVjaWZpZWQuXG5cdFx0ICovXG5cdFx0dmFyIG5leHRJZCA9IGZ1bmN0aW9uIChpZCkge1xuXHRcdFx0aWQgPSBpZCB8fCBfdGhpcy5jdXJyZW50SW1hZ2UuX2lkO1xuXHRcdFx0dmFyIGluZGV4ID0gaW1hZ2VJZHMuaW5kZXhPZihpZCk7XG5cdFx0XHRyZXR1cm4gaW1hZ2VJZHNbKGluZGV4ICsgMSkgJSBpbWFnZUlkcy5sZW5ndGhdO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIHRoZSBwcmV2aW91cyBJRCBvZiB0aGUgc3BlY2lmaWVkIGltYWdlIG9yIHRoZSBwcmV2aW91cyBJRCBvZlxuXHRcdCAqIHRoZSBjdXJyZW50IGltYWdlIGlmIG5vIGltYWdlIHdhcyBzcGVjaWZpZWQuXG5cdFx0ICovXG5cdFx0dmFyIHByZXZJZCA9IGZ1bmN0aW9uIChpZCkge1xuXHRcdFx0aWQgPSBpZCB8fCBfdGhpcy5jdXJyZW50SW1hZ2UuX2lkO1xuXHRcdFx0dmFyIGluZGV4ID0gaW1hZ2VJZHMuaW5kZXhPZihpZCk7XG5cdFx0XHR2YXIgbGVuZ3RoID0gaW1hZ2VJZHMubGVuZ3RoO1xuXHRcdFx0cmV0dXJuIGltYWdlSWRzWyhpbmRleCAtIDEgKyBsZW5ndGgpICUgbGVuZ3RoXTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgc3BlY2lmaWVkIGltYWdlIGZyb20gdGhlIGJ1ZmZlciBvciBgdW5kZWZpbmVkYCBpZiBpdCBpc1xuXHRcdCAqIG5vdCBidWZmZXJlZC5cblx0XHQgKi9cblx0XHR2YXIgZ2V0SW1hZ2UgPSBmdW5jdGlvbiAoaWQpIHtcblx0XHRcdGlkID0gaWQgfHwgX3RoaXMuY3VycmVudEltYWdlLl9pZDtcblx0XHRcdGZvciAodmFyIGkgPSBidWZmZXIubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdFx0aWYgKGJ1ZmZlcltpXS5faWQgPT0gaWQpIHJldHVybiBidWZmZXJbaV07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFNldHMgdGhlIHNwZWNpZmllZCBpbWFnZSB0byBhcyB0aGUgY3VycmVudGx5IHNob3duIGltYWdlLlxuXHRcdCAqL1xuXHRcdHZhciBzaG93ID0gZnVuY3Rpb24gKGlkKSB7XG5cdFx0XHRfdGhpcy5jdXJyZW50SW1hZ2UgPSBnZXRJbWFnZShpZCk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIExvYWRzIHRoZSBzcGVjaWZpZWQgaW1hZ2UgZWl0aGVyIGZyb20gYnVmZmVyIG9yIGZyb20gdGhlIGV4dGVybmFsIFxuXHRcdCAqIHJlc291cmNlLiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IGdldHMgcmVzb2x2ZWQgd2hlbiB0aGUgaW1hZ2UgaXNcblx0XHQgKiBsb2FkZWQuXG5cdFx0ICovXG5cdFx0dmFyIGZldGNoSW1hZ2UgPSBmdW5jdGlvbiAoaWQpIHtcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHR2YXIgaW1nID0gZ2V0SW1hZ2UoaWQpO1xuXG5cdFx0XHRpZiAoaW1nKSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoaW1nKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdFx0XHRpbWcuX2lkID0gaWQ7XG5cdFx0XHRcdGltZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0YnVmZmVyLnB1c2goaW1nKTtcblx0XHRcdFx0XHQvLyBjb250cm9sIG1heGltdW0gYnVmZmVyIHNpemVcblx0XHRcdFx0XHRpZiAoYnVmZmVyLmxlbmd0aCA+IE1BWF9CVUZGRVJfU0laRSkge1xuXHRcdFx0XHRcdFx0YnVmZmVyLnNoaWZ0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoaW1nKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0aW1nLm9uZXJyb3IgPSBmdW5jdGlvbiAobXNnKSB7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KG1zZyk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdGltZy5zcmMgPSBVUkwgKyBcIi9hcGkvdjEvaW1hZ2VzL1wiICsgaWQgKyBcIi9maWxlXCI7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBJbml0aWFsaXplcyB0aGUgc2VydmljZSBmb3IgYSBnaXZlbiB0cmFuc2VjdC4gUmV0dXJucyBhIHByb21pc2UgdGhhdFxuXHRcdCAqIGlzIHJlc29sdmVkLCB3aGVuIHRoZSBzZXJ2aWNlIGlzIGluaXRpYWxpemVkLlxuXHRcdCAqL1xuXHRcdHRoaXMuaW5pdCA9IGZ1bmN0aW9uICh0cmFuc2VjdElkKSB7XG5cdFx0XHRpbWFnZUlkcyA9IFRyYW5zZWN0SW1hZ2UucXVlcnkoe3RyYW5zZWN0X2lkOiB0cmFuc2VjdElkfSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBpbWFnZUlkcy4kcHJvbWlzZTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogU2hvdyB0aGUgaW1hZ2Ugd2l0aCB0aGUgc3BlY2lmaWVkIElELiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IGlzXG5cdFx0ICogcmVzb2x2ZWQgd2hlbiB0aGUgaW1hZ2UgaXMgc2hvd24uXG5cdFx0ICovXG5cdFx0dGhpcy5zaG93ID0gZnVuY3Rpb24gKGlkKSB7XG5cdFx0XHR2YXIgcHJvbWlzZSA9IGZldGNoSW1hZ2UoaWQpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNob3coaWQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIHdhaXQgZm9yIGltYWdlSWRzIHRvIGJlIGxvYWRlZFxuXHRcdFx0aW1hZ2VJZHMuJHByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdC8vIHByZS1sb2FkIHByZXZpb3VzIGFuZCBuZXh0IGltYWdlcyBidXQgZG9uJ3QgZGlzcGxheSB0aGVtXG5cdFx0XHRcdGZldGNoSW1hZ2UobmV4dElkKGlkKSk7XG5cdFx0XHRcdGZldGNoSW1hZ2UocHJldklkKGlkKSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHByb21pc2U7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFNob3cgdGhlIG5leHQgaW1hZ2UuIFJldHVybnMgYSBwcm9taXNlIHRoYXQgaXNcblx0XHQgKiByZXNvbHZlZCB3aGVuIHRoZSBpbWFnZSBpcyBzaG93bi5cblx0XHQgKi9cblx0XHR0aGlzLm5leHQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gX3RoaXMuc2hvdyhuZXh0SWQoKSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFNob3cgdGhlIHByZXZpb3VzIGltYWdlLiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IGlzXG5cdFx0ICogcmVzb2x2ZWQgd2hlbiB0aGUgaW1hZ2UgaXMgc2hvd24uXG5cdFx0ICovXG5cdFx0dGhpcy5wcmV2ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIF90aGlzLnNob3cocHJldklkKCkpO1xuXHRcdH07XG5cblx0XHR0aGlzLmdldEN1cnJlbnRJZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBfdGhpcy5jdXJyZW50SW1hZ2UuX2lkO1xuXHRcdH07XG5cdH1cbik7IiwiLyoqXG4gKiBAbmFtZXNwYWNlIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSBsYWJlbHNcbiAqIEBtZW1iZXJPZiBkaWFzLmFubm90YXRpb25zXG4gKiBAZGVzY3JpcHRpb24gV3JhcHBlciBzZXJ2aWNlIGZvciBhbm5vdGF0aW9uIGxhYmVscyB0byBwcm92aWRlIHNvbWUgY29udmVuaWVuY2UgZnVuY3Rpb25zLlxuICovXG5hbmd1bGFyLm1vZHVsZSgnZGlhcy5hbm5vdGF0aW9ucycpLnNlcnZpY2UoJ2xhYmVscycsIGZ1bmN0aW9uIChBbm5vdGF0aW9uTGFiZWwsIExhYmVsLCBQcm9qZWN0TGFiZWwsIFByb2plY3QsIG1zZywgJHEpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAgICAgdmFyIHNlbGVjdGVkTGFiZWw7XG4gICAgICAgIHZhciBjdXJyZW50Q29uZmlkZW5jZSA9IDEuMDtcblxuICAgICAgICB2YXIgbGFiZWxzID0ge307XG5cbiAgICAgICAgLy8gdGhpcyBwcm9taXNlIGlzIHJlc29sdmVkIHdoZW4gYWxsIGxhYmVscyB3ZXJlIGxvYWRlZFxuICAgICAgICB0aGlzLnByb21pc2UgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuc2V0UHJvamVjdElkcyA9IGZ1bmN0aW9uIChpZHMpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICB0aGlzLnByb21pc2UgPSBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgICAgLy8gLTEgYmNhdXNlIG9mIGdsb2JhbCBsYWJlbHNcbiAgICAgICAgICAgIHZhciBmaW5pc2hlZCA9IC0xO1xuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiBhbGwgbGFiZWxzIGFyZSB0aGVyZS4gaWYgeWVzLCByZXNvbHZlXG4gICAgICAgICAgICB2YXIgbWF5YmVSZXNvbHZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICgrK2ZpbmlzaGVkID09PSBpZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUobGFiZWxzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBsYWJlbHNbbnVsbF0gPSBMYWJlbC5xdWVyeShtYXliZVJlc29sdmUpO1xuXG4gICAgICAgICAgICBpZHMuZm9yRWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBQcm9qZWN0LmdldCh7aWQ6IGlkfSwgZnVuY3Rpb24gKHByb2plY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgbGFiZWxzW3Byb2plY3QubmFtZV0gPSBQcm9qZWN0TGFiZWwucXVlcnkoe3Byb2plY3RfaWQ6IGlkfSwgbWF5YmVSZXNvbHZlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZmV0Y2hGb3JBbm5vdGF0aW9uID0gZnVuY3Rpb24gKGFubm90YXRpb24pIHtcbiAgICAgICAgICAgIGlmICghYW5ub3RhdGlvbikgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBkb24ndCBmZXRjaCB0d2ljZVxuICAgICAgICAgICAgaWYgKCFhbm5vdGF0aW9uLmxhYmVscykge1xuICAgICAgICAgICAgICAgIGFubm90YXRpb24ubGFiZWxzID0gQW5ub3RhdGlvbkxhYmVsLnF1ZXJ5KHtcbiAgICAgICAgICAgICAgICAgICAgYW5ub3RhdGlvbl9pZDogYW5ub3RhdGlvbi5pZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gYW5ub3RhdGlvbi5sYWJlbHM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5hdHRhY2hUb0Fubm90YXRpb24gPSBmdW5jdGlvbiAoYW5ub3RhdGlvbikge1xuICAgICAgICAgICAgdmFyIGxhYmVsID0gQW5ub3RhdGlvbkxhYmVsLmF0dGFjaCh7XG4gICAgICAgICAgICAgICAgYW5ub3RhdGlvbl9pZDogYW5ub3RhdGlvbi5pZCxcbiAgICAgICAgICAgICAgICBsYWJlbF9pZDogc2VsZWN0ZWRMYWJlbC5pZCxcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlOiBjdXJyZW50Q29uZmlkZW5jZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGxhYmVsLiRwcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGFubm90YXRpb24ubGFiZWxzLnB1c2gobGFiZWwpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGxhYmVsLiRwcm9taXNlLmNhdGNoKG1zZy5yZXNwb25zZUVycm9yKTtcblxuICAgICAgICAgICAgcmV0dXJuIGxhYmVsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMucmVtb3ZlRnJvbUFubm90YXRpb24gPSBmdW5jdGlvbiAoYW5ub3RhdGlvbiwgbGFiZWwpIHtcbiAgICAgICAgICAgIC8vIHVzZSBpbmRleCB0byBzZWUgaWYgdGhlIGxhYmVsIGV4aXN0cyBmb3IgdGhlIGFubm90YXRpb25cbiAgICAgICAgICAgIHZhciBpbmRleCA9IGFubm90YXRpb24ubGFiZWxzLmluZGV4T2YobGFiZWwpO1xuICAgICAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWwuJGRlbGV0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgaW5kZXggc2luY2UgdGhlIGxhYmVsIGxpc3QgbWF5IGhhdmUgYmVlbiBtb2RpZmllZFxuICAgICAgICAgICAgICAgICAgICAvLyBpbiB0aGUgbWVhbnRpbWVcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSBhbm5vdGF0aW9uLmxhYmVscy5pbmRleE9mKGxhYmVsKTtcbiAgICAgICAgICAgICAgICAgICAgYW5ub3RhdGlvbi5sYWJlbHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICB9LCBtc2cucmVzcG9uc2VFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRUcmVlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRyZWUgPSB7fTtcbiAgICAgICAgICAgIHZhciBrZXkgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGJ1aWxkID0gZnVuY3Rpb24gKGxhYmVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudCA9IGxhYmVsLnBhcmVudF9pZDtcbiAgICAgICAgICAgICAgICBpZiAodHJlZVtrZXldW3BhcmVudF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdHJlZVtrZXldW3BhcmVudF0ucHVzaChsYWJlbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHJlZVtrZXldW3BhcmVudF0gPSBbbGFiZWxdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMucHJvbWlzZS50aGVuKGZ1bmN0aW9uIChsYWJlbHMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBsYWJlbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJlZVtrZXldID0ge307XG4gICAgICAgICAgICAgICAgICAgIGxhYmVsc1trZXldLmZvckVhY2goYnVpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gdHJlZTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBsYWJlbHM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zZXRTZWxlY3RlZCA9IGZ1bmN0aW9uIChsYWJlbCkge1xuICAgICAgICAgICAgc2VsZWN0ZWRMYWJlbCA9IGxhYmVsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0U2VsZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0ZWRMYWJlbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmhhc1NlbGVjdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhc2VsZWN0ZWRMYWJlbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNldEN1cnJlbnRDb25maWRlbmNlID0gZnVuY3Rpb24gKGNvbmZpZGVuY2UpIHtcbiAgICAgICAgICAgIGN1cnJlbnRDb25maWRlbmNlID0gY29uZmlkZW5jZTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldEN1cnJlbnRDb25maWRlbmNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRDb25maWRlbmNlO1xuICAgICAgICB9O1xuICAgIH1cbik7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgZGlhcy5hbm5vdGF0aW9uc1xuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIG1hcEFubm90YXRpb25zXG4gKiBAbWVtYmVyT2YgZGlhcy5hbm5vdGF0aW9uc1xuICogQGRlc2NyaXB0aW9uIFdyYXBwZXIgc2VydmljZSBoYW5kbGluZyB0aGUgYW5ub3RhdGlvbnMgbGF5ZXIgb24gdGhlIE9wZW5MYXllcnMgbWFwXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdkaWFzLmFubm90YXRpb25zJykuc2VydmljZSgnbWFwQW5ub3RhdGlvbnMnLCBmdW5jdGlvbiAobWFwLCBpbWFnZXMsIGFubm90YXRpb25zLCBkZWJvdW5jZSwgc3R5bGVzKSB7XG5cdFx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0XHR2YXIgZmVhdHVyZU92ZXJsYXkgPSBuZXcgb2wuRmVhdHVyZU92ZXJsYXkoe1xuXHRcdFx0c3R5bGU6IHN0eWxlcy5mZWF0dXJlc1xuXHRcdH0pO1xuXG5cdFx0dmFyIGZlYXR1cmVzID0gbmV3IG9sLkNvbGxlY3Rpb24oKTtcblxuXHRcdGZlYXR1cmVPdmVybGF5LnNldEZlYXR1cmVzKGZlYXR1cmVzKTtcblxuXHRcdC8vIHNlbGVjdCBpbnRlcmFjdGlvbiB3b3JraW5nIG9uIFwic2luZ2xlY2xpY2tcIlxuXHRcdHZhciBzZWxlY3QgPSBuZXcgb2wuaW50ZXJhY3Rpb24uU2VsZWN0KHtcblx0XHRcdHN0eWxlOiBzdHlsZXMuaGlnaGxpZ2h0XG5cdFx0fSk7XG5cblx0XHR2YXIgc2VsZWN0ZWRGZWF0dXJlcyA9IHNlbGVjdC5nZXRGZWF0dXJlcygpO1xuXG5cdFx0dmFyIG1vZGlmeSA9IG5ldyBvbC5pbnRlcmFjdGlvbi5Nb2RpZnkoe1xuXHRcdFx0ZmVhdHVyZXM6IGZlYXR1cmVPdmVybGF5LmdldEZlYXR1cmVzKCksXG5cdFx0XHQvLyB0aGUgU0hJRlQga2V5IG11c3QgYmUgcHJlc3NlZCB0byBkZWxldGUgdmVydGljZXMsIHNvXG5cdFx0XHQvLyB0aGF0IG5ldyB2ZXJ0aWNlcyBjYW4gYmUgZHJhd24gYXQgdGhlIHNhbWUgcG9zaXRpb25cblx0XHRcdC8vIG9mIGV4aXN0aW5nIHZlcnRpY2VzXG5cdFx0XHRkZWxldGVDb25kaXRpb246IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRcdHJldHVybiBvbC5ldmVudHMuY29uZGl0aW9uLnNoaWZ0S2V5T25seShldmVudCkgJiYgb2wuZXZlbnRzLmNvbmRpdGlvbi5zaW5nbGVDbGljayhldmVudCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBkcmF3aW5nIGludGVyYWN0aW9uXG5cdFx0dmFyIGRyYXc7XG5cblx0XHQvLyBjb252ZXJ0IGEgcG9pbnQgYXJyYXkgdG8gYSBwb2ludCBvYmplY3Rcblx0XHQvLyByZS1pbnZlcnQgdGhlIHkgYXhpc1xuXHRcdHZhciBjb252ZXJ0RnJvbU9MUG9pbnQgPSBmdW5jdGlvbiAocG9pbnQpIHtcblx0XHRcdHJldHVybiB7eDogcG9pbnRbMF0sIHk6IGltYWdlcy5jdXJyZW50SW1hZ2UuaGVpZ2h0IC0gcG9pbnRbMV19O1xuXHRcdH07XG5cblx0XHQvLyBjb252ZXJ0IGEgcG9pbnQgb2JqZWN0IHRvIGEgcG9pbnQgYXJyYXlcblx0XHQvLyBpbnZlcnQgdGhlIHkgYXhpc1xuXHRcdHZhciBjb252ZXJ0VG9PTFBvaW50ID0gZnVuY3Rpb24gKHBvaW50KSB7XG5cdFx0XHRyZXR1cm4gW3BvaW50LngsIGltYWdlcy5jdXJyZW50SW1hZ2UuaGVpZ2h0IC0gcG9pbnQueV07XG5cdFx0fTtcblxuXHRcdC8vIGFzc2VtYmxlcyB0aGUgY29vcmRpbmF0ZSBhcnJheXMgZGVwZW5kaW5nIG9uIHRoZSBnZW9tZXRyeSB0eXBlXG5cdFx0Ly8gc28gdGhleSBoYXZlIGEgdW5pZmllZCBmb3JtYXRcblx0XHR2YXIgZ2V0Q29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAoZ2VvbWV0cnkpIHtcblx0XHRcdHN3aXRjaCAoZ2VvbWV0cnkuZ2V0VHlwZSgpKSB7XG5cdFx0XHRcdGNhc2UgJ0NpcmNsZSc6XG5cdFx0XHRcdFx0Ly8gcmFkaXVzIGlzIHRoZSB4IHZhbHVlIG9mIHRoZSBzZWNvbmQgcG9pbnQgb2YgdGhlIGNpcmNsZVxuXHRcdFx0XHRcdHJldHVybiBbZ2VvbWV0cnkuZ2V0Q2VudGVyKCksIFtnZW9tZXRyeS5nZXRSYWRpdXMoKSwgMF1dO1xuXHRcdFx0XHRjYXNlICdQb2x5Z29uJzpcblx0XHRcdFx0Y2FzZSAnUmVjdGFuZ2xlJzpcblx0XHRcdFx0XHRyZXR1cm4gZ2VvbWV0cnkuZ2V0Q29vcmRpbmF0ZXMoKVswXTtcblx0XHRcdFx0Y2FzZSAnUG9pbnQnOlxuXHRcdFx0XHRcdHJldHVybiBbZ2VvbWV0cnkuZ2V0Q29vcmRpbmF0ZXMoKV07XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0cmV0dXJuIGdlb21ldHJ5LmdldENvb3JkaW5hdGVzKCk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIHNhdmVzIHRoZSB1cGRhdGVkIGdlb21ldHJ5IG9mIGFuIGFubm90YXRpb24gZmVhdHVyZVxuXHRcdHZhciBoYW5kbGVHZW9tZXRyeUNoYW5nZSA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR2YXIgZmVhdHVyZSA9IGUudGFyZ2V0O1xuXHRcdFx0dmFyIHNhdmUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZhciBjb29yZGluYXRlcyA9IGdldENvb3JkaW5hdGVzKGZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG5cdFx0XHRcdGZlYXR1cmUuYW5ub3RhdGlvbi5wb2ludHMgPSBjb29yZGluYXRlcy5tYXAoY29udmVydEZyb21PTFBvaW50KTtcblx0XHRcdFx0ZmVhdHVyZS5hbm5vdGF0aW9uLiRzYXZlKCk7XG5cdFx0XHR9O1xuXHRcdFx0Ly8gdGhpcyBldmVudCBpcyByYXBpZGx5IGZpcmVkLCBzbyB3YWl0IHVudGlsIHRoZSBmaXJpbmcgc3RvcHNcblx0XHRcdC8vIGJlZm9yZSBzYXZpbmcgdGhlIGNoYW5nZXNcblx0XHRcdGRlYm91bmNlKHNhdmUsIDUwMCwgZmVhdHVyZS5hbm5vdGF0aW9uLmlkKTtcblx0XHR9O1xuXG5cdFx0dmFyIGNyZWF0ZUZlYXR1cmUgPSBmdW5jdGlvbiAoYW5ub3RhdGlvbikge1xuXHRcdFx0dmFyIGdlb21ldHJ5O1xuXHRcdFx0dmFyIHBvaW50cyA9IGFubm90YXRpb24ucG9pbnRzLm1hcChjb252ZXJ0VG9PTFBvaW50KTtcblxuXHRcdFx0c3dpdGNoIChhbm5vdGF0aW9uLnNoYXBlKSB7XG5cdFx0XHRcdGNhc2UgJ1BvaW50Jzpcblx0XHRcdFx0XHRnZW9tZXRyeSA9IG5ldyBvbC5nZW9tLlBvaW50KHBvaW50c1swXSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ1JlY3RhbmdsZSc6XG5cdFx0XHRcdFx0Z2VvbWV0cnkgPSBuZXcgb2wuZ2VvbS5SZWN0YW5nbGUoWyBwb2ludHMgXSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ1BvbHlnb24nOlxuXHRcdFx0XHRcdC8vIGV4YW1wbGU6IGh0dHBzOi8vZ2l0aHViLmNvbS9vcGVubGF5ZXJzL29sMy9ibG9iL21hc3Rlci9leGFtcGxlcy9nZW9qc29uLmpzI0wxMjZcblx0XHRcdFx0XHRnZW9tZXRyeSA9IG5ldyBvbC5nZW9tLlBvbHlnb24oWyBwb2ludHMgXSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ0xpbmVTdHJpbmcnOlxuXHRcdFx0XHRcdGdlb21ldHJ5ID0gbmV3IG9sLmdlb20uTGluZVN0cmluZyhwb2ludHMpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdDaXJjbGUnOlxuXHRcdFx0XHRcdC8vIHJhZGl1cyBpcyB0aGUgeCB2YWx1ZSBvZiB0aGUgc2Vjb25kIHBvaW50IG9mIHRoZSBjaXJjbGVcblx0XHRcdFx0XHRnZW9tZXRyeSA9IG5ldyBvbC5nZW9tLkNpcmNsZShwb2ludHNbMF0sIHBvaW50c1sxXVswXSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBmZWF0dXJlID0gbmV3IG9sLkZlYXR1cmUoeyBnZW9tZXRyeTogZ2VvbWV0cnkgfSk7XG5cdFx0XHRmZWF0dXJlLm9uKCdjaGFuZ2UnLCBoYW5kbGVHZW9tZXRyeUNoYW5nZSk7XG5cdFx0XHRmZWF0dXJlLmFubm90YXRpb24gPSBhbm5vdGF0aW9uO1xuXHRcdFx0ZmVhdHVyZXMucHVzaChmZWF0dXJlKTtcblx0XHR9O1xuXG5cdFx0dmFyIHJlZnJlc2hBbm5vdGF0aW9ucyA9IGZ1bmN0aW9uIChlLCBpbWFnZSkge1xuXHRcdFx0Ly8gY2xlYXIgZmVhdHVyZXMgb2YgcHJldmlvdXMgaW1hZ2Vcblx0XHRcdGZlYXR1cmVzLmNsZWFyKCk7XG5cdFx0XHRzZWxlY3RlZEZlYXR1cmVzLmNsZWFyKCk7XG5cblx0XHRcdGFubm90YXRpb25zLnF1ZXJ5KHtpZDogaW1hZ2UuX2lkfSkuJHByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGFubm90YXRpb25zLmZvckVhY2goY3JlYXRlRmVhdHVyZSk7XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0dmFyIGhhbmRsZU5ld0ZlYXR1cmUgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dmFyIGdlb21ldHJ5ID0gZS5mZWF0dXJlLmdldEdlb21ldHJ5KCk7XG5cdFx0XHR2YXIgY29vcmRpbmF0ZXMgPSBnZXRDb29yZGluYXRlcyhnZW9tZXRyeSk7XG5cblx0XHRcdGUuZmVhdHVyZS5hbm5vdGF0aW9uID0gYW5ub3RhdGlvbnMuYWRkKHtcblx0XHRcdFx0aWQ6IGltYWdlcy5nZXRDdXJyZW50SWQoKSxcblx0XHRcdFx0c2hhcGU6IGdlb21ldHJ5LmdldFR5cGUoKSxcblx0XHRcdFx0cG9pbnRzOiBjb29yZGluYXRlcy5tYXAoY29udmVydEZyb21PTFBvaW50KVxuXHRcdFx0fSk7XG5cblx0XHRcdC8vIGlmIHRoZSBmZWF0dXJlIGNvdWxkbid0IGJlIHNhdmVkLCByZW1vdmUgaXQgYWdhaW5cblx0XHRcdGUuZmVhdHVyZS5hbm5vdGF0aW9uLiRwcm9taXNlLmNhdGNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZmVhdHVyZXMucmVtb3ZlKGUuZmVhdHVyZSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0ZS5mZWF0dXJlLm9uKCdjaGFuZ2UnLCBoYW5kbGVHZW9tZXRyeUNoYW5nZSk7XG5cdFx0fTtcblxuXHRcdHRoaXMuaW5pdCA9IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0ZmVhdHVyZU92ZXJsYXkuc2V0TWFwKG1hcCk7XG5cdFx0XHRtYXAuYWRkSW50ZXJhY3Rpb24oc2VsZWN0KTtcblx0XHRcdHNjb3BlLiRvbignaW1hZ2Uuc2hvd24nLCByZWZyZXNoQW5ub3RhdGlvbnMpO1xuXG5cdFx0XHRzZWxlY3RlZEZlYXR1cmVzLm9uKCdjaGFuZ2U6bGVuZ3RoJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHQvLyBpZiBub3QgYWxyZWFkeSBkaWdlc3RpbmcsIGRpZ2VzdFxuXHRcdFx0XHRpZiAoIXNjb3BlLiQkcGhhc2UpIHtcblx0XHRcdFx0XHQvLyBwcm9wYWdhdGUgbmV3IHNlbGVjdGlvbnMgdGhyb3VnaCB0aGUgYW5ndWxhciBhcHBsaWNhdGlvblxuXHRcdFx0XHRcdHNjb3BlLiRhcHBseSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0dGhpcy5zdGFydERyYXdpbmcgPSBmdW5jdGlvbiAodHlwZSkge1xuXHRcdFx0bWFwLnJlbW92ZUludGVyYWN0aW9uKHNlbGVjdCk7XG5cblx0XHRcdHR5cGUgPSB0eXBlIHx8ICdQb2ludCc7XG5cdFx0XHRkcmF3ID0gbmV3IG9sLmludGVyYWN0aW9uLkRyYXcoe1xuXHRcdFx0XHRmZWF0dXJlczogZmVhdHVyZXMsXG5cdFx0XHRcdHR5cGU6IHR5cGUsXG5cdFx0XHRcdHN0eWxlOiBzdHlsZXMuZWRpdGluZ1xuXHRcdFx0fSk7XG5cblx0XHRcdG1hcC5hZGRJbnRlcmFjdGlvbihtb2RpZnkpO1xuXHRcdFx0bWFwLmFkZEludGVyYWN0aW9uKGRyYXcpO1xuXHRcdFx0ZHJhdy5vbignZHJhd2VuZCcsIGhhbmRsZU5ld0ZlYXR1cmUpO1xuXHRcdH07XG5cblx0XHR0aGlzLmZpbmlzaERyYXdpbmcgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRtYXAucmVtb3ZlSW50ZXJhY3Rpb24oZHJhdyk7XG5cdFx0XHRtYXAucmVtb3ZlSW50ZXJhY3Rpb24obW9kaWZ5KTtcblx0XHRcdG1hcC5hZGRJbnRlcmFjdGlvbihzZWxlY3QpO1xuXHRcdFx0Ly8gbm9uJ3Qgc2VsZWN0IHRoZSBsYXN0IGRyYXduIHBvaW50XG5cdFx0XHRzZWxlY3RlZEZlYXR1cmVzLmNsZWFyKCk7XG5cdFx0fTtcblxuXHRcdHRoaXMuZGVsZXRlU2VsZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxlY3RlZEZlYXR1cmVzLmZvckVhY2goZnVuY3Rpb24gKGZlYXR1cmUpIHtcblx0XHRcdFx0YW5ub3RhdGlvbnMuZGVsZXRlKGZlYXR1cmUuYW5ub3RhdGlvbikudGhlbihmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0ZmVhdHVyZXMucmVtb3ZlKGZlYXR1cmUpO1xuXHRcdFx0XHRcdHNlbGVjdGVkRmVhdHVyZXMucmVtb3ZlKGZlYXR1cmUpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHR0aGlzLnNlbGVjdCA9IGZ1bmN0aW9uIChpZCkge1xuXHRcdFx0dmFyIGZlYXR1cmU7XG5cdFx0XHRmZWF0dXJlcy5mb3JFYWNoKGZ1bmN0aW9uIChmKSB7XG5cdFx0XHRcdGlmIChmLmFubm90YXRpb24uaWQgPT09IGlkKSB7XG5cdFx0XHRcdFx0ZmVhdHVyZSA9IGY7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0Ly8gcmVtb3ZlIHNlbGVjdGlvbiBpZiBmZWF0dXJlIHdhcyBhbHJlYWR5IHNlbGVjdGVkLiBvdGhlcndpc2Ugc2VsZWN0LlxuXHRcdFx0aWYgKCFzZWxlY3RlZEZlYXR1cmVzLnJlbW92ZShmZWF0dXJlKSkge1xuXHRcdFx0XHRzZWxlY3RlZEZlYXR1cmVzLnB1c2goZmVhdHVyZSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuY2xlYXJTZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxlY3RlZEZlYXR1cmVzLmNsZWFyKCk7XG5cdFx0fTtcblxuXHRcdHRoaXMuZ2V0U2VsZWN0ZWRGZWF0dXJlcyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBzZWxlY3RlZEZlYXR1cmVzO1xuXHRcdH07XG5cdH1cbik7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgZGlhcy5hbm5vdGF0aW9uc1xuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIG1hcEltYWdlXG4gKiBAbWVtYmVyT2YgZGlhcy5hbm5vdGF0aW9uc1xuICogQGRlc2NyaXB0aW9uIFdyYXBwZXIgc2VydmljZSBoYW5kbGluZyB0aGUgaW1hZ2UgbGF5ZXIgb24gdGhlIE9wZW5MYXllcnMgbWFwXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdkaWFzLmFubm90YXRpb25zJykuc2VydmljZSgnbWFwSW1hZ2UnLCBmdW5jdGlvbiAobWFwKSB7XG5cdFx0XCJ1c2Ugc3RyaWN0XCI7XG5cdFx0dmFyIGV4dGVudCA9IFswLCAwLCAwLCAwXTtcblxuXHRcdHZhciBwcm9qZWN0aW9uID0gbmV3IG9sLnByb2ouUHJvamVjdGlvbih7XG5cdFx0XHRjb2RlOiAnZGlhcy1pbWFnZScsXG5cdFx0XHR1bml0czogJ3BpeGVscycsXG5cdFx0XHRleHRlbnQ6IGV4dGVudFxuXHRcdH0pO1xuXG5cdFx0dmFyIGltYWdlTGF5ZXIgPSBuZXcgb2wubGF5ZXIuSW1hZ2UoKTtcblxuXHRcdHRoaXMuaW5pdCA9IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0bWFwLmFkZExheWVyKGltYWdlTGF5ZXIpO1xuXG5cdFx0XHQvLyByZWZyZXNoIHRoZSBpbWFnZSBzb3VyY2Vcblx0XHRcdHNjb3BlLiRvbignaW1hZ2Uuc2hvd24nLCBmdW5jdGlvbiAoZSwgaW1hZ2UpIHtcblx0XHRcdFx0ZXh0ZW50WzJdID0gaW1hZ2Uud2lkdGg7XG5cdFx0XHRcdGV4dGVudFszXSA9IGltYWdlLmhlaWdodDtcblxuXHRcdFx0XHR2YXIgem9vbSA9IHNjb3BlLnZpZXdwb3J0Lnpvb207XG5cblx0XHRcdFx0dmFyIGNlbnRlciA9IHNjb3BlLnZpZXdwb3J0LmNlbnRlcjtcblx0XHRcdFx0Ly8gdmlld3BvcnQgY2VudGVyIGlzIHN0aWxsIHVuaW5pdGlhbGl6ZWRcblx0XHRcdFx0aWYgKGNlbnRlclswXSA9PT0gdW5kZWZpbmVkICYmIGNlbnRlclsxXSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0Y2VudGVyID0gb2wuZXh0ZW50LmdldENlbnRlcihleHRlbnQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIGltYWdlU3RhdGljID0gbmV3IG9sLnNvdXJjZS5JbWFnZVN0YXRpYyh7XG5cdFx0XHRcdFx0dXJsOiBpbWFnZS5zcmMsXG5cdFx0XHRcdFx0cHJvamVjdGlvbjogcHJvamVjdGlvbixcblx0XHRcdFx0XHRpbWFnZUV4dGVudDogZXh0ZW50XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGltYWdlTGF5ZXIuc2V0U291cmNlKGltYWdlU3RhdGljKTtcblxuXHRcdFx0XHRtYXAuc2V0VmlldyhuZXcgb2wuVmlldyh7XG5cdFx0XHRcdFx0cHJvamVjdGlvbjogcHJvamVjdGlvbixcblx0XHRcdFx0XHRjZW50ZXI6IGNlbnRlcixcblx0XHRcdFx0XHR6b29tOiB6b29tLFxuXHRcdFx0XHRcdHpvb21GYWN0b3I6IDEuNSxcblx0XHRcdFx0XHQvLyBhbGxvdyBhIG1heGltdW0gb2YgNHggbWFnbmlmaWNhdGlvblxuXHRcdFx0XHRcdG1pblJlc29sdXRpb246IDAuMjUsXG5cdFx0XHRcdFx0Ly8gcmVzdHJpY3QgbW92ZW1lbnRcblx0XHRcdFx0XHRleHRlbnQ6IGV4dGVudFxuXHRcdFx0XHR9KSk7XG5cblx0XHRcdFx0Ly8gaWYgem9vbSBpcyBub3QgaW5pdGlhbGl6ZWQsIGZpdCB0aGUgdmlldyB0byB0aGUgaW1hZ2UgZXh0ZW50XG5cdFx0XHRcdGlmICh6b29tID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRtYXAuZ2V0VmlldygpLmZpdEV4dGVudChleHRlbnQsIG1hcC5nZXRTaXplKCkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0dGhpcy5nZXRFeHRlbnQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gZXh0ZW50O1xuXHRcdH07XG5cblx0XHR0aGlzLmdldFByb2plY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gcHJvamVjdGlvbjtcblx0XHR9O1xuXHR9XG4pOyIsIi8qKlxuICogQG5hbWVzcGFjZSBkaWFzLmFubm90YXRpb25zXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgc3R5bGVzXG4gKiBAbWVtYmVyT2YgZGlhcy5hbm5vdGF0aW9uc1xuICogQGRlc2NyaXB0aW9uIFdyYXBwZXIgc2VydmljZSBmb3IgdGhlIE9wZW5MYXllcnMgc3R5bGVzXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdkaWFzLmFubm90YXRpb25zJykuc2VydmljZSgnc3R5bGVzJywgZnVuY3Rpb24gKCkge1xuXHRcdFwidXNlIHN0cmljdFwiO1xuXG5cdFx0dmFyIHdoaXRlID0gWzI1NSwgMjU1LCAyNTUsIDFdO1xuXHRcdHZhciBibHVlID0gWzAsIDE1MywgMjU1LCAxXTtcblx0XHR2YXIgb3JhbmdlID0gJyNmZjVlMDAnO1xuXHRcdHZhciB3aWR0aCA9IDM7XG5cblx0XHR0aGlzLmZlYXR1cmVzID0gW1xuXHRcdFx0bmV3IG9sLnN0eWxlLlN0eWxlKHtcblx0XHRcdFx0c3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcblx0XHRcdFx0XHRjb2xvcjogd2hpdGUsXG5cdFx0XHRcdFx0d2lkdGg6IDVcblx0XHRcdFx0fSksXG5cdFx0XHRcdGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcblx0XHRcdFx0XHRyYWRpdXM6IDYsXG5cdFx0XHRcdFx0ZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuXHRcdFx0XHRcdFx0Y29sb3I6IGJsdWVcblx0XHRcdFx0XHR9KSxcblx0XHRcdFx0XHRzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuXHRcdFx0XHRcdFx0Y29sb3I6IHdoaXRlLFxuXHRcdFx0XHRcdFx0d2lkdGg6IDJcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9KVxuXHRcdFx0fSksXG5cdFx0XHRuZXcgb2wuc3R5bGUuU3R5bGUoe1xuXHRcdFx0XHRzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuXHRcdFx0XHRcdGNvbG9yOiBibHVlLFxuXHRcdFx0XHRcdHdpZHRoOiAzXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXHRcdF07XG5cblx0XHR0aGlzLmhpZ2hsaWdodCA9IFtcblx0XHRcdG5ldyBvbC5zdHlsZS5TdHlsZSh7XG5cdFx0XHRcdHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG5cdFx0XHRcdFx0Y29sb3I6IHdoaXRlLFxuXHRcdFx0XHRcdHdpZHRoOiA2XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG5cdFx0XHRcdFx0cmFkaXVzOiA2LFxuXHRcdFx0XHRcdGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcblx0XHRcdFx0XHRcdGNvbG9yOiBvcmFuZ2Vcblx0XHRcdFx0XHR9KSxcblx0XHRcdFx0XHRzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuXHRcdFx0XHRcdFx0Y29sb3I6IHdoaXRlLFxuXHRcdFx0XHRcdFx0d2lkdGg6IDNcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9KVxuXHRcdFx0fSksXG5cdFx0XHRuZXcgb2wuc3R5bGUuU3R5bGUoe1xuXHRcdFx0XHRzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuXHRcdFx0XHRcdGNvbG9yOiBvcmFuZ2UsXG5cdFx0XHRcdFx0d2lkdGg6IDNcblx0XHRcdFx0fSlcblx0XHRcdH0pXG5cdFx0XTtcblxuXHRcdHRoaXMuZWRpdGluZyA9IFtcblx0XHRcdG5ldyBvbC5zdHlsZS5TdHlsZSh7XG5cdFx0XHRcdHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG5cdFx0XHRcdFx0Y29sb3I6IHdoaXRlLFxuXHRcdFx0XHRcdHdpZHRoOiA1XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG5cdFx0XHRcdFx0cmFkaXVzOiA2LFxuXHRcdFx0XHRcdGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcblx0XHRcdFx0XHRcdGNvbG9yOiBibHVlXG5cdFx0XHRcdFx0fSksXG5cdFx0XHRcdFx0c3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcblx0XHRcdFx0XHRcdGNvbG9yOiB3aGl0ZSxcblx0XHRcdFx0XHRcdHdpZHRoOiAyLFxuXHRcdFx0XHRcdFx0bGluZURhc2g6IFszXVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0pXG5cdFx0XHR9KSxcblx0XHRcdG5ldyBvbC5zdHlsZS5TdHlsZSh7XG5cdFx0XHRcdHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG5cdFx0XHRcdFx0Y29sb3I6IGJsdWUsXG5cdFx0XHRcdFx0d2lkdGg6IDMsXG5cdFx0XHRcdFx0bGluZURhc2g6IFs1XVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblx0XHRdO1xuXG5cdFx0dGhpcy52aWV3cG9ydCA9IFtcblx0XHRcdG5ldyBvbC5zdHlsZS5TdHlsZSh7XG5cdFx0XHRcdHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG5cdFx0XHRcdFx0Y29sb3I6IGJsdWUsXG5cdFx0XHRcdFx0d2lkdGg6IDNcblx0XHRcdFx0fSksXG5cdFx0XHR9KSxcblx0XHRcdG5ldyBvbC5zdHlsZS5TdHlsZSh7XG5cdFx0XHRcdHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG5cdFx0XHRcdFx0Y29sb3I6IHdoaXRlLFxuXHRcdFx0XHRcdHdpZHRoOiAxXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXHRcdF07XG5cdH1cbik7IiwiLyoqXG4gKiBAbmFtZXNwYWNlIGRpYXMuYW5ub3RhdGlvbnNcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB1cmxQYXJhbXNcbiAqIEBtZW1iZXJPZiBkaWFzLmFubm90YXRpb25zXG4gKiBAZGVzY3JpcHRpb24gVGhlIEdFVCBwYXJhbWV0ZXJzIG9mIHRoZSB1cmwuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdkaWFzLmFubm90YXRpb25zJykuc2VydmljZSgndXJsUGFyYW1zJywgZnVuY3Rpb24gKCkge1xuXHRcdFwidXNlIHN0cmljdFwiO1xuXG5cdFx0dmFyIHN0YXRlID0ge307XG5cblx0XHQvLyB0cmFuc2Zvcm1zIGEgVVJMIHBhcmFtZXRlciBzdHJpbmcgbGlrZSAjYT0xJmI9MiB0byBhbiBvYmplY3Rcblx0XHR2YXIgZGVjb2RlU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgcGFyYW1zID0gbG9jYXRpb24uaGFzaC5yZXBsYWNlKCcjJywgJycpXG5cdFx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgIC5zcGxpdCgnJicpO1xuXG5cdFx0XHR2YXIgc3RhdGUgPSB7fTtcblxuXHRcdFx0cGFyYW1zLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtKSB7XG5cdFx0XHRcdC8vIGNhcHR1cmUga2V5LXZhbHVlIHBhaXJzXG5cdFx0XHRcdHZhciBjYXB0dXJlID0gcGFyYW0ubWF0Y2goLyguKylcXD0oLispLyk7XG5cdFx0XHRcdGlmIChjYXB0dXJlICYmIGNhcHR1cmUubGVuZ3RoID09PSAzKSB7XG5cdFx0XHRcdFx0c3RhdGVbY2FwdHVyZVsxXV0gPSBkZWNvZGVVUklDb21wb25lbnQoY2FwdHVyZVsyXSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gc3RhdGU7XG5cdFx0fTtcblxuXHRcdC8vIHRyYW5zZm9ybXMgYW4gb2JqZWN0IHRvIGEgVVJMIHBhcmFtZXRlciBzdHJpbmdcblx0XHR2YXIgZW5jb2RlU3RhdGUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcblx0XHRcdHZhciBwYXJhbXMgPSAnJztcblx0XHRcdGZvciAodmFyIGtleSBpbiBzdGF0ZSkge1xuXHRcdFx0XHRwYXJhbXMgKz0ga2V5ICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0YXRlW2tleV0pICsgJyYnO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHBhcmFtcy5zdWJzdHJpbmcoMCwgcGFyYW1zLmxlbmd0aCAtIDEpO1xuXHRcdH07XG5cblx0XHR0aGlzLnB1c2hTdGF0ZSA9IGZ1bmN0aW9uIChzKSB7XG5cdFx0XHRzdGF0ZS5zbHVnID0gcztcblx0XHRcdGhpc3RvcnkucHVzaFN0YXRlKHN0YXRlLCAnJywgc3RhdGUuc2x1ZyArICcjJyArIGVuY29kZVN0YXRlKHN0YXRlKSk7XG5cdFx0fTtcblxuXHRcdC8vIHNldHMgYSBVUkwgcGFyYW1ldGVyIGFuZCB1cGRhdGVzIHRoZSBoaXN0b3J5IHN0YXRlXG5cdFx0dGhpcy5zZXQgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gcGFyYW1zKSB7XG5cdFx0XHRcdHN0YXRlW2tleV0gPSBwYXJhbXNba2V5XTtcblx0XHRcdH1cblx0XHRcdGhpc3RvcnkucmVwbGFjZVN0YXRlKHN0YXRlLCAnJywgc3RhdGUuc2x1ZyArICcjJyArIGVuY29kZVN0YXRlKHN0YXRlKSk7XG5cdFx0fTtcblxuXHRcdC8vIHJldHVybnMgYSBVUkwgcGFyYW1ldGVyXG5cdFx0dGhpcy5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG5cdFx0XHRyZXR1cm4gc3RhdGVba2V5XTtcblx0XHR9O1xuXG5cdFx0c3RhdGUgPSBoaXN0b3J5LnN0YXRlO1xuXG5cdFx0aWYgKCFzdGF0ZSkge1xuXHRcdFx0c3RhdGUgPSBkZWNvZGVTdGF0ZSgpO1xuXHRcdH1cblx0fVxuKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=