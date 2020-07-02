/**
 * @name : Cmbconfig
 * @desc : A class for setting different configuration collections. Start different configuration instances of the scanner
 * NOTE:
 * Config doesn't need to be implemented in this way.
 * This is just one of the possible ways to implement the configuration
 * If you are using Angular the config will be implemented differently
 *
 */
var Cmbconfig = (typeof Cmbconfig === 'function') ? Cmbconfig : function(scanner) {
    if (typeof scanner === 'undefined') {
        console.log('No Scanner object');
        return false;
    }
    //reference to the scanner
    this.scanner = scanner;

    //Adding all the symbols that are available to the MX scanner (some of these can not be enabled for the CAMERA scanner)
    this.Symbols = [
        "SYMBOL.DATAMATRIX", "SYMBOL.QR", "SYMBOL.C128", "SYMBOL.UPC-EAN", "SYMBOL.C11", "SYMBOL.C39", "SYMBOL.C93", "SYMBOL.I2O5", "SYMBOL.CODABAR", "SYMBOL.EAN-UCC", "SYMBOL.PHARMACODE", "SYMBOL.MAXICODE", "SYMBOL.PDF417", "SYMBOL.MICROPDF417", "SYMBOL.DATABAR", "SYMBOL.POSTNET", "SYMBOL.PLANET", "SYMBOL.4STATE-JAP", "SYMBOL.4STATE-AUS", "SYMBOL.4STATE-UPU", "SYMBOL.4STATE-IMB", "SYMBOL.VERICODE", "SYMBOL.RPC", "SYMBOL.MSI", "SYMBOL.AZTECCODE", "SYMBOL.DOTCODE", "SYMBOL.C25", "SYMBOL.C39-CONVERT-TO-C32", "SYMBOL.OCR", "SYMBOL.4STATE-RMC", "SYMBOL.TELEPEN"
    ];
};

