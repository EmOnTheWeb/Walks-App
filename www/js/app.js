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
		promiseObject.then(parseDirections, error); 
	}
}
function parseDirections(directions) {
	console.log(directions); 
}
function error(status) {
	console.log('failed with status code' + status); 
}

