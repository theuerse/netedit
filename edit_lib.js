//
// Basic settings and functions for Netedit (extracted to be reused e.g. in Netstart)
// Main-version of this file is found in the Netedit-Project
// (https://github.com/theuerse/netedit)
// v1.1 (after adding packetloss - support)
//

var mousePosition = {x: 0, y: 0};

var images = {
  router: "res/img/blueRouter.svg",
  server: "res/img/server.svg",
  client: "res/img/client.svg"
};

var lengendWidth;

var bandwidthPresetLimits = [2000,4000];
var delayPresetLimits = [2,10];

var maxNumberOfNodes = 20;
var nodes;
var edges;
var network;
var edgeInformation = {};
var edgeCoolTipTimeout = {};
var messageHideTimeout = {};
var topologyFile;

var arrowRight = '<span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>';
var arrowLeft = '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span>';

// colors of BYR color wheel, order changed
var colors = ["#0247fe","#8601af","#66b032","#fe2712","#fefe33","#fb9902",
"#0392ce","#3d01a4","#d0ea2b","#a7194b","#fabc02"];

var nodeColors = {border: 'rgba(255,255,255,0.0)', background: 'rgba(255,255,255,0.0)',
highlight: {border: 'rgba(255,0,0,1.0)', background: 'rgba(255,255,255,0.0)'},
hover: {border: 'rgba(255,255,255,0.0)', background: 'rgba(255,255,255,0.0)'}};

var temp = {lossRight: undefined, lossLeft: undefined};
var printLossString; // variable containing the function for printing the selected loss value

