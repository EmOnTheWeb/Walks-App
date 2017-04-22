window.onload = function() {
    document.addEventListener("deviceready", init, false);
}

storage = Lawnchair({name: 'walk-information'}, function(e) {
	console.log('storage initialized'); 
})
function init() { //run everything in here only when device is ready

	var requestUri = 'http://localhost:8888/list-walks'; 

	var xhr = new XMLHttpRequest();
	    
	xhr.open('GET',requestUri, true);
	xhr.send(null);  

	xhr.onreadystatechange = function() {
	    if (xhr.readyState == XMLHttpRequest.DONE) { 
	        var walks = xhr.responseText;
	        readIntoSelect(walks);        
	    }
	}

	function readIntoSelect(walks) {
		walks= JSON.parse(walks);
		 
		var selectElem=document.querySelector(".choose-walk"); 
		for(var i=0; i<walks.length; i++) {
			var opt=document.createElement("option"); 
			
			opt.text=removeExtAndUnderscore(walks[i]); 

			var value=walks[i].substring(0,walks[i].indexOf('.gpx'));
			opt.value=walks[i].substring(0,walks[i].indexOf('.gpx')); 
			selectElem.add(opt,null); 
		}
	}

	var startWalkBtn = document.querySelector(".start-walk");
    
    startWalkBtn.addEventListener("click", function() {
     	
    	var promiseObject = new Promise(function(resolve, reject){	
     		getWalkDirections(resolve, reject); 
     	}); 
     	promiseObject.then(function(value) {
     		console.log(value); 
     	})
    }, false);
}

function removeExtAndUnderscore(filename) {

	var removeExt=filename.substring(0,filename.indexOf('.gpx'));
	var removeUnderscore=removeExt.replace(/_/g,' '); 
	return removeUnderscore; 

}
function getWalkDirections(resolve, reject) {

    var select=document.querySelector(".choose-walk");
    var selectedValue=select.value; 

   	if(selectedValue !== '') {
   		var walkName = select.options[select.selectedIndex].text; 
   		storage.get(walkName, function(walkDirections) {
   			if(walkDirections) {
   				resolve(walkDirections); 
   			} else {
			    requestUri = 'http://localhost:8888/get-directions/'+selectedValue; 

				var xhr = new XMLHttpRequest();
				    
				xhr.open('GET',requestUri, true);
				xhr.send(null);  

				var promiseObject = new Promise(function(resolve, reject){	
					xhr.onreadystatechange = function() {
				    	if (xhr.readyState == XMLHttpRequest.DONE) { 
				    		if(xhr.status===200) {
				        		var directions = xhr.responseText;   
				        		resolve(directions);  
				        	} else {
				        		reject(xhr.status);
				        	}
				    	}
					}
				}); 
				promiseObject.then(saveWalk.bind(null,resolve), error); 
			}
		}); 
	}
}
function saveWalk(resolve, directions) {
	
	directions = JSON.parse(directions); 
	var route = directions.routes[0]; 
	var legs = route.legs; //a leg is a route between two waypoints 	

	var select = document.querySelector(".choose-walk");  
	var walkName = select.options[select.selectedIndex].text; 

	//walk start and end coordinates
	var startCoordinate = directions.waypoints[0].location.join(); 
	var endCoordinate = directions.waypoints[directions.waypoints.length-1].location.join(); 

	var legs = directions.routes[0].legs; 

	for(var i=0; i<legs.length; i++) {
		//remove properties you don't need 
		delete legs[i].distance; 
		delete legs[i].duration; 
		delete legs[i].summary; 
		delete legs[i].weight; 

		//steps keep maneuver, location, type 
		for(var index=0; index<legs[i].steps.length; index++) {

			delete legs[i].steps[index].distance; 
			delete legs[i].steps[index].duration; 
			delete legs[i].steps[index].geometry; 
			delete legs[i].steps[index].intersections; 
			delete legs[i].steps[index].mode; 
			delete legs[i].steps[index].name; 
			delete legs[i].steps[index].weight; 
			legs[i].steps[index].instruction = legs[i].steps[index].maneuver.instruction; 
			legs[i].steps[index].location = legs[i].steps[index].maneuver.location; 
			legs[i].steps[index].type = legs[i].steps[index].maneuver.type;
			delete legs[i].steps[index].maneuver; 
		}
	}

	storage.save({ key : walkName, 
				   value : {
				   		beginning: startCoordinate,
				   		end : endCoordinate,
				   		legs : legs
				   }
				}, function(doc){	
		console.log('walk saved locally'); 	
	});
	resolve({ key : walkName, 
				   value : {
				   		beginning: startCoordinate,
				   		end : endCoordinate,
				   		legs : legs
				   }
				}); 	
  }

function error(status) {
	console.log('failed with status code' + status); 
}

