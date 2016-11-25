var GPIO = require('onoff').Gpio;

var Button = function(gpio, opts) {
	this._gpio = gpio;
	this._button = new GPIO(gpio, 'in', 'rising', opts);
	this._lastState = 1;
	this._watchList = [];

	this._watchCB = function(state) {
		for(var i=0; i<this._watchList.length; i++) {
			this._watchList[i](state);	
		}
	};

	this.onClick = function(cb) {
		var _this = this;
		this._watchList.push(cb);

		//First run, cb list have only one CB
		if(this._watchList.length <= 1) {

			this._button.watch(function(err, state) {
		    	if(_this._lastState === 1 && state === 0) {
					_this._watchCB(state);
				}
		    	_this._lastState = state;
			});
		}

	};	
};

var Led = function(gpio) {
	this._gpio = gpio;
	this._led = new GPIO(gpio, 'low');
	this._status = 0;

	this.set = function(s) {
		s = (s) ? 1 : 0;
		this._led.writeSync(this._status = s);	

		return this;
	};
	this.toggle = function() {
		return this.set(!this._status);
	};

	this.blink = function(num, sleep) {
		if(!sleep) {
			sleep = 1000;
		}
		if(!num) { 
			num = 4;
		}

		var _this = this;;
		
		num = num*2;

		var iv = setInterval(function(){
			if(num-- > 0) {
				_this.toggle();
			}else{
				_this.set(0);
				clearInterval(iv);
			}
		}, sleep);	

	};

};

module.exports = {
	Led: Led,
	Button: Button
}