var options = {
  // specify randomseed => network is the same at every startup
  layout:{randomSeed: 2},
  autoResize: true,
  height: '100%',
  edges: {
    color: {color: '#0c58bc', hover: '#0c58bc', highlight: '#ff0000'},
    shadow: true,
    physics: true,
    selectionWidth: 0,
    hoverWidth: 0
  },
  interaction: {
    hover: true,
    selectConnectedEdges: false,
    hoverConnectedEdges: false,
    tooltipDelay: 400
  },
  physics: {
    stabilization: {
      enabled: true
    } ,
    adaptiveTimestep: true,
    barnesHut: {
      avoidOverlap: 1, // maximum overlap avoidance
      gravitationalConstant: -4000 // neg. value -> repulsion
    },
  },
  nodes: {
    shadow: true,
    physics: true,
    shape: "image",
    shapeProperties: {useBorderWithImage: true},
    borderWidth: 0,
    borderWidthSelected: 3
  },
  manipulation: {
    initiallyActive: true,
    addNode: false,
    addEdge: function (data, callback) {
      if(data.from !== data.to) {
        // check if there is already a edge from here to there
        if(!isEdgeAlreadyPresent(data.from, data.to)){
          callback(data);
          edgeInformation[data.id] = {bandwidthRight: getRandomNumberWithRange(bandwidthPresetLimits[0], bandwidthPresetLimits[1]),
            bandwidthLeft: getRandomNumberWithRange(bandwidthPresetLimits[0], bandwidthPresetLimits[1]),
            delayRight: getRandomNumberWithRange(delayPresetLimits[0], delayPresetLimits[1]),
            delayLeft: getRandomNumberWithRange(delayPresetLimits[0], delayPresetLimits[1]),
            lossRight: undefined,
            lossLeft: undefined};
            updateEdgeWidth();

            if($('#addEdgeToggle').is(':checked')){
              //re-call addEdgeMode() if in 'addEdge(s)-mode', lets user add edge after edge
              network.addEdgeMode();
            }

          } else {showMessage("Only one edge per node-pair allowed.","danger");}
        }else {showMessage("Edges with same start- and end-node not allowed.","danger");}
      },
      editEdge: function(data, callback){
        // check if there is already a edge from here to there
        if(isEdgeAlreadyPresent(data.from, data.to) || (data.to === data.from)){
          if((data.to === data.from)){
            showMessage("Edges with same start- and end-node not allowed.","danger");
          }else{
            showMessage("Only one edge per node-pair allowed.","danger");
          }
          callback(null);
        }else{
          callback(data);
          $("#edgeInfoItem").hide();
        }
      },
      deleteEdge: function(data, callback){
        data.edges.forEach(function(edgeId){
          delete edgeInformation[edgeId];
        });
        updateEdgeWidth();
        callback(data);
        $("#edgeInfoItem").hide(); // hide edge-info-edit-btn
      },
      // remove the edges to/from the deleted node as well
      deleteNode: function(data, callback){
        if(data.nodes.length === 1){
          // get edges connected to node to be deletec
          var connectedEdges = network.getConnectedEdges(data.nodes[0]);
          callback(data); // delege node
          edges.remove(connectedEdges); // delete connected edges
        }
      }
    }
  };

  // Adds a change-listener to the visjs-manipulation toolbar
  // in order to be able to correct faulty behavior
  // concerning addEdge(s)
  function setupGraphManipulationListener(){
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    var observer = new MutationObserver(function(mutations, observer) {
      // fired when a mutation occurs
      if(($('#addEdgeToggle').is(':checked')) && ($(".vis-back").length === 0)){
        // user pressed the back-button in the toolbar -> reset addEdgeToggle state
        resetAddEdgeToggleButton();
      }
    });

    // define what element should be observed by the observer
    // and what types of mutations trigger the callback
    observer.observe(document.querySelector('.vis-manipulation'), {
      subtree: true,
      childList: true
    });
  }

  // Initializes the network (once) at program-startup
  function initNetwork(){
    nodes = new vis.DataSet();
    edges = new vis.DataSet();

    clearTimeout(edgeCoolTipTimeout);
    edgeInformation = {};

    var container = document.getElementById('graphContainer');
    // draw graph
    network = new vis.Network(container, {nodes: nodes,edges: edges}, options);

    // zoom to 100%
    network.moveTo({scale: 1.0});
  }

  // Methods drawing / maintaining the UI
  // Ends the repeated adding of edges and resets the corresponding button
  function stopAddingEdges(){
    resetAddEdgeToggleButton();
    network.disableEditMode();
    network.enableEditMode();
  }

  // Resets the visual appearance of the addEdge-toggleButton
  // e.g. in case it should be reset programmatically without clicking it
  function resetAddEdgeToggleButton(){
    $('#addEdgeToggle').removeAttr('checked');
    $('#addEdgeToggle').button("refresh");
    $('#addEdgeToggle').button('option', 'label', "add edge(s)");
  }

  // adds some eventhandlers important to the manipulation/editing of the networks nodes/edges
  function addNetworkEventListeners(){
    // Only show option to edit edge-connection info when the user has currently selected an edge
    network.on("selectEdge", function(params){
      $("#edgeInfoItem").show();
    });
    network.on("deselectEdge", function(params){
      $("#edgeInfoItem").hide();
    });

    // Only show grou select when the user has currently selected an node
    network.on("selectNode", function(params){
      var node = nodes.get(network.getSelectedNodes()[0]);
      if(node.group === "router") return; // routers are in no group

      if(network.getSelectedNodes().length === 1){
        var options = ['<option value="#000000">none</option>'];
        colors.forEach(function(color){
          options.push('<option ' + ((node.font.indexOf(color) > -1) ? "selected " :"") +'value="' + color + '" style="background:'+ color + '">' + options.length + '</option>');
        });
        $("#grpSelect").html(options.join("\n"));
      }
      $("#nodeGroupItem").show();
    });

    network.on("deselectNode", function(params){
      $("#nodeGroupItem").hide();
    });

    network.on("dragEnd", function(params){
      network.unselectAll();
      $("#nodeGroupItem").hide();
    });

    // doubleClick on edge -> open edgeEdit-Dialog
    network.on("doubleClick", function(params){
      stopAddingEdges();
      if(params.edges.length === 1){
        cleanupEdgeCooltips();
        showEdgeParameterEditDialog();
      }
    });

    // hide existing edge-Cooltips when starting to hover over a node
    network.on("hoverNode", function (params) {
      clearTimeout(edgeCoolTipTimeout);
      cleanupEdgeCooltips();
    });

    // Show the edge-cooltip only when the mouse hovers over a edge
    network.on("hoverEdge", function (params) {
      clearTimeout(edgeCoolTipTimeout);
      edgeCoolTipTimeout = setTimeout(function(){showEdgeCooltip(params.edge);},600);
    });

    network.on("blurEdge", function(params){
      clearTimeout(edgeCoolTipTimeout);
      hideEdgeCooltip(params.edge);
    });
  }

  // draws given topology-data using vis.js (data from e.g. "generated_network_top.txt")
  // used when opening pre-existing topology-files (choose file...)
  function drawTopology(data){
    options.nodes.physics = true; // (re-)allow node-movement
    network.setOptions(options);

    var nodeData = new vis.DataSet();
    var edgeData = new vis.DataSet();
    // clear previous edge-information
    edgeInformation = {};

    // process file-data
    // seperate lines
    var lines = data.split("\n");

    // part = 0 ... # of nodes, 1 .. edges, 2 ... client/server
    var part = -1;
    var edgeInfo;  // holds information about a single edge
    var nodeInfo;  // holds information about a single node
    var servers = []; // array containing the ids of all servers
    var numberOfNodes = 0; // total number of nodes

    for(var index in lines){
      if(stringStartsWith(lines[index],"#")) {
        part = part + 1;
        continue;
      }

      if(part === 0){
        // lines[index] contains number of nodes (assumed correct everytime)
        numberOfNodes = lines[index];
        for(i = 0; i < numberOfNodes; i++){
          nodeData.add({id: i, group: "router", label: 'Pi #' + i, font: "20px arial #000000",
          color: nodeColors, image: images.router});
        }
      }else if(part == 1){
        // add edges
        // lines[index] contains edge-information
        edgeInfo = lines[index].split(",");
        var width =  3;
        // add edge first two entries ... connected nodes ( a -> b)
        var edgeId = edgeInfo[0] + '-'+ edgeInfo[1];
        edgeData.add({id: edgeId, from: parseInt(edgeInfo[0]),
          to: parseInt(edgeInfo[1]), width: width, font: {align: 'bottom'}});

          edgeInformation[edgeId]={bandwidthRight: parseInt(edgeInfo[2]),bandwidthLeft: parseInt(edgeInfo[3]),
            delayRight: parseInt(edgeInfo[4]), delayLeft: parseInt(edgeInfo[5]),
            lossRight: edgeInfo[6], lossLeft: edgeInfo[7]};
          }else if(part == 2){
            // update node type (Client / Server) => visual apperance
            // and relationship type color (client and server have matching colors, for now)
            // lines[index] contains properties (Client, Server)
            // e.g. 4,18   --> 4 is a client of the server 18
            nodeInfo = lines[index].split(",");

            // images from GPL licensed "Tango Desktop Project" (tango.freedesktop.org)
            // nodeInfo[1] ... id of server - node
            if($.inArray(nodeInfo[1],servers)<0){
              servers.push(nodeInfo[1]); // add server-id only if not already present
            }
            nodeData.update({id: parseInt(nodeInfo[1]), label: 'Pi #' + nodeInfo[1], color: nodeColors, group: "server",
            image: images.server, font: "20px arial " + colors[$.inArray(nodeInfo[1],servers)]});

            // nodeInfo[0] ... id of client - node
            nodeData.update({id: parseInt(nodeInfo[0]), label: 'Pi #' + nodeInfo[0], color: nodeColors, group: "client",
            image: images.client,font: "20px arial " + colors[$.inArray(nodeInfo[1],servers)]});
          }
        }

        // shut down node-physics when networkLayout has stabilized
        // edge-physics still enabled
        network.once("stabilized", function(params) {
          console.log("network stabilized!");
          options.nodes.physics = false;
          network.setOptions(options);
        });

        // update existing network / node- and edge-Data (redraw/restabilize network)
        network.setData({nodes: nodeData, edges: edgeData});
        nodes = nodeData;
        edges = edgeData;
      }

      // generate the content of a network-topology-file based on the current network
      function getTopologyFile(){
        var fileBuffer = [];
        var info;
        var entry;
        fileBuffer.push("#number of nodes");
        fileBuffer.push(nodes.length); // e.g. 20

        fileBuffer.push("#nodes setting (n1,n2,bandwidth in kbits a -> b, bandwidth in kbits a <- b, delay a -> b in ms, delay b -> a in ms");
        edges.forEach(function(edge){
          info = edgeInformation[edge.id];

          entry = edge.from + "," + edge.to + "," + info.bandwidthRight + "," +
          info.bandwidthLeft + "," + info.delayRight + "," + info.delayLeft;

          if(info.lossRight !== undefined && info.lossRight !== "undefined"){
            entry += "," + info.lossRight;
          }

          if(info.lossLeft !== undefined && info.lossLeft !== "undefined"){
            entry += "," + info.lossLeft;
          }

          fileBuffer.push(entry);
        });

        fileBuffer.push("#properties (Client, Server)");
        var server;
        var serversPerColor = getServerperColor();
        var groups = {};

        var allNodes = network.body.data.nodes.get({returnType:"Object"});

        var node;
        var color;

        for(var nodeId in allNodes) {
          node = allNodes[nodeId];
          if(node.group === "client"){
            color = node.font.slice(node.font.indexOf("#"));
            if(color !== "#000000"){ // black is the color of non-group nodes
              if(serversPerColor[color] !== undefined){
                // save client/server relationship in the according group
                if(groups[color] === undefined){
                  groups[color] = [nodeId + "," + serversPerColor[color]];
                }else {
                  groups[color].push(nodeId + "," + serversPerColor[color]);
                }
              }
            }
          }
        }
        // write client/server relations group by group (right order)
        colors.forEach(function(color){
          if(groups[color] !== undefined){
            groups[color].forEach(function(entry){
              fileBuffer.push(entry);
            });
          }
        });

        fileBuffer.push("#eof //do not delete this");
        return fileBuffer.join("\n");
      }

      // changes the respective width of edges according to the relation
      // of their specified bandwith to the overall maximum bandwith
      function updateEdgeWidth(){
        var maxBandwidth = getMaxBandwidth();
        var edges = network.body.data.edges;
        var allEdges = edges.get({returnType:"Object"});

        var edge;
        var info;
        var updateArray= [];

        for(var edgeId in allEdges) {
          info = edgeInformation[edgeId];
          if(info === undefined) continue;
          edge = allEdges[edgeId];
          edge.width =  ((((info.bandwidthRight + info.bandwidthLeft) / 2)/ maxBandwidth) * 6);
          updateArray.push(edge);
        }

        edges.update(updateArray);
      }

      // show a dialog providing the means to edit the
      // edge-presets (range for bandwidth, range for delay)
      function showEdgePresetEditDialog(){
        $( "#presetDialog" ).dialog({
          resizable: true,
          width: 700,
          height:300,
          modal: true,
          open: function(event, ui){

            // setup bandwidth slider
            $( "#bandwidthRangeSlider" ).slider({
              range: true,
              min: 1,
              max: 8000,
              values: [bandwidthPresetLimits[0],bandwidthPresetLimits[1]],
              slide: function( event, ui ) {
                $( "#bandwidthRange" ).val(ui.values[ 0 ] + "[kbps] - " + ui.values[ 1 ] +"[kbps]" );
              }
            });

            $( "#bandwidthRange" ).val($( "#bandwidthRangeSlider" ).slider( "values", 0 ) + "[kbps]"+
            " - " + $( "#bandwidthRangeSlider" ).slider( "values", 1 ) + "[kbps]" );


            // setup delay slider
            $( "#delayRangeSlider" ).slider({
              range: true,
              min: 0,
              max: 100,
              values: [delayPresetLimits[0], delayPresetLimits[1]],
              slide: function( event, ui ) {
                $( "#delayRange" ).val(ui.values[ 0 ] + "[ms] - " + ui.values[ 1 ] + "[ms]" );
              }
            });

            $( "#delayRange" ).val($( "#delayRangeSlider" ).slider( "values", 0 ) + "[ms]" +
            " - " + $( "#delayRangeSlider" ).slider( "values", 1 )+ "[ms]" );

          },
          buttons: {
            "Ok": function() {
              // update edge-preset information
              bandwidthPresetLimits = $("#bandwidthRangeSlider").slider("values");
              delayPresetLimits = $("#delayRangeSlider").slider("values");

              $( this ).dialog( "close" );
              updateEdgeWidth(); // adapt to possible changes in bandwidth
            },
            Cancel: function() {
              // throw away changes
              $( this ).dialog( "close" );
            }
          }
        });
      }

      // Shows a dialog providing the means to edit the currently selected
      // edges parameters/properties (bandwidth, delay)
      function showEdgeParameterEditDialog(){
        var selectedEdgeId = network.getSelectedEdges()[0];
        if(selectedEdgeId === undefined) return; // abort when no edge is selected

        $( "#edgeDialog" ).dialog({
          resizable: true,
          width: 450,
          height:450,
          modal: true,
          open: function(event, ui){
            var edge = edges.get(selectedEdgeId);
            var edgeInfo = edgeInformation[selectedEdgeId];

            // setup edit - elements / display edge characteristics
            $("#edgeTitle").html("Pi #" + edge.from + '&emsp;' + arrowLeft +  arrowRight +' &emsp;' + "Pi #" + edge.to);

            // update BandwidthRight-spinner
            $("#bandwidthRight").spinner({ //[kbps]
              min: 1,
              max: 8000,
              step: 1
            });
            $("#bandwidthRight").spinner("value", edgeInfo.bandwidthRight);

            // update BandwidthLeft-spinner
            $("#bandwidthLeft").spinner({
              min: 1,
              max: 8000,
              step: 1
            });
            $("#bandwidthLeft").spinner("value", edgeInfo.bandwidthLeft);

            // update delayRight - spinner
            $("#delayRight").spinner({ //[ms]
              min: 0,
              max: 100,
              step: 1
            });
            $("#delayRight").spinner("value", edgeInfo.delayRight);

            // update delayLeft - spinner
            $("#delayLeft").spinner({ //[ms]
              min: 0,
              max: 100,
              step: 1
            });
            $("#delayLeft").spinner("value", edgeInfo.delayLeft);

            $(".spinner").css("width",50); // constrain width of input-elements

            // temporary cache for left/right loss value (allow for 'Cancel')
            temp.lossRight = "" + edgeInfo.lossRight;
            temp.lossLeft = "" + edgeInfo.lossLeft;
            $("#lossRight").html(temp.lossRight);
            $("#lossLeft").html(temp.lossLeft);

            $("#lossRightBtn").button().on( "click", function() {
              showLossParameterDialog("lossRight");
            });

            $("#lossLeftBtn").button().on( "click", function() {
              showLossParameterDialog("lossLeft");
            });
          },
          buttons: {
            "Ok": function() {
              // update edge-information (of currently selected edge)
              var selectedEdgeId = network.getSelectedEdges()[0];

              edgeInformation[selectedEdgeId].bandwidthRight = $( "#bandwidthRight" ).spinner( "value" );
              edgeInformation[selectedEdgeId].bandwidthLeft = $("#bandwidthLeft").spinner("value");
              edgeInformation[selectedEdgeId].delayRight = $("#delayRight").spinner("value");
              edgeInformation[selectedEdgeId].delayLeft = $("#delayLeft").spinner("value");
              edgeInformation[selectedEdgeId].lossRight = temp.lossRight;
              edgeInformation[selectedEdgeId].lossLeft = temp.lossLeft;

              $( this ).dialog( "close" );
              updateEdgeWidth(); // display possible changes in bandwidth
            },
            Cancel: function() {
              // throw away changes
              $( this ).dialog( "close" );
            }
          }
        });
      }

      //
      // Loss-Dialog-Methods
      //

      // Displays a dialog allowing for the change of the loss parameters of a edge
      // (only one direction at a time)
      function showLossParameterDialog(property){
        var lossString = temp[property];


        $( "#lossDialog" ).dialog({
          modal: true,
          width: 800,
          height:450,
          buttons: {
            "Ok": function() {
              // update temporary loss-settings for this edge
              temp[property] = printLossString();
              $("#" + property).html(temp[property]);
              $(this).dialog( "close" );
            },
            Cancel: function() {
              $(this).dialog('close');
            }
          }
        });


        // refresh view
        if(property === "lossRight"){
          $("#lossTypeLegend").html("Loss-Type " + arrowRight);
        }else {
          $("#lossTypeLegend").html("Loss-Type " + arrowLeft);
        }

        $('#lossSelect').val(categorize(lossString));

        $("#lossSelect").on('change', function(){
          var tmpLossString = printLossString(); // try to carry over as much as possible
          updateLossParameterView($(this).val());
          fillInLossStringParams(tmpLossString);
        });


        // establish structure
        updateLossParameterView(categorize(lossString));
        // fill in the blanks
        fillInLossStringParams(lossString);
      }

      // tries to insert given parameters into existing controls (spinners)
      function fillInLossStringParams(lossString){
        if(lossString === undefined) return;

        var parts = lossString.split(" ");
        var fields = $("#lossParameterSet").find(".spinner");

        var index;
        for(index = 1; index <= Math.min(parts.length-1, fields.length); index++){
          $(fields[index-1]).spinner("value",parts[index]);
        }
      }

      // Arrange the needed input-facility for a given loss-type
      function updateLossParameterView(newType){

        // refresh parameter-view
        $("#lossParameterSet").empty();
        $("#lossParameterSet").append('<legend>Parameters</legend>');

        switch(newType){
          case undefined:
          case "undefined":
            $("#lossInfoText").html("No artificial loss introduced.");
            printLossString = function(){return "undefined";};
            break;
          case "random":
            $("#lossInfoText").html("Adds an independent loss probability for the packets.");
            $("#lossParameterSet").append('<label for="param_p">p </label><input title="independent loss probability" class="spinner" id="param_p"/><br>');
            printLossString = function(){return "random " + $("#param_p").val();};
            break;
          case "state":
            $("#lossInfoText").html("Adds packet losses according to the 4-state Markov chain.");
            $("#lossParameterSet").append('<label for="param_p13">p13 </label><input title="transition probability from state 1 (good reception) to 3 (burst losses) " class="spinner" id="param_p13"/><br>');
            $("#lossParameterSet").append('<label for="param_p31">p31 </label><input title="transition probability from state 3 (burst losses) to 1 (good reception)" class="spinner" id="param_p31"/><br>');
            $("#lossParameterSet").append('<label for="param_p32">p32 </label><input title="transition probability from state 3 (burst losses) to 2 (good reception within a burst)" class="spinner" id="param_p32"/><br>');
            $("#lossParameterSet").append('<label for="param_p14">p14 </label><input title="transition probability from state 1 (good reception) to 4 (independent losses)" class="spinner" id="param_p14"/><br>');
            printLossString = function(){return "state " + $("#param_p13").val() + " " + $("#param_p31").val() + " " +
              $("#param_p32").val() + " "  + $("#param_p14").val();};
            break;
          case "bernoulli":
            $("#lossInfoText").html("Special case of the Gilbert-Elliot loss model (independent losses).");
            $("#lossParameterSet").append('<label for="param_p">p </label><input title="independent loss probability" class="spinner" id="param_p"/><br>');
            printLossString = function(){return "gemodel " + $("#param_p").val();};
            break;
          case "simpleGilbert":
            $("#lossInfoText").html("Special case of the Gilbert-Elliot loss model (simple bursty packetloss, few parameters available.)");
            $("#lossParameterSet").append('<label for="param_p">p </label><input title="loss probability" class="spinner" id="param_p"/><br>');
            $("#lossParameterSet").append('<label for="param_r">r </label><input title="burst duration" class="spinner" id="param_r"/><br>');
            printLossString = function(){return "gemodel " + $("#param_p").val() + " " + $("#param_r").val();};
            break;
          case "gilbert":
            $("#lossInfoText").html("Special case of the Gilbert-Elliot loss model (bursty packetloss, most parameters available).");
            $("#lossParameterSet").append('<label for="param_p">p </label><input title="loss probability" class="spinner" id="param_p"/><br>');
            $("#lossParameterSet").append('<label for="param_1-r">1-r </label><input title="burst duration" class="spinner" id="param_1-r"/><br>');
            $("#lossParameterSet").append('<label for="param_1-h">1-h </label><input title="loss probability in the bad state (B)" class="spinner" id="param_1-h"/><br>');
            printLossString = function(){return "gemodel " + $("#param_p").val() + " " + $("#param_1-r").val() +
              " " + $("#param_1-h").val();};
            break;
          case "gilbertElliot":
            $("#lossInfoText").html("Realizes bursty error patterns (bursty packetloss, all parameters available).");
            $("#lossParameterSet").append('<label for="param_p">p </label><input title="loss probability" class="spinner" id="param_p"/><br>');
            $("#lossParameterSet").append('<label for="param_1-r">1-r </label><input title="burst duration" class="spinner" id="param_1-r"/><br>');
            $("#lossParameterSet").append('<label for="param_1-h">1-h </label><input title="loss probability in the bad state (B)" class="spinner" id="param_1-h"/><br>');
            $("#lossParameterSet").append('<label for="param_1-h">1-k </label><input title="loss probability in the good state (G)" class="spinner" id="param_1-k"/><br>');
            printLossString = function(){return "gemodel " + $("#param_p").val() + " " + $("#param_1-r").val() + " " +
              $("#param_1-h").val() + " " + $("#param_1-k").val();};
            break;
          default: // e.g. none
            console.log("error parsing loss-string: " + newType);
            break;
        }

        if(newType === undefined || newType == "undefined" || newType=="random"){
          $('#lossImg').attr('src', '');
        }else{
          $('#lossImg').attr('src', 'res/img/' + newType + '.png');
        }
        $("#lossParameterSet .spinner").spinner({min: 0, max: 1, step: 0.0001});
        $("#lossParameterSet").tooltip();
      }

      // Determines the correct name for a kind of loss
      // From the name directly, or from the 'tc-command' and its parameters
      function categorize(lossString){
        if(lossString === undefined) return "undefined";
        var parts = lossString.split(" ");
        switch(parts[0]){
          case "undefined":
          case "random":
          case "state":
          case "bernoulli":
          case "simpleGilbert":
          case "gilbert":
          case "gilbertElliot":
            return parts[0];
          case "gemodel":
            if(parts.length === 5) return "gilbertElliot";
            if(parts.length === 4) return "gilbert";
            if(parts.length === 3) return "simpleGilbert";
            return "bernoulli";
        }
      }

      //
      // Edge-Cooltip Methods
      //

      // create and show a edge-cooltip
      function showEdgeCooltip(id){
        var edgeInfo = edgeInformation[id];

        var title = 'Pi #' + edges.get(id).from + '&emsp; &#x21c4 &emsp;' + 'Pi #' + edges.get(id).to;
        if($("#" + id).length === 0){ // add div if not already present
          $("body").append('<div id="' + id + '" title="'+ title + '"></div>');

          $('#' + id).dialog({
            create: function(event, ui) {
              widget = $(this).dialog("widget");
              widget.mouseleave(function(){clearTimeout(edgeCoolTipTimeout); hideEdgeCooltip(id);});
            },
            open: function(event, ui){

              // correct position
              $(this).dialog("widget").position({
                my: 'left top',
                at: "left+" + mousePosition.x +" top+"+mousePosition.y,
                of: window
              });

              // update the the tooltips content when it is (re) - opened
              var coolTipContents = '<p>' + 'Bandwidth <b>' + arrowRight +'</b> : ' + edgeInfo.bandwidthRight + '[kbps]</p>' +
              '<p>' + 'Bandwidth <b>' + arrowLeft +'</b> : ' + edgeInfo.bandwidthLeft + '[kbps]</p>' +
              '<p>' + 'Delay <b>' + arrowRight + '</b> : ' + edgeInfo.delayRight + '[ms]</p>' +
              '<p>' + 'Delay <b>' + arrowLeft + '</b> : ' + edgeInfo.delayLeft + '[ms]</p>';

              if(edgeInfo.lossRight !== undefined && edgeInfo.lossRight !== "undefined"){
                coolTipContents += '<p>' + 'Loss <b>' + arrowRight + '</b> : ' + edgeInfo.lossRight + '</p>';
              }
              if(edgeInfo.lossLeft !== undefined && edgeInfo.lossLeft !== "undefined"){
                coolTipContents += '<p>' + 'Loss <b>' + arrowLeft + '</b> : ' + edgeInfo.lossLeft + '</p>';
              }

              $("#" + id).html(coolTipContents);
            },
            show: {
              effect: 'fade',
              duration: 500
            },
            autoOpen: false,
            width: 250,
            resize: function(event, ui) { $(this).css("width","100%");} // continue taking up all horiz. space
          });
        }

        $('#' + id).dialog("open");
      }

      // hides the Edge-Cooltip
      function hideEdgeCooltip(id){
        $("#" + id).dialog( "close" );
      }

      // hides all currently open edge-cooltips
      function cleanupEdgeCooltips(){
        var edges = network.body.data.edges;
        var allEdges = edges.get({returnType:"Object"});

        for(var edgeId in allEdges) {
          hideEdgeCooltip(edgeId);
        }
      }

      // Displays "text" in a box styled in "kind"
      // kind may be info, success, warning, danger,
      function showMessage(text,kind){
        // change message-text to the new requirements
        $('#messageContainer').attr("class","alert alert-dismissible alert-" + kind);
        $('#message').html(text);

        // show messageContainer, if it isn't visible already
        if(!$('#messageContainer').is(":visible")){
          $('#messageContainer').show();
        }

        // reset timer to hide messageContainer automatically after 3 seconds
        clearTimeout(messageHideTimeout);
        messageHideTimeout = setTimeout(function(){$('#messageContainer').hide();},3000);
      }


      //
      // MISC utility methods
      //
      // returns a random number from within the given range (inclusive)
      function getRandomNumberWithRange(min, max){
        return Math.floor((Math.random()*(max - min + 1)) + min);
      }

      // returns if all nodes of the current network are connected
      function isNetworkConnected(){
        if(nodes.length === 0 || nodes.length === 1) return true;
        var conectedNodes = [];
        var queue = [nodes.get(0).id]; // init queue with first node
        var entry;
        var reachedNodes = [];

        while(queue.length > 0){
          connectedNodes = network.getConnectedNodes(queue[0]);
          for(var i = 0; i < connectedNodes.length; i++){
            entry = parseInt(connectedNodes[i]);
            if((reachedNodes.indexOf(entry) === -1) && (queue.indexOf(entry) === -1)){
              queue.push(entry); // add node to queue when it isnt already present and has not been checked yet
            }
          }
          reachedNodes.push(queue[0]); // we checked this node
          queue.shift(); // remove first element in queue
        }
        // all nodes reached -> network connected
        return (reachedNodes.length === nodes.length);
      }

      // checks if a given string starts with given prefix
      function stringStartsWith(string, prefix) {
        return string.slice(0,prefix.length) == prefix;
      }

      // checks if a given connection has already be made by a previously added edge
      function isEdgeAlreadyPresent(from, to){
        var edges = network.body.data.edges;
        var allEdges = edges.get({returnType:"Object"});

        var edge;

        for(var edgeId in allEdges) {
          edge = allEdges[edgeId];
          if(((edge.from === from) && (edge.to === to)) || ((edge.to === from) && (edge.from === to))){
            return true;
          }
        }
        return false;
      }

      // returns the smallest, available node-id
      function getNextFreeId(){
        var i = 0;
        while(nodes.get(i)){
          i += 1;
        }
        return i;
      }

      // returns the overall maximum-bandwidth to be found in the edgeInformation
      function getMaxBandwidth(){
        var maxBandwidth = 0;
        Object.keys(edgeInformation).forEach(function(key,index) {
          maxBandwidth = Math.max(maxBandwidth,Math.max(edgeInformation[key].bandwidthRight, edgeInformation[key].bandwidthLeft));
        });
        return maxBandwidth;
      }

      // returns a 'associative array' indexed by group-colors, containing
      // the single allowed server per group
      function getServerperColor(){
        var serverPerColor = {}; // there can only be one server per group
        var allNodes = network.body.data.nodes.get({returnType:"Object"});

        var node;
        var color;

        for(var nodeId in allNodes) {
          node = allNodes[nodeId];
          if(node.group === "server"){
            color = node.font.slice(node.font.indexOf("#"));
            serverPerColor[color] = nodeId;
          }
        }
        return serverPerColor;
      }
