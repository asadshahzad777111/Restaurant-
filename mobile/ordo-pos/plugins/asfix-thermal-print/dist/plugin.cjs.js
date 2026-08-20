'use strict';

var core = require('@capacitor/core');

const AsfixThermalPrint = core.registerPlugin('AsfixThermalPrint', {
    web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.AsfixThermalPrintWeb()),
});

/** Browser stub — real print only runs inside the Android Capacitor shell. */
class AsfixThermalPrintWeb extends core.WebPlugin {
    async listPrinters() {
        return { printers: [] };
    }
    async connect(_options) {
        throw this.unavailable('AsfixThermalPrint requires the AsFix POS Android app');
    }
    async disconnect() {
        /* no-op on web */
    }
    async printText(_options) {
        throw this.unavailable('AsfixThermalPrint requires the AsFix POS Android app');
    }
    async printEscPos(_options) {
        throw this.unavailable('AsfixThermalPrint requires the AsFix POS Android app');
    }
    async getStatus() {
        return { connected: false, address: null, bluetoothEnabled: false };
    }
    async requestPermissions() {
        return { granted: false };
    }
}

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    AsfixThermalPrintWeb: AsfixThermalPrintWeb
});

exports.AsfixThermalPrint = AsfixThermalPrint;
//# sourceMappingURL=plugin.cjs.js.map
