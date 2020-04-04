
//var noble = require('noble-mac');
var noble = require('noble'); //load the BLE noble module c.f. https://github.com/noble/noble

var peripheralOfInterest = 'YOURDEVICENAME';//change the value to match uuid of peripheral of interest e.g. IEEELimerick
var peripheralOfInterestUUID = 'YOURUUID;
var serviceOfInterestUuids = ['1eee']; //change this value to match the service of interest

// allow duplicate peripheral to be returned (default false) on discovery event
var allowDuplicates = false; 
var characteristicOfInterest = ['2019'];
var notifChars = ['2019'];	// Array of UUID's
var charDescForNotify = "button press"; 

//MQTT variables
var mqtt    = require('mqtt');
var topicToSubscribeTo="iot_topic/LED"
var topicToPublishTo="iot_topic/accel"
var mqttClient  = mqtt.connect('mqtt://broker.mqttdashboard.com');


//global variable - shared between functions
var peripheralGlobal;
var actuatorData;

console.log("Starting MQTT Client");

mqttClient.on('connect', mqttConnectCallback); //when a 'connect' event is received call the connectCallback listener function

noble.on('stateChange', stateChangeEventHandler); //when a stateChange event occurs call the event handler callback function, discoverDeviceEventHandler

function stateChangeEventHandler(state) { //event handler callback function
  if (state === 'poweredOn') {
    console.log("starting scanning for devices with service uuid : " + serviceOfInterestUuids);  
    //noble.startScanning();
	noble.startScanning(serviceOfInterestUuids, allowDuplicates); //scan for devices containing the service of interest
  } else {
    console.log("stopping scanning");  
    noble.stopScanning();
	process.exit(0);
  }
}

noble.on('discover', discoverDeviceEventHandler); //when a discover event occurs call the event handler callback function, discoverDeviceEventHandler
console.log("up and running");

function discoverDeviceEventHandler(peripheral) { //event handler callback function 
	/* This commented code with some versions of BLE but not all!!!
	var localName = peripheral.advertisement.localName;
	if (localName == null) {//the code assumes that the local name of the peripheral has been set
		return;
	}
	if (localName == peripheralOfInterest) {
	if (localName.indexOf(peripheralOfInterest) > -1){ 
	*/
	if (peripheral.uuid==peripheralOfInterestUUID) {
		console.log('Found device with local name: ' + peripheral.advertisement.localName);
		console.log("peripheral uuid : " + peripheral.uuid);
        peripheralGlobal = peripheral;  //set the peripheralGlobal variable equal to the callback peripheral parameter value
        noble.stopScanning();
		peripheral.connect(connectCallback); //call the connect function and when it returns the callback function connectCallback will be executed
	}; //end if 
}

function connectCallback(error) { //this will be executed when the connect request returns
	if (error) {
		console.log("error connecting to peripheral");
	} else {		
		console.log('connected to peripheral: ' + peripheralGlobal.uuid  + "   " + peripheralGlobal.advertisement.localName);
		peripheralGlobal.discoverServices([], discoverServicesCallback); //call the discoverServices function and when it returns the callback function discoverServicesCallback will be executed
	}
}

function discoverServicesCallback(error, services) { //this will be executed when the discoverServices request returns
	if (error) {
		console.log("error discovering services");
	} else {
		console.log("The device contains the following services:");			
		for (var i in services) {
			console.log('  service uuid: ' + services[i].uuid);
		}
		
		for (var i in services) {
			if (serviceOfInterestUuids.includes(services[i].uuid)) {
				console.log("Discovering characteristics of service " + services[i].uuid )
				services[i].discoverCharacteristics(null, discoverCharsCallback);
			}
		}
  
        //pick one service to interrogate
		//var deviceInformationService = services[serviceOfInterest];
		//deviceInformationService.discoverCharacteristics(null, discoverCharsCallback); //call the discoverCharacteristics function and when it returns the callback function discoverCharsCallback will be executed
	}
}

function discoverCharsCallback(error, characteristics) { //this will be executed when the discoverCharacteristics request returns
	if (error) {
		console.log("error discovering characteristics");
	} else {
		for (var i in characteristics) {
			console.log('  characteristic uuid: ' + characteristics[i].uuid);
			var UUID = characteristics[i].uuid;	// Create a local varibale to store the UUID 
		
			if(notifChars.includes(UUID)){	// If the UUID is in the array of notification characteristics:
				console.log('Setting notify for ' + charDescForNotify + " characteristic with uuid : "+ UUID);
				characteristics[i].subscribe(bleSubscribeCallback);	// Enable Notifications & Indications on that characteristic.
				characteristics[i].on('data', dataCallback);	// Register a callback for the data event
			} else{
				console.log('Reading uuid: ' + UUID);	
				characteristics[i].read(readDataCallback);	// Read the characteristic
			}
		}

        //actuatorData.write(new Buffer([1]), false, writeDataCallback); //call the write function and when it returns the callback function writeDataCallback will be executed
	} //end if loop
}

/* Callback for characteristics[i].subscribe */
function bleSubscribeCallback(error){
	if(error){
		console.log('Error Subscribing');
	} else{	
		console.log('Notifications Enabled');
	}
}

/* Callback for BLE data event */
function dataCallback(data, isNotification){

	var UUID = this.uuid;	// Get the UUID of the notifying characteristic. 

	console.log('------------------------------------------');
	console.log('BLE Notification for characteristic with uuid: ' +UUID);
	console.log('characteristic data value is ' + data.toString('hex'));
	console.log('------------------------------------------');
	
	mqttPublishToTopic(data.toString('hex'));
}

function readDataCallback(error, data) { //this will be executed when the read request returns
	if (error) {
		console.log("error reading data");
	} else {	
		console.log("characteristic value is : " + data.toString('hex'));
		//peripheralGlobal.disconnect(disconnectCallback);
	}
}

function mqttConnectCallback() {
  console.log("connected to MQTT broker");
}

function mqttPublishToTopic(data){
	
	//Publish to the IOT_Eoin topic
	mqttClient.publish(topicToPublishTo, 'Button State: ' + data, mqttPublishCallback);
}


function mqttPublishCallback(error) {     
   	if (error) {
		console.log("error publishing data");
	} else {	 
        console.log("Message is published to topic '" + topicToPublishTo + "'");
    }
}

function disconnectCallback(error){ //this will be executed when the disconnect request returns
	if (error) {
		console.log("error disconnecting");
	} else {
		console.log("Disconnecting and stopping scanning");
		noble.startScanning(serviceOfInterestUuids, allowDuplicates); //restart scanning for devices with the services of interest
		console.log("Re-started scanning");
	}
}









		


