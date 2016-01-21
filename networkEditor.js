var mousePosition = {x: 0, y: 0};

var images = {
		router: "res/img/blueRouter.svg",
		server: "res/img/server.svg",
		client: "res/img/client.svg"
	 };

var lengendWidth;

var nodes;
var edges;
var network;
var edgeInformation = {};


var arrowRight = '<span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>';
var arrowLeft = '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span>';

 	// colors of BYR color wheel, order changed
var colors = ["#0247fe","#8601af","#66b032","#fe2712","#fefe33","#fb9902",
		      "#0392ce","#3d01a4","#d0ea2b","#a7194b","#fabc02"]; //TODO: #66b032 was duplcated! -> correct in netvis as well!



//
// Main Entry Point of the Program
//
 $(document).ready(function(){
	    // hide javaScriptAlert - div, proof that js works
	    $(javaScriptAlert).hide();

      lengendWidth = $('#legendContainer').width();

      $("body").mousemove(function(e) {
        mousePosition.x = e.pageX;
        mousePosition.y = e.pageY;
      });

      // init Network-graph
      initNetwork();

      // draw Legend / Toolbox
      drawLegend();

});

function initNetwork(){
  nodes = new vis.DataSet();
  edges = new vis.DataSet();

  var options = {
    // specify randomseed => network is the same at every startup
    autoResize: true,
    height: '100%',
    edges: {
      physics: true,
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
      physics: true
    },
		manipulation: {
			initiallyActive: true,
			addNode: false,
			addEdge: function (data, callback) {
				 if(data.from !== data.to) {
					// check if there is already a edge from here to there
					 if(!isEdgeAlreadyPresent(data.from, data.to)){
						 callback(data);
						 edgeInformation[data.id] = {bandwidthRight: 2000, bandwidthLeft: 2000, delayRight: 5, delayLeft: 5};
					 }
				 }
			},
			editEdge: function(data, callback){
				 // check if there is already a edge from here to there
				if(isEdgeAlreadyPresent(data.from, data.to) || (data.to === data.from)){
					callback(null);
				}else{
					callback(data);
				}
			},
			deleteEdge: function(data, callback){
				data.edges.forEach(function(edgeId){
					delete edgeInformation[edgeId];
				});
				callback(data);
			}
		}
  };

  var container = document.getElementById('graphContainer');
  // draw graph
  network = new vis.Network(container, {nodes: nodes,edges: edges}, options);

	// zoom to 100%
	network.moveTo({scale: 1.0});

}

// Draws a legend containing met-information about the networkLayout (/ Topology)
function drawLegend(){
	  $('#legendContainer').append('<ul id="legendList" class="list-group"></ul>');


      $('#legendList').append('<li class="list-group-item">'+
        '<center><img class="addable" id="imgRouter" src="' + images.router +'" height="64" width="64">Router</center>'+
        '<center><img class="addable" id="imgServer" src="' + images.server +'" height="64" width="64">Router + Server</center>'+
        '<center><img class="addable" id="imgClient" src="' + images.client +'" height="64" width="64">Router + Client</center>'+
      '</li>');

      $(".addable").draggable({
            revert: "invalid" ,
            helper: function(){
                $copy = $(this).clone();
                return $copy;},
            appendTo: 'body',
            scroll: false
        });


        // handle incoming drops from the legend / toolbox
        $( "#graphContainer" ).droppable({
            drop: function( event, ui ) {
              var pos = network.DOMtoCanvas({x: mousePosition.x - lengendWidth, y: mousePosition.y});
							var nodeId = getNextFreeId();
              if(ui.draggable[0].id === "imgRouter"){ //TODO: id - assignment doesn't cover deletion of nodes (gap!)
                nodes.add({id: nodeId, x:pos.x, y: pos.y, label: 'Pi #' + nodeId ,shape: "image", font: "20px arial black", image: images.router, shadow: true, physics:false});
              }else if(ui.draggable[0].id === "imgServer"){
                nodes.add({id: nodeId, x:pos.x, y: pos.y, label: 'Pi #' + nodeId ,shape: "image", font: "20px arial black", image: images.server, shadow: true, physics:false});
              }else if(ui.draggable[0].id === "imgClient"){
                nodes.add({id: nodeId, x:pos.x, y: pos.y, label: 'Pi #' + nodeId ,shape: "image", font: "20px arial black", image: images.client, shadow: true, physics:false});
              }
              network.redraw();
            }
        });

				$( "body" ).keyup(function(event) {
					if(event.key === "Delete"){
						// delete all selected Nodes from graph
						network.getSelectedNodes().forEach(function(nodeId){
							nodes.remove({id: nodeId});
						});
						network.getSelectedEdges().forEach(function(edgeId){
							edges.remove({id: edgeId});
						});
					}
				});

        // add buttons for toggling traffic / rtLog - watching on or off
        $('#legendList').append('<li class="list-group-item"><button id="genBtn">generate file</button></li>');
        $('#genBtn').button().click(function(event){
					console.log("generating / displaying network-topology");
					console.log(getTopologyFile());
				});

				$('#legendList').append('<li class="list-group-item"><button id="addEdgeBtn">add edge</button></li>');
				$('#addEdgeBtn').button().click(function(event){
					network.addEdgeMode();
				});

				$('#legendList').append('<li id="edgeInfoItem" class="list-group-item"><button id="editEdgeInfoBtn">edit edge info</button></li>');
				$('#editEdgeInfoBtn').button().click(function(event){
					// show modal dialog in which the edge-params can be specified
					showEdgeParameterEditDialog();
				});
				$("#edgeInfoItem").hide();

				// add group (color) - selector
				$('#legendList').append('<li id="nodeGroupItem" class="list-group-item"><label for="number">group:</label><select id="grpSelect"></select></li>');

				$( "#grpSelect" ).change(function() {
					if(network.getSelectedNodes().length === 1){
						nodes.update([{id: network.getSelectedNodes()[0], font: "20px arial " + $( this ).val()}]);
					}
				});
				$("#nodeGroupItem").hide();

				// Only show option to edit edge-connection info when the user has currently selected an edge
				network.on("selectEdge", function(params){
					$("#edgeInfoItem").show();
				});
				network.on("deselectEdge", function(params){
					$("#edgeInfoItem").hide();
				});

				// Only show grou select when the user has currently selected an node
				network.on("selectNode", function(params){
					if(network.getSelectedNodes().length === 1){
							var font = nodes.get(network.getSelectedNodes()[0]).font;
							var options = ['<option value="#000000">none</option>'];
							colors.forEach(function(color){
								options.push('<option ' + ((font.indexOf(color) > -1) ? "selected " :"") +'value="' + color + '" style="background:'+ color + '">' + options.length + '</option>');
							});
							$("#grpSelect").html(options.join("\n"));
					}
					$("#nodeGroupItem").show();
				});
				network.on("deselectNode", function(params){
					$("#nodeGroupItem").hide();
				});

				network.on("doubleClick", function(params){
					if(params.edges.length === 1){
						showEdgeParameterEditDialog();
					}
				});
}

