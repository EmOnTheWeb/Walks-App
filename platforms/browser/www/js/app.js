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
   		var walkName = select.options[select.selectedIndex].text; 
   		storage.get(walkName, function(walkDirections) {

   			if(walkDirections) {
   				console.log(walkDirections); 
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
				promiseObject.then(saveWalk, error); 

			}
		}); 
	}
}
function saveWalk(directions) {
	
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
		console.log('i saved the walk' + doc); 	
	});

	// Lawnchair({adaptor:'dom', table:'people'}, function() {
	// 	console.log('hi'); 
		
	// 	var me = {name:'brian'}; 
	// 	this.save({ key : 'name', value : 'blahblah'}, function(doc){
 //    		console.log(doc); 
	// 	});

	// 	this.save({ key : 'rar', value : 'rararara'}, function(doc){
 //    		console.log(doc); 
	// 	});

	// 	this.get('name', function(value) {
	// 		console.log('retrieved item:'); 
	// 		console.log(value); 


	// 	}); 
	// });

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

