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


 	// colors of BYR color wheel, order changed
	var colors = ["#0247fe","#8601af","#66b032","#fe2712","#fefe33","#fb9902",
		      "#0392ce","#3d01a4","#d0ea2b","#a7194b","#66b032","#fabc02"];



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
				 if (data.from === data.to) {
					 var r = confirm("Do you want to connect the node to itself?");
					 if (r === true) {
						 callback(data);
					 }
				 }
				 else {
					// check if there is already a edge from here to there
					 if(!isEdgeAlreadyPresent(data.from, data.to)){
						 callback(data);
					 }
				 }
			},
			editEdge: function(data, callback){
				 // check if there is already a edge from here to there
				if(isEdgeAlreadyPresent(data.from, data.to) || (data.to === data.from)){
					callback(null);
				}
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
                nodes.add({id: nodeId, x:pos.x, y: pos.y, label: 'Pi #' + nodeId ,shape: "image", image: images.router, shadow: true, physics:false});
              }else if(ui.draggable[0].id === "imgServer"){
                nodes.add({id: nodeId, x:pos.x, y: pos.y, label: 'Pi #' + nodeId ,shape: "image", image: images.server, shadow: true, physics:false});
              }else if(ui.draggable[0].id === "imgClient"){
                nodes.add({id: nodeId, x:pos.x, y: pos.y, label: 'Pi #' + nodeId ,shape: "image", image: images.client, shadow: true, physics:false});
              }
              network.redraw();
            }
        });

				$( "body" ).keyup(function(event) {
					if(event.key === "Delete"){
						// delete all selected Nodes from graph
						network.getSelectedNodes().forEach(function(nodeId){
							nodes.remove({id: nodeId});
							console.log("deleted Pi #" + nodeId);
						});
						network.getSelectedEdges().forEach(function(edgeId){
							edges.remove({id: edgeId});
							console.log("deleted edge #" + edgeId);
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
					console.log("editing edge info");
					// TODO: show modal dialog in which the edge-params can be specified
					$( "#edgeDialog" ).dialog({
						resizable: true,
						width: 600,
						height:500,
						modal: true,
						open: function(event, ui){
								var selectedEdgeId = network.getSelectedEdges()[0];
								var edge = edges.get(selectedEdgeId);
								var arrowRight = '<span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>';
							  var arrowLeft = '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span>';

								console.log(selectedEdgeId);
								console.log(edge);

				    		// setup edit - elements / display edge characteristics
								// update title
								$("#edgeTitle").html("Pi #" + edge.from + '&emsp;' + arrowLeft +  arrowRight +' &emsp;' + "Pi #" + edge.to);

								// update BandwidthRight-slider
								$( "#bandwidthRightSlider" ).slider({
									value:2000,
									min: 50,
									max: 8000,
									step: 50,
									slide: function( event, ui ) {
										$( "#bandwidthRight" ).val(ui.value + " [kbps]");
									}
								});
								$( "#bandwidthRight" ).val($( "#bandwidthRightSlider" ).slider( "value" ) + " [kbps]");

				    },
						buttons: {
							"Ok": function() {
								// update edge-information (of currently selected edge)
								console.log("saving changes to edge");
								$( this ).dialog( "close" );
							},
							Cancel: function() {
								// throw away changes
								$( this ).dialog( "close" );
							}
						}
					});
					/*edgeInformation[edgeId]={from: edgeInfo[0], to: edgeInfo[1], bandwidthRight: edgeInfo[2],
						bandwidthLeft: edgeInfo[3], delayRight: edgeInfo[4], delayLeft: edgeInfo[5], initialWidth: width,
						traffic: undefined};*/

				});
				$("#edgeInfoItem").hide();


				// Only show option to edit edge-connection info when the user has currently selected an edge
				network.on("selectEdge", function(params){
					$("#edgeInfoItem").show();
				});
				network.on("deselectEdge", function(params){
					$("#edgeInfoItem").hide();
				});
}

function getTopologyFile(){
	var fileBuffer = [];
	fileBuffer.push("#number of nodes");
	fileBuffer.push(nodes.length); // e.g. 20
	fileBuffer.push("#nodes setting (n1,n2,bandwidth in kbits a -> b, bandwidth in kbits a <- b, delay a -> b in ms, delay b -> a in ms");
	/*0,4,4225,4802,17,18
	3,5,4883,4017,13,6
	4,6,4899,4746,16,7
	2,7,4059,4815,14,14
	0,8,4471,4800,10,9*/
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
