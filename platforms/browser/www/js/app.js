window.onload = function() {
    document.addEventListener("deviceready", init, false);
}
function init() { //run everything in here only when device is ready

	requestUri = 'http://localhost:8888/list-walks'; 

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
    
    startWalkBtn.addEventListener("click", getWalkDirections, false);
}

function removeExtAndUnderscore(filename) {

	var removeExt=filename.substring(0,filename.indexOf('.gpx'));
	var removeUnderscore=removeExt.replace(/_/g,' '); 
	return removeUnderscore; 

}
function getWalkDirections() {

    var select=document.querySelector(".choose-walk");
    var selectedValue=select.value; 
   	
   	if(selectedValue !== '') {
   		// if(walknotindatabase) {
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
			promiseObject.then(addWalkToDatabase, error); 
		// }
	}
}
function addWalkToDatabase(directions) {
	
	directions = JSON.parse(directions); 
	var route = directions.routes[0]; 
	var legs = route.legs; //a leg is a route between two waypoints 	
	console.log(directions); 
	// 	var route = directionObject['routes'][0]; 
	// var steps = route['steps'];

	// var stepsRelevantData = []; 
	// for (var i= 0; i< steps.length; i++) {

	// 	var currentStep=steps[i]; 

	// 	var direction=currentStep['direction']; 
	// 	var distance=currentStep['distance']; 
	// 	var instruction=currentStep['maneuver']['instruction']; 
	// 	var type=currentStep['maneuver']['type']; 
	// 	var coordinates=currentStep['maneuver']['location']['coordinates']; //coordinates are in [longitude, latitude] for google maps lat long goes the other way!

	// 	stepsRelevantData.push({coordinates:coordinates, distance:distance, direction:direction, type:type, instruction: instruction})
	// 	console.log(coordinates); 
	// 	//testing purposes
	// 	document.getElementById('key-coordinates').innerHTML+="Latitude: "+coordinates[1]+", Longitude "+coordinates[0]+ "</br>";  
	// }
	// return stepsRelevantData; 
}
function error(status) {
	console.log('failed with status code' + status); 
}

