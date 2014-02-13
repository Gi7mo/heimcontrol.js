require(["jquery", "/js/suncalc.js"], function() {
	var map, marker;
	//- $(function() {
	//- 	$('#time-slider-1').slider({
	//- 		min: 0,
	//- 		max: 1440,
	//- 		slide: function(event, ui) {
	//- 			console.log(ui.value);
	//- 			// var hours = Math.floor(ui.value / 60),
	//- 			// 	minutes = ui.value % 60;
	//- 			// date.setHours(hours);
	//- 			// date.setMinutes(minutes);
	//- 			// updateResult(true);
	//- 		}
	//- 	});
	//- 	$('#time-slider-2').slider({
	//- 		min: 0,
	//- 		max: 1440,
	//- 		slide: function(event, ui) {
	//- 			console.log(ui.value);
	//- 			// var hours = Math.floor(ui.value / 60),
	//- 			// 	minutes = ui.value % 60;
	//- 			// date.setHours(hours);
	//- 			// date.setMinutes(minutes);
	//- 			// updateResult(true);
	//- 		}
	//- 	});
	//- });
	var getTimePercent = function(date) {
		return (date.getHours()*60 + date.getMinutes())*100/1440;
	}
	var update = function(position) {
		$('#lat').val(position.lat());
		$('#lng').val(position.lng());
		var times = SunCalc.getTimes(new Date(), position.lat(), position.lng());
		console.log(times);
		var transitAltitude = SunCalc.getPosition(new Date(times.Jnoon), position.lat(), position.lng()).altitude;
		drawTimeInterval($('#time-scale-twilight'), $('#time-scale-twilight-2'), times.dawn, times.dusk, transitAltitude);
		drawTimeInterval($('#time-scale-sunlight'), $('#time-scale-sunlight-2'), times.sunrise, times.sunset, transitAltitude);
	}
	var drawTimeInterval = function(obj1, obj2, date1, date2, transitAltitude) {
		// FUCK IT!!!
		var x1 = getTimePercent(new Date(date1)) - 3.5;
		var x2 = getTimePercent(new Date(date2)) - 2;
		
		if(isNaN(date1) || isNaN(date2)) {
			if(transitAltitude >= 0) {
				obj1.show().css({left: 0, right: 0});
				obj2.hide();
			} else {
				obj1.hide();
				obj2.hide();
			}
		} else if(x1 <= x2) {
			obj1.show().css({
				left: x1 + '%',
				right: (100 - x2) + '%'
			});
			obj2.hide();
		} else {
			obj1.show().css({
				left: x1 + '%',
				right: 0
			});
			obj2.show().css({
				left: 0,
				right: (100 - x2) + '%'
			});
		}
	}
	var searchAddress = function() {
		var address = document.getElementById('address').value;
		geocoder = new google.maps.Geocoder();
		geocoder.geocode( { 'address': address}, function(results, status) {
			if(status == google.maps.GeocoderStatus.OK) {
				if(marker) marker.setMap(null);
				map.setCenter(results[0].geometry.location);
				marker = new google.maps.Marker({
					map: map,
					position: results[0].geometry.location
				});
				update(marker.getPosition());
			} else {
				alert('Geocode was not successful for the following reason: ' + status);
			}
		});
	}
	if(document.getElementById("map-canvas")) {
		map = new google.maps.Map(document.getElementById("map-canvas"), {
			zoom: 8,
			mapTypeControl: false,
			zoomControl: true,
			zoomControlOptions: {
				style: google.maps.ZoomControlStyle.SMALL
			}
		});
		if($('#lat').val() == '' && $('#lng').val() == '') {
			if(navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function (position) {
					var l = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
					map.setCenter(l);
					marker = new google.maps.Marker({
						map: map,
						position: l
					});
					update(marker.getPosition());
				});
			} else {
				var l = new google.maps.LatLng(40.7143528, -74.0059731);
				map.setCenter(l);
				marker = new google.maps.Marker({
					map: map,
					position: l
				});
				update(marker.getPosition());
			}
		} else {
			var l = new google.maps.LatLng($('#lat').val(), $('#lng').val());
			map.setCenter(l);
			marker = new google.maps.Marker({
				map: map,
				position: l
			});
			update(marker.getPosition());
		}
		$('#address').keypress(function(event) {
			if(event.which == 13) {
				event.stopPropagation();
				searchAddress();
			}
		});
	}
});