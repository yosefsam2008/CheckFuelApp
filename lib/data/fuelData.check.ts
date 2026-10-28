// Self-check for the official CO2 to real-world km/L conversion.
// Run: npx ts-node --transpile-only -O "{\"module\":\"commonjs\",\"moduleResolution\":\"node\",\"customConditions\":null}" lib/data/fuelData.check.ts
/* eslint-disable @typescript-eslint/no-require-imports */
import assert from 'node:assert/strict';

require.cache[require.resolve('@react-native-async-storage/async-storage')] = { exports: { default: {} } } as NodeModule;
(global as any).__DEV__ = false;
const { co2ToRealKmL, calculateICEConsumptionEnhanced, pickWLTPRecords } = require('./fuelData') as typeof import('./fuelData');

// Toyota degem_cd 187 2020 holds both the Prado and the RAV4 Hybrid
const rows = [{ degem_nm: 'GDJ150L-GKTEYW', CO2_WLTP: 257 }, { degem_nm: 'AXAL52L-ANXMBW', CO2_WLTP: 129 }];
assert.equal(pickWLTPRecords(rows, 'axal52l-anxmbw ')[0].CO2_WLTP, 129);
assert.equal(pickWLTPRecords(rows, undefined)[0].CO2_WLTP, 257);

// figures from the gov WLTP dataset; expected values are typical everyday consumption
assert.equal(co2ToRealKmL(101, undefined, false), 20.5); // Corolla 1.8 hybrid 2021
assert.equal(co2ToRealKmL(161, undefined, false), 12.9); // Tucson 1.6T 2022
assert.equal(co2ToRealKmL(254, undefined, true), 9);     // Hilux 2.4 diesel 2021
assert.equal(co2ToRealKmL(undefined, 124, false), 14.2); // NEDC-only record gets the bigger gap
assert.equal(co2ToRealKmL(undefined, undefined, false), null);
assert.equal(co2ToRealKmL(30, undefined, false), null);  // implausible (PHEV-like) figure is rejected

// physics fallback: a family diesel must no longer sit on the 25 km/L cap
const golfTdi = calculateICEConsumptionEnhanced({ mishkal_kolel: 1750, engineCC: 1598, year: 2019, fuelType: 'Diesel', vehicleType: 'car', brand: 'VOLKSWAGEN', model: 'GOLF' });
assert.ok(golfTdi > 16 && golfTdi < 23, `Golf TDI ${golfTdi}`);

console.log('fuelData checks passed');
