window.onload = function() {
    document.addEventListener("deviceready", init, false);
}

storage = Lawnchair({name: 'walk-information', adapter: 'dom'}, function(e) {
	console.log('storage initialized'); 
})

storage.keys('keys.forEach(console.log)'); 


function init() { //run everything in here only when device is ready

	var requestUri = 'http://api-walks.emiliedannenberg.co.uk/list-walks'; 

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

	    promisedWalkDirections().then(promisedLandmarkDescriptions).then(function(walkData) {
	    	// document.querySelector('.walk-page').style.display = 'block'; 
     		var initializedMap = generateMap(walkData); //return map to update marker on it
     		startTracking(walkData, initializedMap); 

     		document.querySelector('.recenter').style.display = "block"; 
	    }); 
  	});   	
}

var promisedWalkDirections = function() {
	var promise = new Promise(getWalkDirections);
	return promise; 
};

var promisedLandmarkDescriptions = function(walkDirections) {
	var promise = new Promise(function(resolve, reject) {
		var select=document.querySelector(".choose-walk");
    	var selectedValue=select.value; 
    	
    	if(selectedValue !== '') {
   			var walkName = select.options[select.selectedIndex].text;
   // 			storage.keys(function(key) {
			// 	this.remove(walkName+'-landmarks'); 
			// })  

   			storage.get(walkName + '-landmarks', function(landmarkDescriptions) {

   				if(landmarkDescriptions) {
   					resolve({walkDirections: walkDirections, landmarkDescriptions: landmarkDescriptions.value.descriptions}); 
   				} else {
   					//make the request to get the descriptions
   					requestUri = 'http://api-walks.emiliedannenberg.co.uk/get-landmarks/'+selectedValue; 
   				
					var xhr = new XMLHttpRequest();
					    
					xhr.open('GET',requestUri, true);
					xhr.send(null);  

					xhr.onreadystatechange = function() {
				    	if (xhr.readyState == XMLHttpRequest.DONE) { 
				    		if(xhr.status===200) {
				        		var descriptions = xhr.responseText;   
				        		//save descriptions  
				        		storage.save({ key : walkName + '-landmarks', 
										value : {	descriptions: descriptions }
									}, function(doc){	
								});
								console.log('landmark descriptions saved locally!'); 
								resolve({walkDirections: walkDirections, landmarkDescriptions: descriptions})
				        	} else {
				        		reject(xhr.status); 
				        	}
				    	}
					}
   				}
   			}); 
   		}
	}); 
	return promise; 
} 

function removeExtAndUnderscore(filename) {

	var removeExt=filename.substring(0,filename.indexOf('.gpx'));
	var removeUnderscore=removeExt.replace(/_/g,' '); 
	return removeUnderscore; 

}
function addWalkHeading(walkname) {
	var h = document.createElement('h2'); 
	var t = document.createTextNode(walkname); 
	h.appendChild(t); 

	var page = document.querySelector('.walk-page'); 
	page.insertBefore(h,document.getElementById('map')); 

	// var img = new Image(); 
	// img.src = './img/man-walking.png';
	// img.className = 'img-man-walking'; 
	
	// var p = document.createElement('p'); 
	// var pt = document.createTextNode('Walking...'); 
	// p.appendChild(pt); 	
	
	// var header = document.querySelector('.header'); 
	// header.appendChild(p); 
	// header.appendChild(img); 
}
function getWalkDirections(resolve, reject) {

    var select=document.querySelector(".choose-walk");
    var selectedValue=select.value; 

   	if(selectedValue !== '') {
   		document.querySelector('.intro-page').style.display='none'; //hide first page
   		document.querySelector('.walk-page').style.display = 'block'; //show walk page
   		
   		var walkName = select.options[select.selectedIndex].text; 

   		addWalkHeading(walkName); 
   // 			storage.keys(function(key) {
			// 	this.remove(walkName); 
			// })  
				var walkPage = document.querySelector('.walk-page');
   		storage.get(walkName, function(walkDirections) {
   			if(walkDirections) {
   				walkPage.append('there is local storage'); 
   				resolve(walkDirections); 
   			} else {
			    requestUri = 'http://api-walks.emiliedannenberg.co.uk/get-directions/'+selectedValue; 
			    walkPage.append('made a new request'); 
				var xhr = new XMLHttpRequest();
				    
				xhr.open('GET',requestUri, true);
				xhr.send(null);  

				xhr.onreadystatechange = function() {
			    	if (xhr.readyState == XMLHttpRequest.DONE) { 
			    		if(xhr.status===200) {
			        		var directions = xhr.responseText;   
			        		saveWalk(resolve, directions);  
			        	} else {
			        		reject(xhr.status); 
			        	}
			    	}
				}
			}
		}); 
	}
}
function saveWalk(resolve, directions) {
	
	directions = JSON.parse(directions);
	var turnByTurn = directions['turn-by-turn']; 
	var waypointsOnly = directions['waypoint-coordinates'];  

	turnByTurn = JSON.parse(turnByTurn); 
	var route = turnByTurn.routes[0]; 
	var legs = route.legs; //a leg is a route between two waypoints 	

	var select = document.querySelector(".choose-walk");  
	var walkName = select.options[select.selectedIndex].text; 

	//walk start and end coordinates
	var startCoordinate = turnByTurn.waypoints[0].location.join(); 
	var endCoordinate = turnByTurn.waypoints[turnByTurn.waypoints.length-1].location.join(); 

	var legs = turnByTurn.routes[0].legs; 

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
			// legs[i].steps[index].bearing = legs[i].steps[index].geometry; 	
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
				   		legs : legs,
				   		waypoints : waypointsOnly
				   }
				}); 	
  }