function getTopologyFile(){
	var fileBuffer = [];
	var info;
	fileBuffer.push("#number of nodes");
	fileBuffer.push(nodes.length); // e.g. 20

	fileBuffer.push("#nodes setting (n1,n2,bandwidth in kbits a -> b, bandwidth in kbits a <- b, delay a -> b in ms, delay b -> a in ms");
	edges.forEach(function(edge){
		info = edgeInformation[edge.id];
		fileBuffer.push(edge.from + "," + edge.to + "," + info.bandwidthRight + "," +
	  	info.bandwidthLeft + "," + info.delayRight + "," + info.delayLeft);
	});

	fileBuffer.push("#properties (Client, Server)");
	/*4,18
	8,10
	13,9*/
	fileBuffer.push("#eof //do not delete this");
	// ending newline?
	return fileBuffer.join("\n");
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

function showEdgeParameterEditDialog(){
	$( "#edgeDialog" ).dialog({
		resizable: true,
		width: 600,
		height:430,
		modal: true,
		open: function(event, ui){
				var selectedEdgeId = network.getSelectedEdges()[0];
				var edge = edges.get(selectedEdgeId);
				var edgeInfo = edgeInformation[selectedEdgeId];

				// setup edit - elements / display edge characteristics
				$("#edgeTitle").html("Pi #" + edge.from + '&emsp;' + arrowLeft +  arrowRight +' &emsp;' + "Pi #" + edge.to);

				// update BandwidthRight-slider
				$( "#bandwidthRightSlider" ).slider({
					value:edgeInfo.bandwidthRight,
					min: 50,
					max: 8000,
					step: 50,
					slide: function( event, ui ) {
						$( "#bandwidthRight" ).val(ui.value + " [kbps]");
					}
				});
				$( "#bandwidthRight" ).val($( "#bandwidthRightSlider" ).slider( "value" ) + " [kbps]");

				// update BandwidthLeft-slider
				$( "#bandwidthLeftSlider" ).slider({
					value:edgeInfo.bandwidthLeft,
					min: 50,
					max: 8000,
					step: 50,
					slide: function( event, ui ) {
						$( "#bandwidthLeft" ).val(ui.value + " [kbps]");
					}
				});
				$( "#bandwidthLeft" ).val($( "#bandwidthLeftSlider" ).slider( "value" ) + " [kbps]");

				// update delayRight - slider
				$( "#delayRightSlider" ).slider({
					value: edgeInfo.delayRight,
					min: 0,
					max: 100,
					step: 1,
					slide: function( event, ui ) {
						$( "#delayRight" ).val(ui.value + " [ms]");
					}
				});
				$( "#delayRight" ).val($( "#delayRightSlider" ).slider( "value" ) + " [ms]");

				// update delayLeft - slider
				$( "#delayLeftSlider" ).slider({
					value:edgeInfo.delayLeft,
					min: 0,
					max: 100,
					step: 1,
					slide: function( event, ui ) {
						$( "#delayLeft" ).val(ui.value + " [ms]");
					}
				});
				$( "#delayLeft" ).val($( "#delayLeftSlider" ).slider( "value" ) + " [ms]");

		},
		buttons: {
			"Ok": function() {
				// update edge-information (of currently selected edge)
				var selectedEdgeId = network.getSelectedEdges()[0];

				edgeInformation[selectedEdgeId].bandwidthRight = $( "#bandwidthRightSlider" ).slider( "value" );
				edgeInformation[selectedEdgeId].bandwidthLeft = $("#bandwidthLeftSlider").slider("value");
				edgeInformation[selectedEdgeId].delayRight = $("#delayRightSlider").slider("value");
				edgeInformation[selectedEdgeId].delayLeft = $("#delayLeftSlider").slider("value");
				$( this ).dialog( "close" );
			},
			Cancel: function() {
				// throw away changes
				$( this ).dialog( "close" );
			}
		}
	});
}
