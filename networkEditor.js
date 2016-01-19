 var mousePosition = {x: 0, y: 0};

 var images = {
		router: "res/img/blueRouter.svg",
		server: "res/img/server.svg",
		client: "res/img/client.svg"
	 };

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
    }
  };

  var container = document.getElementById('graphContainer');
  // draw graph
  network = new vis.Network(container, {nodes: nodes,edges: edges}, options);

}

// Draws a legend containing met-information about the networkLayout (/ Topology)
function drawLegend(){
	  $('#legendContainer').append('<ul id="legendList" class="list-group">' +
										'<li id="legendGraph" class="noPadding list-group-item"></li>' +
									'</ul>');


      $('#legendList').append('<li class="list-group-item">'+
        '<center><img class="addable" id="imgRouter" src="' + images.router +'" height="64" width="64">Router</center>'+
        '<center><img class="addable" id="imgServer" src="' + images.server +'" height="64" width="64">Router + Server</center>'+
        '<center><img class="addable" id="imgClient" src="' + images.client +'" height="64" width="64">Router + Client</center>'+
      '</li>');

      //$('#imgRouter').draggable();
      $(".addable").draggable({
            revert: "invalid" ,
            helper: function(){
                $copy = $(this).clone();
                return $copy;},
            appendTo: 'body',
            scroll: false
        });


        $( "#graphContainer" ).droppable({
            drop: function( event, ui ) {
              if(ui.draggable[0].id === "imgRouter"){
                console.log("adding router " + nodes.length + 1 + " at ("  + ui.position.left+','+ui.position.top+')');
                nodes.add({id: nodes.length + 1, x: ui.position.left, y: ui.position.top, label: '',shape: "image", image: images.router, shadow: true, physics:false});
                network.redraw();
              }else if(ui.draggable[0].id === "imgServer"){
                console.log("adding server");
              }else if(ui.draggable[0].id === "imgClient"){
                console.log("adding client");
              }
              //  console.log("dropped!");
               console.log(event);
                console.log(ui);
            }
        });

        // add buttons for toggling traffic / rtLog - watching on or off
        $('#legendList').append('<li class="list-group-item"><div id="btnGrp">'+
            '<label for="generateBtn">generate file</label><input type="checkbox" id="generateBtn"/>' +
        '</div></li>');

        $('#btnGrp').buttonset();

      /*  $('#generateBtn').bind('change', function(){
          if($(this).is(':checked')){
              $(this).button('option', 'label', "ignore traffic");
              changeModeOfOperation(true,mode.rtlog);
            }else{
              $(this).button('option', 'label', "watch traffic");
              changeModeOfOperation(false,mode.rtlog);
            }
          });*/
}
