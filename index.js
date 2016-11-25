var udev = require("udev");
var fs   = require('fs');
var path = require('path');
var gpio = require('./lib/gpio');

require('shelljs/global');

//console.log(udev.list()); // this is a long list :)
var cdr = __dirname;

var led = new gpio.Led(4);

var button = new gpio.Button(26, {activeLow: false});
button.onClick(function(state){
	console.log('Button pressed');
});

var deviceTrack = function(action, device) {
	//console.log(action + ' device:', device);
	if(device.ID_MODEL && device.ID_MODEL.match(/stlink/gi)) {
		console.log('Seems STM');
	//	console.log(device);
		if(action === 'add') {
			deviceAdd(device);
		}
	}
}
var globalUsbDev = [];
//Setting button click event
button.onClick(function(state){
	//Toggling USB device
	console.log('Toggling usb');
	exec('echo 1-1 > /sys/bus/usb/drivers/usb/unbind && echo 1-1 > /sys/bus/usb/drivers/usb/bind');
});

var isSTM32 = function() {
	console.log('CHecking STM version');

	return exec("openocd -f "+cdr+"/openocd/stm32_linked.cfg -c \"discovery_32 \"").code === 0 ? true : false;
}

var getBin = function(pattern, path) {
	if(!path) {
		path = '/media/usb0';
	}

	var files = fs.readdirSync(path);
    for (var i in files) {
		if(!files[i].match(pattern)) {
			continue;
		}

        var name = dir + '/' + files[i];
        
		if (!fs.statSync(name).isDirectory()){
            return name;
        }
    }
	
	return null;
}
var getFlashFile = function(version) {
	var re = new RegExp(".*_"+version+".bin$","gi");
	try {
		return getBin(re);	
	}catch(e) {
		console.log('Cannot find firmware file');
		console.log(e);

		return null;	
	}
}

var deviceAdd = function(device) {
	console.log(device);
	try {
		var snr = fs.readFileSync(device.syspath + '/serial').toString();
		//var usbDev = path.basename(path.dirname(device.syspath));
		//if(globalUsbDev.indexOf(usbDev) === -1) {
		//	globalUsbDev.push(usbDev);
		//}	

		var serialNumber = '';
		for(var i=0; i<snr.length-1; i++) {
			serialNumber = serialNumber + '\\x' + snr.charCodeAt(i).toString(16).toUpperCase();
		}

		console.log('STLink serial: ', serialNumber)
		
		console.log('Checking STM32 device');

		if(!isSTM32()) {
			console.log('Seems STM8 - not yet supported');
			return null;
		}
		
		console.log('Getting firmware file');

		var flashFile = getFlashFile('32');
		
		if(!flashFile) {
			return null;
		}	

		led.set(1);

		var ocd = exec("openocd -f "+cdr+"/openocd/stm32_linked.cfg -c \"flash_image "+flashFile+"\"");

		if(ocd.code !== 0) {
			led.blink(4, 1000);
			console.log('Failed to flash STM ');
			console.log(ocd);
		}else{
			led.blink(8, 250);
			console.log('Successfully wrote: ', flashFile);
		}
	    	

	}catch(e){
		console.log(e);
	}

}
var monitor = udev.monitor();


monitor.on('add', function (device) {
   	deviceTrack('add', device); 
	//monitor.close() // this closes the monitor.
});
//monitor.on('remove', function (device) {
//    deviceTrack('remove ', device);
//});
