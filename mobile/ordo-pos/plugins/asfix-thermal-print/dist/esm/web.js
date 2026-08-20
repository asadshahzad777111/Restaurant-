import { WebPlugin } from '@capacitor/core';
/** Browser stub — real print only runs inside the Android Capacitor shell. */
export class AsfixThermalPrintWeb extends WebPlugin {
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
//# sourceMappingURL=web.js.map