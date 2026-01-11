/**
 * EV Data Migration Utility
 *
 * Converts existing electric vehicle consumption data from the old format (km/%)
 * to the new industry-standard format (kWh/km).
 *
 * OLD FORMAT: avgConsumption stored as km/% (kilometers per 1% battery)
 * NEW FORMAT: avgConsumption stored as kWh/km (kilowatt-hours per kilometer)
 *
 * CONVERSION FORMULA:
 * kWh/km = batteryCapacity / (km_per_percent × 100)
 *
 * Example:
 * - Old value: 5.2 km/%
 * - Battery: 50 kWh (assumed default if not available)
 * - New value: 50 / (5.2 × 100) = 0.096 kWh/km
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vehicle } from '../data/vehiclesData';
import { TripRecord } from '../../types/trip';

// Default battery capacity for EVs when not available (in kWh)
// This is a reasonable mid-range value for most modern electric vehicles
const DEFAULT_BATTERY_CAPACITY_KWH = 50;

/**
 * Detects if a vehicle's avgConsumption is in the old km/% format
 *
 * Old format typically has values between 3-10 (km per 1% battery)
 * New format has values between 0.08-0.4 (kWh per km)
 *
 * @param avgConsumption - The consumption value to check
 * @param fuelType - The fuel type of the vehicle
 * @returns true if the value appears to be in old format
 */
function isOldFormat(avgConsumption: number, fuelType?: string): boolean {
  // Only apply to electric vehicles
  if (fuelType !== 'Electric') {
    return false;
  }

  // Old format: typical range is 3-10 km/%
  // New format: typical range is 0.08-0.4 kWh/km
  // If value is > 1, it's very likely the old format
  return avgConsumption > 1;
}

/**
 * Converts km/% to kWh/km
 *
 * @param kmPerPercent - Kilometers per 1% battery (old format)
 * @param batteryCapacityKwh - Battery capacity in kWh (defaults to 50 kWh)
 * @returns Energy consumption in kWh/km (new format)
 */
function convertKmPerPercentToKwhPerKm(
  kmPerPercent: number,
  batteryCapacityKwh: number = DEFAULT_BATTERY_CAPACITY_KWH
): number {
  // Formula: kWh/km = batteryCapacity / (km_per_percent × 100)
  const kwhPerKm = batteryCapacityKwh / (kmPerPercent * 100);

  // Clamp to reasonable range (0.08-0.4 kWh/km)
  // 0.08 = very efficient EV (like Tesla Model 3)
  // 0.4 = inefficient/old EV or heavy vehicle
  return Math.max(0.08, Math.min(0.4, kwhPerKm));
}

/**
 * Migrates a single vehicle's consumption data from km/% to kWh/km
 *
 * @param vehicle - The vehicle to migrate
 * @returns Migrated vehicle with updated avgConsumption
 */
export function migrateVehicle(vehicle: Vehicle): Vehicle {
  // Only migrate electric vehicles with avgConsumption data
  if (vehicle.fueltype !== 'Electric' || !vehicle.avgConsumption) {
    return vehicle;
  }

  // Check if already in new format
  if (!isOldFormat(vehicle.avgConsumption, vehicle.fueltype)) {
    return vehicle;
  }

  console.log(`[Migration] Converting vehicle ${vehicle.name} (${vehicle.plate})`);
  console.log(`  Old value: ${vehicle.avgConsumption} km/%`);

  // Use vehicle's battery capacity if available, otherwise use default
  const batteryCapacity = vehicle.tankCapacity || DEFAULT_BATTERY_CAPACITY_KWH;

  // Convert to new format
  const newConsumption = convertKmPerPercentToKwhPerKm(
    vehicle.avgConsumption,
    batteryCapacity
  );

  console.log(`  Battery capacity: ${batteryCapacity} kWh`);
  console.log(`  New value: ${newConsumption.toFixed(4)} kWh/km`);

  return {
    ...vehicle,
    avgConsumption: parseFloat(newConsumption.toFixed(4))
  };
}

/**
 * Migrates a single trip record's consumption data from km/% to kWh/km
 *
 * @param trip - The trip record to migrate
 * @param batteryCapacityKwh - Battery capacity in kWh (defaults to 50 kWh)
 * @returns Migrated trip with updated consumption
 */
export function migrateTripRecord(
  trip: TripRecord,
  batteryCapacityKwh: number = DEFAULT_BATTERY_CAPACITY_KWH
): TripRecord {
  // Only migrate electric vehicle trips with consumption data
  if (trip.energyType !== 'electricity' || !trip.consumption) {
    return trip;
  }

  // Check if already in new format
  if (!isOldFormat(trip.consumption, trip.fuelType)) {
    return trip;
  }

  console.log(`[Migration] Converting trip from ${trip.date}`);
  console.log(`  Old consumption: ${trip.consumption} km/%`);

  // Convert to new format
  const newConsumption = convertKmPerPercentToKwhPerKm(
    trip.consumption,
    batteryCapacityKwh
  );

  console.log(`  New consumption: ${newConsumption.toFixed(4)} kWh/km`);

  return {
    ...trip,
    consumption: parseFloat(newConsumption.toFixed(4))
  };
}

/**
 * Migrates all vehicles stored in AsyncStorage
 *
 * @returns Object with migration statistics
 */
