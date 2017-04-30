window.onload = function() {
    document.addEventListener("deviceready", init, false);
}

storage = Lawnchair({name: 'walk-information'}, function(e) {
	console.log('storage initialized'); 
})

storage.keys(function(key) {
	this.remove(key); 
}) //for testing

storage.keys('keys.forEach(console.log)'); 

function init() { //run everything in here only when device is ready

	var requestUri = 'http://83.216.89.77/list-walks'; 

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
     	promiseObject.then(function(walkDirections) {
     		// document.querySelector('.walk-page').style.display = 'block'; 
     		var initializedMap = generateMap(walkDirections); //return map to update marker on it
     		startTracking(walkDirections, initializedMap); 
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
			    requestUri = 'http://83.216.89.77/get-directions/'+selectedValue; 

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
			// delete legs[i].steps[index].intersections; 
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

function generateMap(coordinateInfo) {
	startCoordinateString = coordinateInfo.value.beginning; 
	startCoordinateArray = startCoordinateString.split(','); //get it into its proper format

	mapboxgl.accessToken = 'pk.eyJ1IjoiZW1pbGllZGFubmVuYmVyZyIsImEiOiJjaXhmOTB6ZnowMDAwMnVzaDVkcnpsY2M1In0.33yDwUq670jHD8flKjzqxg';
	var map = new mapboxgl.Map({
	    container: 'map',
	    style: 'mapbox://styles/mapbox/streets-v9',
	    center: startCoordinateArray,
	    zoom: 15
	});

	//get all step intersection coordinates to plot route. more intersection coordinates means more accurate route plotting
	var routeLegs = coordinateInfo.value.legs; 
	var routeCoordinates = []; 

	for(var i=0;i<routeLegs.length;i++) {
		
		var legSteps = routeLegs[i].steps; 
		for(var index=0; index< legSteps.length; index++) {
			var stepIntersections = legSteps[index].intersections; 
			for(var inter=0; inter< stepIntersections.length; inter++) {
				var intersectionCoordinate=stepIntersections[inter].location; 
				routeCoordinates.push(intersectionCoordinate); 
			}
		}
	}
	console.log(routeCoordinates); 

	map.on('load', function () {

	    map.addLayer({
	        "id": "route",
	        "type": "line",
	        "source": {
	            "type": "geojson",
	            "data": {
	                "type": "Feature",
	                "properties": {},
	                "geometry": {
	                    "type": "LineString",
	                    "coordinates": routeCoordinates
	                }
	            }
	        },
	        "layout": {
	            "line-join": "round",
	            "line-cap": "round"
	        },
	        "paint": {
	            "line-color": "#888",
	            "line-width": 8
	        }
	    });
	});
	return map; 
}

function startTracking(walkDirections, map) {
	// var time = 0; 
	console.log(walkDirections); 
	//start tracking
	var watch_id= navigator.geolocation.watchPosition(

        //success
        function(position) {
        	console.log(position); 
        	var currentLng = position.coords.longitude; 
        	var currentLat = position.coords.latitude; 

        	updateMarkerPosition(currentLng,currentLat, map); 
            // //check against route directions
            // var lat = position.coords.latitude; 
            // var long = position.coords.longitude; 
           	// //log coordinates. not more frequently than 30 seconds
            // var currentTime= Date.now(); 
            // if(time===0) {
            //     time = currentTime; 
            //     document.getElementById('log-coordinates').innerHTML += "<p class='log'>Current latitude is "+lat+" and current longitude is "+long+"</p>"; 
            // } else {
            //     if(currentTime-time > 30000) { //30 seconds
            //         time=currentTime; 
            //         document.getElementById('log-coordinates').innerHTML += "<p class='log'>Current latitude is "+lat+" and current longitude is "+long+"</p>"; 
            //     }
            // }
           	// // console.log(coordinatesData); 
            // //round numbers to 5 decimals 
            // lat = lat.toFixed(4); 
            // long = long.toFixed(4); 
            // //log instructions
            // var instructionData = nearInstructionCoordinate(lat,long, coordinatesData); 
            // if(instructionData !== false) {
            //     document.getElementById('log-instructions').innerHTML += "<div class='instruction'>"+instructionData.instruction+"</div>"; 
            // }
           // var waypoint = isClose(lat,long); //returns false if not close to anywhere, or waypoint number its closest to if close to a waypoint.
           // if(waypoint !== false) {
           //  //play corresponding audio 
           //      audio_elem = 'waypoint_'+waypoint; 
           //      playAudio(audio_elem);  
           // } 
           //  // if(waypoint) {
           //  route_data.push(position); 
        },
        //error
        function(error) {
                console.log('couldnt get coordinates!!!'); 
        },
        //settings
        { frequency: 5000, enableHighAccuracy: true}

    ); 
}
var currentMarker; 
function updateMarkerPosition(long,lat,map) { //add marker to map 
	//delete old marker before readding for new position
	if(currentMarker) {
		currentMarker.remove(); 
	}
	currentMarker = new mapboxgl.Marker()
	.setLngLat([long,lat])
	.addTo(map);

	map.flyTo({
        center: [long, lat]
    });


     TTS
        .speak('hello, world!', function () {
            alert('success');
        }, function (reason) {
            alert(reason);
        });
}

