import { WebPlugin } from '@capacitor/core';
import type { AsfixThermalPrintPlugin, ConnectOptions, ConnectResult, ListPrintersResult, PrintEscPosOptions, PrintTextOptions, StatusResult } from './definitions';
/** Browser stub — real print only runs inside the Android Capacitor shell. */
export declare class AsfixThermalPrintWeb extends WebPlugin implements AsfixThermalPrintPlugin {
    listPrinters(): Promise<ListPrintersResult>;
    connect(_options: ConnectOptions): Promise<ConnectResult>;
    disconnect(): Promise<void>;
    printText(_options: PrintTextOptions): Promise<{
        ok: boolean;
    }>;
    printEscPos(_options: PrintEscPosOptions): Promise<{
        ok: boolean;
    }>;
    getStatus(): Promise<StatusResult>;
    requestPermissions(): Promise<{
        granted: boolean;
    }>;
}
//# sourceMappingURL=web.d.ts.map