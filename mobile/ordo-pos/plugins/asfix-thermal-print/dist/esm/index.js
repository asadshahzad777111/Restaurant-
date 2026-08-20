import { registerPlugin } from '@capacitor/core';
const AsfixThermalPrint = registerPlugin('AsfixThermalPrint', {
    web: () => import('./web').then((m) => new m.AsfixThermalPrintWeb()),
});
export * from './definitions';
export { AsfixThermalPrint };
//# sourceMappingURL=index.js.map