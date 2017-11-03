
//
// Main Entry Point of the Program
//
 $(document).ready(function(){
	    // hide javaScriptAlert - div, proof that js works
	    $('#javaScriptAlert').hide();

			// hide message container
			$('#messageContainer').hide();

			// add eventhandler to allow dismissal of message
			$('#messageContainer button').click(function(){
				$('#messageContainer').hide();
			});

      lengendWidth = $('#legendContainer').width();

      $("body").mousemove(function(e) {
        mousePosition.x = e.pageX;
        mousePosition.y = e.pageY;
      });

			// disable text-selection (especially helpful on buttons / draggable images)
			$(document).bind('selectstart', function(e) {
				e.preventDefault();
				return false;
			});

      // init Network-graph
      initNetwork();

      // draw Legend / Toolbox
      drawLegend();

			// start observing the graph-container
			setupGraphManipulationListener();

});


// make the networkTopology-File-content available to the user (downloadable)
function makeFileAvailable(fileContent){
	var data = new Blob([fileContent], {type: 'text/plain'});

	if(topologyFile !== null){
		// manually clean up to avoid memory leaks
		window.URL.revokeObjectURL(topologyFile);
	}

	// store locally / get url to file
	topologyFile = window.URL.createObjectURL(data);
	showTopologyDownloadDialog(topologyFile);
}

// UI-Functions
// Draws a legend/Toolbox containing UI-controls
function drawLegend(){
  $('#legendContainer').append('<ul id="legendList" class="list-group"></ul>');

  // add Node-Images that can be dragged onto the network in order to insert them
  $('#legendList').append('<li class="list-group-item">'+
  '<center><img class="addable" id="imgRouter" src="' + images.router +'" height="64" width="64"><br>Router</center>'+
  '<center><img class="addable" id="imgServer" src="' + images.server +'" height="64" width="64"><br>Router + Server</center>'+
  '<center><img class="addable" id="imgClient" src="' + images.client +'" height="64" width="64"><br>Router + Client</center>'+
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
      accept: function(el) {
        // only allow to add up to maxNumberOfNodes nodes
        if((el[0].tagName !== "IMG") || (nodes.length < maxNumberOfNodes)){ return true;}
        else {
          showMessage("Node-limit (max " + maxNumberOfNodes + " nodes) reached.","danger");
          return false;
        }
      },
      drop: function( event, ui ) {
        var pos = network.DOMtoCanvas({x: mousePosition.x - lengendWidth, y: mousePosition.y});
        var nodeId = getNextFreeId();
        if(ui.draggable[0].id === "imgRouter"){
          nodes.add({id: nodeId, x:pos.x, y: pos.y, label: 'Pi #' + nodeId, color: nodeColors,
          group: "router", font: "20px arial #000000", image: images.router, physics:false});
        }else if(ui.draggable[0].id === "imgServer"){
          nodes.add({id: nodeId, x:pos.x, y: pos.y, label: 'Pi #' + nodeId, color: nodeColors,
          group: "server", font: "20px arial #000000", image: images.server, physics:false});
        }else if(ui.draggable[0].id === "imgClient"){
          nodes.add({id: nodeId, x:pos.x, y: pos.y, label: 'Pi #' + nodeId, color: nodeColors,
          group: "client", font: "20px arial #000000", image: images.client, physics:false});
        }
        network.redraw();
      }
    });

    // allow deletion of edges/nodes by pressing DELETE on the keyboard
    window.addEventListener("keyup", function (event) {
      if(event.keyCode === 46){ // DELETE ... 46
        // user pressed 'delete' -> delete the currently selected node/edge
        network.deleteSelected();
      }else if(event.keyCode === 27){ // ESCAPE ... 27
        // cancel adding edges if in addEdges-Mode and the escape-key is pressed
        if($('#addEdgeToggle').is(':checked')){
          stopAddingEdges();
        }
      }
    });

    // add a FileOpen-Button
    $('#legendList').append('<li class="list-group-item"><input  id="fileInput" type="file"/><button id="openFileBtn">import topology</button></li>');
    $('#fileInput').change(function(event){
      var files = event.target.files;
      if(files.length > 0){
        var reader = new FileReader();
        reader.onload = function(theFile){
          $(".cooltip").dialog("destroy").remove(); // remove 'old' cooltips
          drawTopology(reader.result);
          updateEdgeWidth();
        };
        reader.readAsText(files[0]);
      }
    });
    $("#openFileBtn").button().click(function(event){
      stopAddingEdges();
      $("#fileInput").trigger("click");
    });

    // add a button opening a dialog for editing edge-presets
    $('#legendList').append('<li class="list-group-item"><button id="presetBtn">edit edge presets</button></li>');
    $('#presetBtn').button().click(function(event){
      stopAddingEdges();
      // show modal dialog in which the edge-presets can be edited
      showEdgePresetEditDialog();
    });

    // add a button responsible to create/ let download the topology-file of the current network
    // or show a error-dialog if the network is not connected (there exist isolated nodes)
    $('#legendList').append('<li class="list-group-item"><button id="exportBtn">export topology</button></li>');
    $('#exportBtn').button().click(function(event){
      stopAddingEdges();
      if(isNetworkConnected()){
        makeFileAvailable(getTopologyFile());
      }else {
        showMessage("The network-topology file could not be created: The network is not connected.","danger");
      }
    });

    // add a generally available button to add new edges to the network
    $('#legendList').append('<li class="list-group-item"><label for="addEdgeToggle">add edge(s)</label><input type="checkbox" id="addEdgeToggle"/></li>');
    $('#addEdgeToggle').button();

    $('#addEdgeToggle').bind('change', function(){
      if($(this).is(':checked')){
        $(this).button('option', 'label', "stop adding edge(s)");
        network.addEdgeMode();
      }else{
        $(this).button('option', 'label', "add edge(s)");
        network.disableEditMode();
        network.enableEditMode();
      }
    });

    // add a button which enables the user to edit a edges parameters (bandwidth, delay), IF a edge is selected
    $('#legendList').append('<li id="edgeInfoItem" class="list-group-item"><button id="editEdgeInfoBtn">edit edge info</button></li>');
    $('#editEdgeInfoBtn').button().click(function(event){
      stopAddingEdges();
      // show modal dialog in which the edge-params can be specified
      showEdgeParameterEditDialog();
    });
    $("#edgeInfoItem").hide();

    // add group (color) - selector
    $('#legendList').append('<li id="nodeGroupItem" class="list-group-item"><label for="number">group:</label><select id="grpSelect" class="form-control"></select></li>');
    $( "#grpSelect" ).change(function() {
      stopAddingEdges();
      if(network.getSelectedNodes().length === 1){
        nodes.update([{id: network.getSelectedNodes()[0], font: "20px arial " + $( this ).val()}]);
      }
    });
    $("#nodeGroupItem").hide();

    // add eventhandlers to react to teh selection of nodes/edges
    addNetworkEventListeners();
  }

// display a dialog with the option to download a generated Network Topology
function showTopologyDownloadDialog(fileUrl){
	$("#topologyDownloadDialog").dialog({
		modal: true,
		width: 400,
		buttons: {Ok: function(){$(this).dialog("close");}}
	});

	$("#downloadLink").attr("href", fileUrl); // update anchor-target
	$("#downloadLink").button();
}
