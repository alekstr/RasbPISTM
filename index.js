var udev = require("udev");
var fs   = require('fs');
var path = require('path');
var gpio = require('./lib/gpio');

require('shelljs/global');

//console.log(udev.list()); // this is a long list :)
var cdr = __dirname;

var statusLed = new gpio.Led(4);
var errorLed = new gpio.Led(18);

var reset = function() {
	console.log('Reset led');
	errorLed.set(0);
	statusLed.set(0);
}

var error = function(msg) {
	statusLed.set(0);
	errorLed.set(1);
	setTimeout(function(){
		errorLed.set(0);
	}, 10000);
	console.log(msg);
};

var working = function() {
	statusLed.set(1);
};

var success = function(msg) {
	errorLed.set(0);
	statusLed.blink(8, 250);
	console.log(msg);
};

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
			 setTimeout(function() {
				console.log('Toggling deviceAdd');	
				deviceAdd(device);
			}, 1000);
		}
	}
}

reset();

statusLed.blink(4, 100);
errorLed.blink(4, 100);

//Setting button click event
button.onClick(function(state){
	//Toggling USB devic
	reset();
	console.log('Toggling usb');
	exec('echo 1-1 > /sys/bus/usb/drivers/usb/unbind && echo 1-1 > /sys/bus/usb/drivers/usb/bind');
});

var isSTM32 = function() {
	console.log('CHecking STM32 version');

	return exec("openocd -f "+cdr+"/openocd/stm32_linked.cfg -c \"discovery_32 \"").code === 0 ? true : false;
};
var isSTM8 = function() {
	console.log('Checking STM8 version');

	return exec("stm8flash -c stlinkv2 -p stm8s103f3 -s opt -r /tmp/test").code === 0 ? true : false;
};
var getSTMVersion = function() {
	console.log('Checking STM version');

	if(isSTM8()) {
		return '8';
	}else if(isSTM32()) {
		return '32';
	}else{
		return null;	
	}
};
var getBin = function(pattern, path) {
	if(!path) {
		path = '/media/usb0';
	}
	console.log('reading files in '+path);
	var files = fs.readdirSync(path);
	console.log(files);
    for (var i in files) {
		if(!files[i].match(pattern)) {
			continue;
		}

        var name = path + '/' + files[i];
        
		if (!fs.statSync(name).isDirectory()){
            return name;
        }
    }
	return null;
}
var getFlashFile = function(version) {
	var re = new RegExp(".*_"+version+".(bin|ihx)$","gi");
	try {
		return getBin(re);	
	}catch(e) {
		console.log('Cannot find firmware file');
		console.log(e);

		return null;	
	}
}

var flash = function(version, fw) {
	if(!fs.existsSync(fw)) {
		throw {
			'message': 'File not found: '+fw,
			'name': 'FileNotFound'
		};	
	}

	var com = {};

	if(version === '32') {
		com = exec("openocd -f "+cdr+"/openocd/stm32_linked.cfg -c \"flash_image "+fw+"\"");
	}else if(version === '8'){
		com = exec("stm8flash -c stlinkv2 -p stm8s103?3 -w "+fw);
	}else{
		throw {
			'message': 'Unsupported version of STM: '+version,
			'name': 'UnsupportedSTMVersion'
		};
	}

	if(com.code !== 0) {
		console.log(com);
		throw {
			'message': 'Failed to flash STM',
			'name': 'STMFlashFailed'
		};
	}else{
		return true;
	}
	
};

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
		
		console.log('Checking device version');
		var version = getSTMVersion();

		if(version === null) {
			error('Cannot detect STM version');
			return null;
		}
		
		console.log('Getting firmware file');

		var flashFile = getFlashFile(version);
		
		if(!flashFile) {
			error('Firmware files not found (usb not attached??)');
			return null;
		}	

		statusLed.set(1);

		if(flash(version, flashFile)) {
			success('Successfully wrote: ' + flashFile);
		}
	    	

	}catch(e){
		error(e);
	}

}
var monitor = udev.monitor();


monitor.on('add', function (device) {
   	deviceTrack('add', device); 
	//monitor.close() // this closes the monitor.
});
process.on('SIGTERM', function () {
	console.log('Got SIGTERM');
	reset();
  	process.exit(0);
});

process.on('SIGINT', function() {
	reset();
	process.exit();
});

//monitor.on('remove', function (device) {
//    deviceTrack('remove ', device);
//});