function error(status) {
	console.log('failed with status code' + status); 
}

function generateMap(walkData) {

	coordinateInfo = walkData.walkDirections; 
	startCoordinateString = coordinateInfo.value.beginning; 
	startCoordinateArray = startCoordinateString.split(','); //get it into its proper format

	var mapKey = walkData.walkDirections.key + '-map';
	var map; 
	storage.get(mapKey, function(savedMap) {
		if(!savedMap) {
			mapboxgl.accessToken = 'pk.eyJ1IjoiZW1pbGllZGFubmVuYmVyZyIsImEiOiJjaXhmOTB6ZnowMDAwMnVzaDVkcnpsY2M1In0.33yDwUq670jHD8flKjzqxg';
			map = new mapboxgl.Map({
			    container: 'map',
			    style: 'mapbox://styles/mapbox/streets-v9',
			    center: startCoordinateArray,
			    zoom: 15
			});
			 
			storage.save({ key : mapKey, 
						   value : map
						}, function(doc){	
				console.log('map saved locally'); 
			});
		} 
		else {
			map = savedMap; 
		}
	}); 
	document.querySelector('.loading-icon').style.display = "none";

	//get all step intersection coordinates to plot route. more intersection coordinates means more accurate route plotting
	var routeLegs = coordinateInfo.value.legs; 
	var routeCoordinates = []; 

	var waypointCoordinates = []; 

	for(var i=0;i<routeLegs.length;i++) {
		
		var legSteps = routeLegs[i].steps; 
		for(var index=0; index< legSteps.length; index++) {

			if(index === legSteps.length -1 && legSteps[index].type === 'arrive' && i !== routeLegs.length -1) { 
				waypointCoordinates.push(legSteps[index].location); 
			}
			var stepIntersections = legSteps[index].intersections; 
			for(var inter=0; inter< stepIntersections.length; inter++) {
				var intersectionCoordinate=stepIntersections[inter].location; 
				routeCoordinates.push(intersectionCoordinate); 
			}
		}
	}

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
	            "line-color": "#d66",
	            "line-width": 4
	        }
	    });
	});
	//pass in the landmark descriptions to bind the click events... 
	addWaypointsToMap(waypointCoordinates,map,walkData);  

	return map; 
}

function addWaypointsToMap(waypointCoordinates,map,walkData) {

	waypointCoordinates.forEach(function(coordinates,index) {
	    // create a DOM element for the marker
	    var el = document.createElement('div');
	    el.className = 'waypoint-markers'; 
	    // el.style.width = '10px';
	    // el.style.height = '25px';
	    // el.style.backgroundImage = 'url(img/icon-marker.png)'; 
	    // el.style.backgroundSize = 'contain'; 
	    // el.style.backgroundColor = 'transparent'; 

	    el.addEventListener('click', function(e) {
	    	// var marker = e.target; 
	    	// marker.classList.add('filter');  		
	        var waypointDescription = getWaypointDescription(index,walkData.landmarkDescriptions);    
	       	buildWaypointPage(waypointDescription); 
	       	playAudio(index,walkData.walkDirections); 
	    });

	    // add marker to map
	    new mapboxgl.Marker(el)
	        .setLngLat(coordinates)
	        .addTo(map);
	});
}

function getLandmarkDescriptions(walkName) {

	var requestUri = 'http://api-walks.emiliedannenberg.co.uk/getLandmarkDescriptions/'+ walkName; 

	var xhr = new XMLHttpRequest();
	    
	xhr.open('GET',requestUri, true);
	xhr.send(null);  

	xhr.onreadystatechange = function() {
	    if (xhr.readyState == XMLHttpRequest.DONE) { 
	        var descriptions = xhr.responseText;
	        saveLandmarkDescriptions(descriptions);        
	    }
	}
}

