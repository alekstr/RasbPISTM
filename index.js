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
		console.log(device);
		if(action === 'add') {
			deviceAdd(device);
		}
	}
}
var globalUsbDev = [];
//Setting button click event
button.onClick(function(state){
	for(var i=0; i<globalUsbDev.length; i++) {
		//Toggling USB device
		console.log('Toggling usb: ', globalUsbDev[i]);
		exec('echo '+globalUsbDev[i]+' > /sys/bus/usb/drivers/usb/unbind && echo '+globalUsbDev[i]+' > /sys/bus/usb/drivers/usb/bind');
	}
});

var deviceAdd = function(device) {
	console.log(device);
	try {
		var snr = fs.readFileSync(device.syspath + '/serial').toString();
		var usbDev = path.basename(path.dirname(device.syspath));
		if(globalUsbDev.indexOf(usbDev) === -1) {
			globalUsbDev.push(usbDev);
		}	

		var serialNumber = '';
		for(var i=0; i<snr.length-1; i++) {
			serialNumber = serialNumber + '\\x' + snr.charCodeAt(i).toString(16).toUpperCase();
		}

		console.log('STLink serial: ', serialNumber)
		
		var flashFile = cdr+"/tmp/maple_mini_boot20.bin";
		
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
