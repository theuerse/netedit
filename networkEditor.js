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
			 if (data.from == data.to) {
				 var r = confirm("Do you want to connect the node to itself?");
				 if (r === true) {
					 callback(data);
				 }
			 }
			 else {
				 callback(data);
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
        $('#legendList').append('<li class="list-group-item"><button id="genBtn">A button element</button></li>');
        $('#genBtn').button().click(function(event){
					console.log("generating / displaying network-topology");
				});
}

// returns the smallest, available node-id
function getNextFreeId(){
		var i = 0;
		while(nodes.get(i)){
			i += 1;
		}
		return i;
}
