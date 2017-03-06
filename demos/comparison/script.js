require([
  'Canvas-Flowmap-Layer/CanvasFlowmapLayer',
  'esri/graphic',
  'esri/map',
  'local-resources/config',
  'dojo/on',
  'dojo/domReady!'
], function(
  CanvasFlowmapLayer,
  Graphic,
  Map,
  config,
  on
) {
  // establish references to form elements in the controls card
  var oneToManyLayerButton = document.getElementById('oneToManyLayerButton');
  var manyToOneLayerButton = document.getElementById('manyToOneLayerButton');
  var oneToOneLayerButton = document.getElementById('oneToOneLayerButton');
  var pathAnimationButton = document.getElementById('pathAnimationButton');
  var pathAnimationStyleSelect = document.getElementById('pathAnimationStyleSelect');
  var userInteractionSelect = document.getElementById('userInteractionSelect');
  var pathSelectionTypeSelect = document.getElementById('pathSelectionTypeSelect');

  var map = new Map('map', {
    basemap: 'dark-gray-vector',
    center: [22, 14],
    zoom: 2
  });

  map.on('load', function() {
    var oneToManyLayer = new CanvasFlowmapLayer({
      // JSAPI GraphicsLayer constructor properties
      id: 'oneToManyLayer',
      visible: true,
      // CanvasFlowmapLayer custom constructor properties
      //  - required
      originAndDestinationFieldIds: config.originAndDestinationFieldIds,
      //  - optional
      pathDisplayMode: 'selection', // 'selection' or 'all'
      wrapAroundCanvas: true,
      animationStarted: true,
      animationStyle: 'ease-out' // 'linear', 'ease-out', or 'ease-in'
    });

    var manyToOneLayer = new CanvasFlowmapLayer({
      id: 'manyToOneLayer',
      visible: false,
      originAndDestinationFieldIds: config.originAndDestinationFieldIds,
      pathDisplayMode: 'selection',
      wrapAroundCanvas: true,
      animationStarted: true,
      animationStyle: 'ease-out'
    });

    var oneToOneLayer = new CanvasFlowmapLayer({
      id: 'oneToOneLayer',
      visible: false,
      originAndDestinationFieldIds: config.originAndDestinationFieldIds,
      pathDisplayMode: 'selection',
      wrapAroundCanvas: true,
      animationStarted: true,
      animationStyle: 'ease-out'
    });

    map.addLayers([oneToManyLayer, manyToOneLayer, oneToOneLayer]);

    createGraphicsFromCsv('../csv-data/Half_Marathon_results.csv', oneToManyLayer);
    createGraphicsFromCsv('../csv-data/Half_Marathon_results.csv', manyToOneLayer);
    createGraphicsFromCsv('../csv-data/Half_Marathon_results.csv', oneToOneLayer);

    // here we use Papa Parse to load and read the CSV data
    // we could have also used another library like D3js to do the same
    function createGraphicsFromCsv(csvFilePath, canvasLayer) {
      Papa.parse(csvFilePath, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
          var csvGraphics = results.data.map(function(datum) {
            return new Graphic({
              geometry: {
                x: datum.s_lon,
                y: datum.s_lat,
                spatialReference: {
                  wkid: 4326
                }
              },
              attributes: datum
            });
          });

          // add all graphics to the canvas flowmap layer
          canvasLayer.addGraphics(csvGraphics);
        }
      });
    }

    // establish each layer's click and mouse-over handlers to demonstrate the flowmap functionality
    var clickListeners = [];
    clickListeners.push(on.pausable(oneToManyLayer, 'click', handleLayerInteraction));
    clickListeners.push(on.pausable(manyToOneLayer, 'click', handleLayerInteraction));
    clickListeners.push(on.pausable(oneToOneLayer, 'click', handleLayerInteraction));
    var mouseoverListeners = [];
    mouseoverListeners.push(on.pausable(oneToManyLayer, 'mouse-over', handleLayerInteraction));
    mouseoverListeners.push(on.pausable(manyToOneLayer, 'mouse-over', handleLayerInteraction));
    mouseoverListeners.push(on.pausable(oneToOneLayer, 'mouse-over', handleLayerInteraction));
    // begin the demo with all mouse-over listeners paused (turned off)
    mouseoverListeners.forEach(function(listener) {
      listener.pause();
    });

    function handleLayerInteraction(evt) {
      var canvasLayer = evt.graphic.getLayer();
      // evt.isOriginGraphic: Boolean
      // evt.sharedOriginGraphics: Array of all ORIGIN graphics with the same ORIGIN ID field
      // evt.sharedDestinationGraphics: Array of all ORIGIN graphics with the same DESTINATION ID field

      // - you can mark shared origin or destination graphics as selected for path display using these modes:
      //   - 'SELECTION_NEW', 'SELECTION_ADD', or 'SELECTION_SUBTRACT'
      // - these selected graphics inform the canvas flowmap layer which paths to display

      // NOTE: if the layer's pathDisplayMode was originally set to "all",
      // this manual selection will override the displayed paths

      if (evt.isOriginGraphic) {
        canvasLayer.selectGraphicsForPathDisplay(evt.sharedOriginGraphics, pathSelectionTypeSelect.value);
      } else {
        canvasLayer.selectGraphicsForPathDisplay(evt.sharedDestinationGraphics, pathSelectionTypeSelect.value);
      }
    }

    setTimeout(function() {
      // show the controls card after a brief delay
      document.getElementById('controlsPanelCard').classList.remove('off');

      // automatically select some graphics for path display to demonstrate the flowmap functionality,
      // without the user having to first click on the layer
      oneToManyLayer.selectGraphicsForPathDisplayById('redlands_id', 1, true, 'SELECTION_NEW');
      manyToOneLayer.selectGraphicsForPathDisplayById('redlands_id', 1, false, 'SELECTION_NEW');
      oneToOneLayer.selectGraphicsForPathDisplayById('redlands_id', 1, false, 'SELECTION_NEW');
    }, 3000);

    // establish actions for form elements in the controls card
    oneToManyLayerButton.addEventListener('click', toggleActiveLayer);
    manyToOneLayerButton.addEventListener('click', toggleActiveLayer);
    oneToOneLayerButton.addEventListener('click', toggleActiveLayer);

    function toggleActiveLayer(evt) {
      oneToManyLayerButton.classList.add('btn-clear');
      manyToOneLayerButton.classList.add('btn-clear');
      oneToOneLayerButton.classList.add('btn-clear');

      oneToManyLayer.hide();
      manyToOneLayer.hide();
      oneToOneLayer.hide();

      map.getLayer(evt.target.id.split('Button')[0]).show();
      evt.target.classList.remove('btn-clear');
    }

    pathAnimationButton.addEventListener('click', function(evt) {
      var iconNode = evt.currentTarget.children[0];
      iconNode.classList.toggle('icon-ui-pause');
      iconNode.classList.toggle('icon-ui-red');
      iconNode.classList.toggle('icon-ui-play');
      iconNode.classList.toggle('icon-ui-green');

      toggleLayerAnimation(oneToManyLayer);
      toggleLayerAnimation(manyToOneLayer);
      toggleLayerAnimation(oneToOneLayer);
    });

    function toggleLayerAnimation(canvasLayer) {
      if (canvasLayer.animationStarted) {
        canvasLayer.stopAnimation();
      } else {
        canvasLayer.playAnimation();
      }
    }

    pathAnimationStyleSelect.addEventListener('change', function(evt) {
      oneToManyLayer.animationStyle = evt.target.value;
      manyToOneLayer.animationStyle = evt.target.value;
      oneToOneLayer.animationStyle = evt.target.value;
    });

    // toggle click or mouse-over listeners as either paused or resumed
    userInteractionSelect.addEventListener('change', function(evt) {
      if (evt.target.value === 'click') {
        clickListeners.forEach(function(clickListener) {
          clickListener.resume();
        });
        mouseoverListeners.forEach(function(mouseoverListener) {
          mouseoverListener.pause();
        });
      } else {
        clickListeners.forEach(function(clickListener) {
          clickListener.pause();
        });
        mouseoverListeners.forEach(function(mouseoverListener) {
          mouseoverListener.resume();
        });
      }
    });
  });
});