Cmbconfig.prototype.defaultSettings = function() {

    //we could use arrow functions to avoid using "me" reference,
    //and a few callback functions are done as arrow functions, but most of them are traditional functions
    var me = this;
    //get a reference to the status element

    this.dom = new DOM_init(this.scanner);
    this.dom.init();

    //For our example let's have a Preview Container positioned on 0,0 (left,top) 100% right and 50% bottom. This only works for the CAMERA Scanner mode
    this.scanner.setPreviewContainerPositionAndSize(0, 0, 100, 50);

    //We can send commands to our READER (MX DEVICE or CAMERA) only after we have a valid connection.
    //This is the place to handle connect/disconnect code
    this.scanner.setConnectionStateDidChangeOfReaderCallback(function(connectionState) {
        //If the Reader connects we can start adding some configuration options to it
        if ((connectionState == me.scanner.CONSTANTS.CONNECTION_STATE_CONNECTED)) {
            //But only if there was a change in the connection sate (we don't want two connect events to fire the same code twice)
            if (me.dom.readerConnected != connectionState) {
                //For better performance enable only symbologies that will be used
                me.scanner.setSymbologyEnabled("SYMBOL.DATAMATRIX", true).then(function(result) {
                    //log the status of the action
                    if (result.status)
                        console.log(result.action + " : SUCCESS");
                    else
                        console.log(result.action + " : FAILED! " + result.err);
                });
                //you can also just enable the symbology without expecting the result
                me.scanner.setSymbologyEnabled("SYMBOL.C128", true);
                me.scanner.setSymbologyEnabled("SYMBOL.UPC-EAN", true);

                // Explicitly disable symbologies we know we don't need
                me.scanner.setSymbologyEnabled("SYMBOL.CODABAR", true);
                me.scanner.setSymbologyEnabled("SYMBOL.C93", true);

                // Below are examples of sending DMCC commands and getting the response
                me.scanner.sendCommand("GET DEVICE.TYPE", function(result) {
                    console.log(JSON.stringify(result));
                });
                me.scanner.sendCommand("GET DEVICE.FIRMWARE-VER");

                // We are going to explicitly turn off image results (although this is the
                // default). The reason is that enabling image results with an MX-1xxx
                // scanner is not recommended unless your application needs the scanned
                // image--otherwise scanning performance can be impacted.
                me.scanner.enableImage(false);
                me.scanner.enableImageGraphics(false);

                // Device specific configuration examples
                if (me.dom.deviceType == 1) {
                    // Phone/tablet/MX-100
                    // Set the SDK's decoding effort to level 3
                    me.scanner.sendCommand("SET DECODER.EFFORT 3");
                } else {
                    // MX-1xxx
                    // Save our configuration to non-volatile memory (on an MX-1xxx; for the
                    // MX-100/phone, this has no effect). However, if the MX hibernates or is
                    // rebooted, our settings will be retained.
                    me.scanner.sendCommand("CONFIG.SAVE");
                }
            }
        } else if (connectionState == me.scanner.CONSTANTS.CONNECTION_STATE_DISCONNECTED) {
            //if the Reader device isn't connected we will update the label to "Disconnected"
        } else if (connectionState == me.scanner.CONSTANTS.CONNECTION_STATE_CONNECTING) {
            //Perform some action when the DataManSystem object is
            //in the process of establishing a connection to a remote system.
        } else if (connectionState == me.scanner.CONSTANTS.CONNECTION_STATE_DISCONNECTING) {
            //Perform some action when the DataManSystem object is
            //in the process of disconnecting from a remote system.
        }

        //Update the connectionState for the DOM elements
        me.dom.readerConnected = connectionState;
        //render the dom elements
        me.dom.render();
    });

    //check if scanner is available, if it is connect automatically to it. This is used for MX Device only
    this.scanner.setAvailabilityCallback(function(readerAvailability) {
        if (readerAvailability == me.scanner.CONSTANTS.AVAILABILITY_AVAILABLE) {
            me.scanner.connect();
        } else {
            me.scanner.disconnect();
        }
    });

    //set the callback that's called when start/stop scanning is invoked. Mostly for updating DOM elements
    //it will return TRUE in the result if the scanning process is STARTED and false or error message if it's NOT STARTED
    this.scanner.setActiveStartScanningCallback(
        function(result) {
            //set the scannerActive parameter of the dom helper object
            if (result == true)
                me.dom.scannerActive = true;
            else
                me.dom.scannerActive = false;

            me.dom.render();
        }
    );

    /****
     **    After a barcode is found this is the callback function to handle the result
     **              setResultCallback
     **
     ****/
    this.scanner.setResultCallback(function(result) {
        /**
        *   Structure of the result object:
        *	result.readResults - json array. If you use multicode mode here you will find main result(set of all partial results together merged in one readString) and all other partial results
        *	result.subReadResults - json array of all partial results (if single code mode is uset this array will be empty)
        *	result.xml - string representation of complete result from reader device in xml format

        *	result.readResults and result.subReadResults are json arrays that contains items with this structure:
        *   item.readString - string representation of barcode
        *   item.symbologyString - string representation of the barcode symbology detected
        *	item.goodRead - bool that indicate if barcode is successful scanned
        *	item.xml - string representation of partial result in xml format
        *	item.imageGraphics - string that represent svg image from last detected frame
        *	item.image - base64 string that contain image from last detected frame
        *	item.parsedText - string that represent parsed text from the result
        *	item.parsedJSON - string that represent parsed text in json format from the result
        *	item.isGS1 - bool that indicate if barcode is GS1 or not
        */
        if (result && result.readResults && result.readResults.length > 0) {

            result.readResults.forEach(function(item, index) {

                if (item.goodRead == true) {
                    //Perform some action on barcode read
                    //example:
                    document.getElementById('content').insertAdjacentHTML('beforeend', '<div class="result"><span class="symbol">' + item.symbologyString + '</span> : ' + item.readString + '</div>');
                    //we could put all this DOM handling in the dom helper object, but since it's just one line of code let's leave it be
                } else {
                    //Perform some action when no barcode is read or just leave it empty
                    // navigator.notification.alert("Stopped");
                }
            });
        }
    });

    //if you are going to change the cameraMode, you need to do it before loadScanner is called, otherwise there will be no effect
    this.scanner.setCameraMode(0);
    //refer to our wiki for cameraModes

    //if we want to set additional preview options we can do it here
    this.scanner.setPreviewOptions(this.scanner.CONSTANTS.PREVIEW_OPTIONS.HARDWARE_TRIGGER);

    //if you are going to change the previewOverlayMode, you need to do it before loadScanner is called, otherwise it will not work properly
    this.scanner.setPreviewOverlayMode(this.scanner.CONSTANTS.PREVIEW_OVERLAY_MODE.OM_CMB);

    //Another way to register SDK with your license key, you need to do it before loadScanner is called
	//Note that this method will overwrite license added in manifest (if there is any)
    this.scanner.registerSDK("SDK_KEY");

    //load the Reader Device with the chosen Device Type, we will use a mobile device
    this.scanner.loadScanner("DEVICE_TYPE_MOBILE_DEVICE", function(result) {
        //when the scanner loads we can update the pick device label
        me.dom.deviceType = result.type;
        me.dom.render();
        me.scanner.connect();
    });
}