export async function migrateAllVehicles(): Promise<{
  total: number;
  migrated: number;
  skipped: number;
}> {
  try {
    const vehiclesJson = await AsyncStorage.getItem('vehicles');
    if (!vehiclesJson) {
      console.log('[Migration] No vehicles found in storage');
      return { total: 0, migrated: 0, skipped: 0 };
    }

    const vehicles: Vehicle[] = JSON.parse(vehiclesJson);
    console.log(`[Migration] Found ${vehicles.length} vehicles`);

    let migratedCount = 0;
    let skippedCount = 0;

    const migratedVehicles = vehicles.map(vehicle => {
      const migrated = migrateVehicle(vehicle);

      if (migrated.avgConsumption !== vehicle.avgConsumption) {
        migratedCount++;
      } else {
        skippedCount++;
      }

      return migrated;
    });

    // Save back to storage
    await AsyncStorage.setItem('vehicles', JSON.stringify(migratedVehicles));

    console.log(`[Migration] Complete: ${migratedCount} migrated, ${skippedCount} skipped`);

    return {
      total: vehicles.length,
      migrated: migratedCount,
      skipped: skippedCount
    };
  } catch (error) {
    console.error('[Migration] Error migrating vehicles:', error);
    throw error;
  }
}

/**
 * Migrates all trip history records stored in AsyncStorage
 *
 * Note: This requires knowing the battery capacity for each trip.
 * Since trips don't store the vehicle's battery capacity, we use
 * the default 50 kWh assumption.
 *
 * @returns Object with migration statistics
 */
export async function migrateAllTrips(): Promise<{
  total: number;
  migrated: number;
  skipped: number;
}> {
  try {
    const tripsJson = await AsyncStorage.getItem('tripHistory');
    if (!tripsJson) {
      console.log('[Migration] No trips found in storage');
      return { total: 0, migrated: 0, skipped: 0 };
    }

    const trips: TripRecord[] = JSON.parse(tripsJson);
    console.log(`[Migration] Found ${trips.length} trips`);

    let migratedCount = 0;
    let skippedCount = 0;

    const migratedTrips = trips.map(trip => {
      const migrated = migrateTripRecord(trip);

      if (migrated.consumption !== trip.consumption) {
        migratedCount++;
      } else {
        skippedCount++;
      }

      return migrated;
    });

    // Save back to storage
    await AsyncStorage.setItem('tripHistory', JSON.stringify(migratedTrips));

    console.log(`[Migration] Complete: ${migratedCount} trips migrated, ${skippedCount} skipped`);

    return {
      total: trips.length,
      migrated: migratedCount,
      skipped: skippedCount
    };
  } catch (error) {
    console.error('[Migration] Error migrating trips:', error);
    throw error;
  }
}

/**
 * Main migration function - migrates both vehicles and trip history
 *
 * Call this once when the app starts to ensure all data is in the new format.
 * It's safe to call multiple times - it will only migrate data that needs it.
 *
 * @returns Combined migration statistics
 */
export async function migrateAllEVData(): Promise<{
  vehicles: { total: number; migrated: number; skipped: number };
  trips: { total: number; migrated: number; skipped: number };
}> {
  console.log('[Migration] Starting EV data migration...');

  const vehicleStats = await migrateAllVehicles();
  const tripStats = await migrateAllTrips();

  console.log('[Migration] All migrations complete');
  console.log(`  Vehicles: ${vehicleStats.migrated}/${vehicleStats.total} migrated`);
  console.log(`  Trips: ${tripStats.migrated}/${tripStats.total} migrated`);

  return {
    vehicles: vehicleStats,
    trips: tripStats
  };
}

/**
 * Checks if migration has been run before
 * Stores a flag in AsyncStorage to prevent unnecessary re-runs
 */
export async function hasMigrationRun(): Promise<boolean> {
  try {
    const flag = await AsyncStorage.getItem('ev_migration_v1_complete');
    return flag === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks migration as complete
 */
export async function markMigrationComplete(): Promise<void> {
  await AsyncStorage.setItem('ev_migration_v1_complete', 'true');
}

/**
 * Auto-migration function that runs once on app start
 *
 * Add this to your app's initialization code (e.g., App.tsx or _layout.tsx):
 *
 * ```typescript
 * import { runAutoMigration } from './lib/utils/evDataMigration';
 *
 * useEffect(() => {
 *   runAutoMigration();
 * }, []);
 * ```
 */
export async function runAutoMigration(): Promise<void> {
  try {
    // Check if migration has already run
    const alreadyRun = await hasMigrationRun();

    if (alreadyRun) {
      console.log('[Migration] Already completed, skipping');
      return;
    }

    console.log('[Migration] Running automatic migration...');

    // Run migration
    const stats = await migrateAllEVData();

    // Mark as complete
    await markMigrationComplete();

    // Log summary
    const totalMigrated = stats.vehicles.migrated + stats.trips.migrated;
    if (totalMigrated > 0) {
      console.log(`[Migration] Successfully migrated ${totalMigrated} records`);
    } else {
      console.log('[Migration] No records needed migration');
    }
  } catch (error) {
    console.error('[Migration] Auto-migration failed:', error);
    // Don't throw - migration failure shouldn't crash the app
  }
}
