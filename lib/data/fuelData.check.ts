// Self-check for the official CO2 to real-world km/L conversion.
// Run: npx ts-node --transpile-only -O "{\"module\":\"commonjs\",\"moduleResolution\":\"node\",\"customConditions\":null}" lib/data/fuelData.check.ts
/* eslint-disable @typescript-eslint/no-require-imports */
import assert from 'node:assert/strict';

require.cache[require.resolve('@react-native-async-storage/async-storage')] = { exports: { default: {} } } as NodeModule;
(global as any).__DEV__ = false;
const { co2ToRealKmL, calculateICEConsumptionEnhanced, pickWLTPRecord, motorcycleKmL, estimateWeightBySegment } = require('./fuelData') as typeof import('./fuelData');

// Toyota degem_cd 187 holds both the Prado and the RAV4 Hybrid, across several years
const rows = [
  { degem_nm: 'GDJ150L-GKTEYW', shnat_yitzur: 2020, CO2_WLTP: 257 },
  { degem_nm: 'AXAL52L-ANXMBW', shnat_yitzur: 2019, CO2_WLTP: 130 },
  { degem_nm: 'AXAL52L-ANXMBW', shnat_yitzur: 2020, CO2_WLTP: 129 },
];
assert.equal(pickWLTPRecord(rows, { degem_nm: 'axal52l-anxmbw ', year: 2020 }).CO2_WLTP, 129);
assert.equal(pickWLTPRecord(rows, { degem_nm: 'AXAL52L-ANXMBW', year: 2018 }).CO2_WLTP, 130);
assert.equal(pickWLTPRecord([], {}), undefined);

// figures from the gov WLTP dataset; expected values are typical everyday consumption
assert.equal(co2ToRealKmL(101, undefined, false, { isHybrid: true }), 21.8); // Corolla 1.8 hybrid 2021: small gap in traffic
assert.equal(co2ToRealKmL(161, undefined, false), 12.9); // Tucson 1.6T 2022
assert.equal(co2ToRealKmL(254, undefined, true), 9);     // Hilux 2.4 diesel 2021
assert.equal(co2ToRealKmL(undefined, 124, false, { year: 2010 }), 15.4); // NEDC gap grows with the year
assert.equal(co2ToRealKmL(undefined, 124, false, { year: 2016 }), 13.5);
assert.equal(co2ToRealKmL(80, undefined, false, { isHybrid: true }), 27.5); // Yaris hybrid is not rejected
assert.equal(co2ToRealKmL(undefined, undefined, false), null);
assert.equal(co2ToRealKmL(30, undefined, false), null);  // implausible (PHEV-like) figure is rejected

// scooters and bikes go by engine size
assert.equal(motorcycleKmL(125), 40);
assert.equal(motorcycleKmL(395), 24.3);
assert.equal(motorcycleKmL(2000), 13);

// unknown car weight follows engine size instead of a flat 1900kg
assert.equal(estimateWeightBySegment('CELERIO', 'SUZUKI', false, 998), 1449);
assert.equal(estimateWeightBySegment('CELERIO', 'SUZUKI', false), 1700);

// physics fallback: a family diesel must no longer sit on the 25 km/L cap
const golfTdi = calculateICEConsumptionEnhanced({ mishkal_kolel: 1750, engineCC: 1598, year: 2019, fuelType: 'Diesel', vehicleType: 'car', brand: 'VOLKSWAGEN', model: 'GOLF' });
assert.ok(golfTdi > 16 && golfTdi < 23, `Golf TDI ${golfTdi}`);

console.log('fuelData checks passed');