Cmbconfig.prototype.alternativeSettings = function() {
    //if we want to use another set of settings we can put them here...

}

/**
 *  HELPER OBJECT
 *  For all the DOM manipulations we will use this helper Class.
 *  Handles events and change of button actions based on the state of the Connection to the Reader
 *  It's a completely custom code relevant only to the this demo app and it's not related to the
 *  API functions of the Cordova Plugin
 **/

var DOM_init = function(cmb) {
    this.scannerActive = false; //if the scanner is active (when TRIGGER is ON )
    this.readerConnected = 0; //state of the connection, disconnected
    this.deviceType = 1; //camera device

    this.cmbScanner = cmb;
    this.buttons = {};
    this.labels = {};


}
DOM_init.prototype = {
    init: function() {
        this.buttons.startBtn = document.getElementById("scanner-btn");
        this.buttons.connectBtn = document.getElementById("connect-btn");
        this.buttons.pickDevice = document.getElementById('pick-device');
        this.labels.deviceConnection = document.getElementById('device-connection');
        this.labels.sdkVersion = document.getElementById("sdk-version-value");

        this.buttons.startBtn.addEventListener("click", this, false);
        this.buttons.connectBtn.addEventListener("click", this, false);
        this.buttons.pickDevice.addEventListener("click", this, false);
    },
    handleEvent: function(e) {
        var me = this;
        if (e.type == "click") {
            if (e.target == this.buttons.connectBtn) {
                console.log('you are pressing the connectBtn');
                this.connect();
            }
            if (e.target == this.buttons.startBtn) {
                this.scan();
            }
            if (e.target == this.buttons.pickDevice) {

                (function() {
                    navigator.notification.confirm("MX Reader (Cognex hardware as READER) or Camera (uses the smartphone Camera)", function(buttonIndex) {

                        me.cmbScanner.loadScanner(buttonIndex - 1).then(function(result) {
                            if (result.status) {
                                me.deviceType = result.type;
                                me.cmbScanner.connect();
                            }
                            me.render();
                        });

                    }, "Choose", ["MX Reader", "Camera"])
                })()

            }
        }
    },
    render: function() {
        var me = this;
        if (this.scannerActive)
            this.buttons.startBtn.className = "btn stop";
        else
            this.buttons.startBtn.className = "btn start";


        this.labels.deviceConnection.className = "event received";

        if (this.readerConnected == this.cmbScanner.CONSTANTS.CONNECTION_STATE_CONNECTED) {
            this.buttons.connectBtn.className = "btn disconnect";
            this.labels.deviceConnection.innerHTML = "CONNECTED";
            this.labels.deviceConnection.classList.add("connected");
            this.cmbScanner.getSdkVersion().then(function(version) {
                if (version && typeof version === 'string') {
                    me.labels.sdkVersion.innerHTML = version;
                } else {
                    me.labels.sdkVersion.innerHTML = "N/A";
                }
            });
        } else if (this.readerConnected == this.cmbScanner.CONSTANTS.CONNECTION_STATE_CONNECTING) {
            this.labels.deviceConnection.innerHTML = "CONNECTING";
            this.labels.deviceConnection.classList.add("connecting");

        } else if (this.readerConnected == this.cmbScanner.CONSTANTS.CONNECTION_STATE_DISCONNECTING) {
            this.labels.deviceConnection.innerHTML = "DISCONNECTING";
            this.labels.deviceConnection.classList.add("disconnecting");

        } else if (this.readerConnected == this.cmbScanner.CONSTANTS.CONNECTION_STATE_DISCONNECTED) {
            this.buttons.connectBtn.className = "btn connect";
            this.labels.deviceConnection.innerHTML = "DISCONNECTED";
            this.labels.deviceConnection.classList.add("disconnected");
            this.labels.sdkVersion.innerHTML = "";
        }

        if (this.cmbScanner.CONSTANTS.DEVICES_FRIENDLY[this.deviceType]) {
            this.buttons.pickDevice.innerHTML = "Pick Device [" + this.cmbScanner.CONSTANTS.DEVICES_FRIENDLY[this.deviceType] + "]";
        }

    },
    connect: function() {
        if (this.readerConnected) {
            this.cmbScanner.disconnect();
        } else {
            this.cmbScanner.connect();
        }

    },
    scan: function() {
        if (this.scannerActive) {
            this.cmbScanner.stopScanning();
        } else {
            this.cmbScanner.startScanning();
        }
    }
}