var waypointsReached = {  //object to track whether you've already hit a waypoint
	start: false, 
	end: false,
	waypoint: [],
	steps: []
}
// function imageExists(imageUrl) {
// 	var http = new XMLHttpRequest();

//     http.open('HEAD', imageUrl, false);
//     http.send();

//     return http.status != 404;
// }
function clearWaypointPage() {
	//clear up waypoint page before showing
	var slider = document.querySelector('.slider'); 
	if(slider) { 
		slider.parentNode.removeChild(slider); 
	}
	var audio = document.querySelector('audio'); 
	if(audio) {
		audio.parentNode.removeChild(audio); 
	}
}
function buildWaypointPage(waypointDescription) {
	
	var msg = waypointDescription.description; 
	var textElem = document.querySelector(".waypoint-text");
	document.querySelector(".waypoint-name").innerHTML = waypointDescription.name + '<span>&#8617;</span>'; 
	textElem.innerHTML = '<p>' + msg + '</p>'; 

	clearWaypointPage(); 

	var walkPage = document.querySelector('.walk-page');
	var waypointPage = document.querySelector('.waypoint-page');  
	walkPage.style.display="none"; 
	waypointPage.style.display="block"; 

	document.querySelector(".waypoint-name span").addEventListener("click", function() {
		waypointPage.style.display="none"; 
		walkPage.style.display="block"; 
		document.querySelector('audio').pause(); 
	}); 

	var fileName = waypointDescription.name.toLowerCase().replace(/\s/g,'_').replace(/\'/g,''); 

	numImgs = 0; //reset these vars every time you build a page!!!
	current = 1; 

	for(var i=0; i<2; i++) { //two images
	
		var src = 'http://api-walks.emiliedannenberg.co.uk/landmark_descriptions/images/' + fileName + '_' + (i+1) + '.png';  
				
		if(i === 0) {
			var d = document.createElement('div'); 
			d.className = 'slider'; 
			waypointPage.insertBefore(d,textElem);  	
		}
		var img = new Image(); 
		img.src = src; 
		img.className = 'waypoint-img'; 
		if(i === 0) { 
			img.className += ' showing'; 
		}
		d.appendChild(img);	
		numImgs++; 
	}
}
var numImgs; var current; 
document.querySelector('.waypoint-page').addEventListener('click',function(e) {

	if(e.target && e.target.matches('.waypoint-img')) {
		var currentElem = document.querySelector('.showing'); 
		if(current === numImgs) {
			var next = document.querySelector('.slider').firstChild; 
			current = 1; //back to start
		}
		else {		
			var next = currentElem.nextSibling; 
			current++; 		
		}
		currentElem.classList.remove('showing'); 
		next.className += ' showing'; 
	}
}); 
function playAudio(i,walkDirections) {
	var audioNum = i+1; 
	var audioDirectoryName = walkDirections.key;

	audioDirectoryName = audioDirectoryName.trim().replace(/\s/g,'_'); 

	//play audio 
	var audioElement = document.createElement('audio');  
		audioElement.setAttribute('controls','controls'); 
	  audioElement.setAttribute('src', 'http://api-walks.emiliedannenberg.co.uk/waypoint-audio/' + audioDirectoryName + '/' + 'waypoint_' + audioNum + '.mp3');  
	  audioElement.addEventListener("load", function(){  
	      audioElement.play();  
	  }, true);

	audioElement.play(); 
	document.querySelector('.waypoint-page').appendChild(audioElement);
}
function startTracking(walkData, map) {
	// var time = 0; 
	console.log(walkData); 
	//start tracking
	var watch_id= navigator.geolocation.watchPosition(

        //success
        function(position) {
        	console.log(position); 
        
        	var currentLng = position.coords.longitude; 
        	var currentLat = position.coords.latitude; 

        	updateMarkerPosition(currentLng,currentLat, map);

        	//loop through all steps to see if you're at a significant location
        	var coordinateData;
        	var journeyLegs;  

        	coordinateData = walkData.walkDirections.value; 
        	journeyLegs = coordinateData.legs; 
     
        	for(var i =0; i < journeyLegs.length; i++) {
        		
        		var currentLeg = journeyLegs[i]; 

        		//loop through steps
        		var legSteps = currentLeg.steps; 
        		for(var j =0; j < legSteps.length; j++) {
        			var currentStep = legSteps[j]; 
        			var stepLocation = currentStep.location; 

        			var stepLat; 
        			var stepLng; 

        			stepLat = stepLocation[1]; 
        			stepLng = stepLocation[0]; 
 
        			if(isClose(currentLat, currentLng, stepLat, stepLng) && (currentStep.type==="arrive" || atBeginning(stepLat, stepLng, coordinateData.beginning))) {
        				// var speak = new SpeechSynthesisUtterance();//ur gunna say something!!
        			
        				//if step type is arrive you're at a waypoint, get waypoint info	
        				if(currentStep.type==="arrive" && !atEnd(stepLat, stepLng, coordinateData.end) && waypointsReached.waypoint.indexOf(i) === -1) {
        						 
	        					//get waypoint info. 
	        					console.log('you are at a waypoint');
	        					//get leg, get corresponding waypoint info index
	        					var waypointDescription = getWaypointDescription(i,walkData.landmarkDescriptions);    
	        					buildWaypointPage(waypointDescription); 
	 			 				
	 			 				waypointsReached.waypoint.push(i); 
	        					playAudio(i,walkData.walkDirections); 
	 			 				// navigator.vibrate(2000); 	
        				} 
        				else if(currentStep.type==="arrive" && atEnd(stepLat, stepLng, coordinateData.end) && !waypointsReached.end) { // you're at the end
  
	        					// speak.text = 'walk finished'; 
	        					var msg = 'walk finished'; 

	        					// showMsgDiv.innerHTML += '<p>' + msg + '</p>'; 

	        					waypointsReached.end = true;
	        					waypointsReached.steps.push(i+j);  
	        		
        				}
        				else if(atBeginning(stepLat, stepLng, coordinateData.beginning) && !waypointsReached.start) {
        				 	console.log('at the beginning'); 	    					

        					waypointsReached.start = true; 
        					waypointsReached.steps.push(i+j); 
        				}
        				//now break out of everything
        				j = legSteps.length; 
        				i = journeyLegs.length; 
        			}
        			else { console.log('not close really'); 

        				//empty and close waypoint page 
        				// document.querySelector('.waypoint-page').style.display="none";
        				// document.querySelector('.walk-page').style.display="block"; 	 
        			}
        		}
        	} 
        },
        //error
        function(error) {
                console.log('couldnt get coordinates!!!'); 
        },
        //settings
        { frequency: 5000, enableHighAccuracy: true}

    ); 
}

function getWaypointDescription(legIndex, descriptions) {
	
	var infoIndex = legIndex;

	// var descriptions = descriptions.replace(/(?:\r)/g, '<br />');
	var split = descriptions.split(','); 

	var nameDescription = split[infoIndex].trim(); 
	var name = nameDescription.split(':')[0].trim(); 
	var description = nameDescription.split(':')[1].trim(); 
	
	return {name: name, description:description}; 
}

function atEnd(stepLat, stepLng, walkEndCoordinatesString) {
	
	walkEndCoordinates = walkEndCoordinatesString.split(','); 
	walkEndLat = walkEndCoordinates[1]; 
	walkEndLng = walkEndCoordinates[0]; 

	return (Math.abs(walkEndLat - stepLat) <= 0.0003 && Math.abs(walkEndLng - stepLng) <= 0.0003) ? true: false;  
}

function atBeginning(stepLat, stepLng, walkStartCoordinatesString) {
	
	walkStartCoordinates = walkStartCoordinatesString.split(','); 
	walkStartLat = walkStartCoordinates[1]; 
	walkStartLng = walkStartCoordinates[0]; 

	return (Math.abs(walkStartLat - stepLat) <= 0.0003 && Math.abs(walkStartLng - stepLng) <= 0.0003) ? true: false; 
}

function isClose(currentLat, currentLng, stepLat, stepLng) {
	// console.log(Math.abs(currentLat - stepLat)); 
	// console.log(Math.abs(currentLng - stepLng)); 
	
	//in future probably want to calculate based on trajectory as well. So only counts as close if you are approaching from the right direction... 
	if(Math.abs(currentLat - stepLat) <= 0.0003 && Math.abs(currentLng - stepLng) <= 0.0003) {
		
		return true; 
	}
	return false; 

}	

var firstFlyTo = true; 
var currentMarker; 

var currentLat; 
var currentLong; 
function updateMarkerPosition(long,lat,map) { //add marker to map 
	
	currentLat = lat; 
	currentLong = long; 
	//delete old marker before readding for new position
	if(currentMarker) {
		currentMarker.remove(); 
	}

	currentMarker = new mapboxgl.Marker()
	.setLngLat([long,lat])
	.addTo(map);

	var mapBounds = map.getBounds(); 
	
	var NEBound = mapBounds._ne; 
	var SWBound = mapBounds._sw; 

	//if marker is outside bounds recenter map
	if((long > NEBound.lng || long < SWBound.lng || lat > NEBound.lat || lat < SWBound.lat) || firstFlyTo) {
		map.flyTo({
	        center: [long, lat]
	    });
	    firstFlyTo = false; //want it to fly there first time round ... 
	}

	document.querySelector(".recenter").addEventListener("click", function() {
		map.flyTo({
	        center: [currentLong,currentLat]
	    });
	}); 
}

