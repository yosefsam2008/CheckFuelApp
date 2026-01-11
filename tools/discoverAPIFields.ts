/**
 * API Field Discovery Tool
 *
 * This tool helps you discover what fields are available in the
 * Israeli government vehicle API (data.gov.il) for a specific license plate.
 *
 * Usage:
 * 1. Run: npx tsx tools/discoverAPIFields.ts <plate-number>
 * 2. Example: npx tsx tools/discoverAPIFields.ts 29696501
 *
 * This will show you:
 * - All available fields in the API response
 * - Which fields contain weight-related data
 * - Whether the weight fields contain valid numbers or VINs
 */

const VEHICLE_APIS = [
  { type: "car", id: "053cea08-09bc-40ec-8f7a-156f0677aff3" },
  { type: "motorcycle", id: "bf9df4e2-d90d-4c0a-a400-19e15af8e95f" },
  { type: "truck", id: "cd3acc5c-03c3-4c89-9c54-d40f93c0d790" },
];

interface APIRecord {
  [key: string]: any;
}

/**
 * Check if a value looks like a VIN (Vehicle Identification Number)
 */
function looksLikeVIN(value: string): boolean {
  // VIN is 17 alphanumeric characters
  if (typeof value !== 'string') return false;
  const str = value.trim();
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(str);
}

/**
 * Check if a value is a valid weight number
 */
function isValidWeight(value: any): boolean {
  if (!value) return false;

  const str = String(value).trim();

  // Reject if contains letters (likely VIN or description)
  if (/[a-zA-Z]/.test(str)) {
    return false;
  }

  // Parse and validate range
  const n = parseFloat(str.replace(',', '.'));
  if (!Number.isFinite(n)) return false;

  // Reasonable vehicle weight range (500-10000 kg)
  return n >= 500 && n <= 10000;
}

/**
 * Fetch vehicle record from API
 */
async function fetchRecordByPlate(plate: string): Promise<{
  record: APIRecord;
  type: string;
} | null> {
  for (const api of VEHICLE_APIS) {
    try {
      const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${
        api.id
      }&filters=${encodeURIComponent(
        JSON.stringify({ mispar_rechev: plate })
      )}`;

      console.log(`\n🔍 Searching ${api.type} API...`);
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`   ❌ HTTP ${response.status}`);
        continue;
      }

      const json = await response.json();
      const records = json?.result?.records;

      if (records && records.length > 0) {
        console.log(`   ✅ Found in ${api.type} API!`);
        return { record: records[0], type: api.type };
      } else {
        console.log(`   ⚠️  No records found`);
      }
    } catch (error) {
      console.log(`   ❌ Error:`, error);
    }
  }

  return null;
}

/**
 * Analyze and display all fields in the record
 */
function analyzeRecord(record: APIRecord, vehicleType: string) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           API FIELD DISCOVERY REPORT                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`Vehicle Type: ${vehicleType.toUpperCase()}\n`);

  // Get all field names
  const allFields = Object.keys(record).sort();

  console.log(`📊 Total Fields: ${allFields.length}\n`);

  // ============================================================================
  // 1. CORE VEHICLE INFO
  // ============================================================================
  console.log('🚗 CORE VEHICLE INFO');
  console.log('═'.repeat(60));

  const coreFields = [
    '_id',
    'mispar_rechev',
    'tozeret_nm',
    'tozeret',
    'degem_nm',
    'kinuy_mishari',
    'shnat_yitzur',
    'sug_delek_nm',
    'sug_delek',
  ];

  coreFields.forEach((field) => {
    if (record[field] !== undefined) {
      console.log(`   ${field.padEnd(20)} = "${record[field]}"`);
    }
  });

  // ============================================================================
  // 2. ENGINE INFORMATION
  // ============================================================================
  console.log('\n\n⚙️  ENGINE INFORMATION');
  console.log('═'.repeat(60));

  const engineFields = allFields.filter(
    (f) =>
      f.includes('nefach') ||
      f.includes('manoa') ||
      f.includes('degem_manoa') ||
      f.includes('engine') ||
      f.includes('cc') ||
      f.toLowerCase().includes('displacement')
  );

  if (engineFields.length === 0) {
    console.log('   ⚠️  No engine fields found');
  } else {
    engineFields.forEach((field) => {
      const value = record[field];
      const parsed = parseFloat(String(value));
      const isCC = Number.isFinite(parsed) && parsed >= 50 && parsed <= 15000;

      console.log(`   ${field.padEnd(25)} = "${value}"`);
      if (isCC) {
        console.log(`   ${''.padEnd(25)} → ✅ Valid CC: ${parsed}cc`);
      }
    });
  }

  // ============================================================================
  // 3. WEIGHT INFORMATION (CRITICAL!)
  // ============================================================================
  console.log('\n\n⚖️  WEIGHT INFORMATION');
  console.log('═'.repeat(60));

  const weightFields = allFields.filter(
    (f) =>
      f.toLowerCase().includes('mishkal') ||
      f.toLowerCase().includes('weight') ||
      f.toLowerCase().includes('misgeret') ||
      f.toLowerCase().includes('mass') ||
      f.toLowerCase().includes('tare') ||
      f.toLowerCase().includes('curb') ||
      f.toLowerCase().includes('gross') ||
      f.toLowerCase().includes('gvwr')
  );

  if (weightFields.length === 0) {
    console.log('   ⚠️  No weight-related fields found');
  } else {
    weightFields.forEach((field) => {
      const value = record[field];
      const str = String(value);
      const parsed = parseFloat(str.replace(',', '.'));
      const isValid = isValidWeight(value);
      const isVIN = looksLikeVIN(str);

      console.log(`\n   Field: ${field}`);
      console.log(`   Value: "${value}"`);
      console.log(`   Type:  ${typeof value}`);

      if (isVIN) {
        console.log(`   ❌ PROBLEM: This looks like a VIN, not weight!`);
      } else if (isValid) {
        console.log(`   ✅ VALID WEIGHT: ${parsed}kg`);
      } else if (Number.isFinite(parsed)) {
        console.log(`   ⚠️  Parsed as ${parsed}kg but outside valid range (500-10000kg)`);
      } else {
        console.log(`   ❌ NOT A NUMBER: Cannot parse as weight`);
      }
    });
  }

  // ============================================================================
  // 4. ALL OTHER FIELDS
  // ============================================================================
  console.log('\n\n📋 ALL FIELDS (COMPLETE LIST)');
  console.log('═'.repeat(60));

  const categorizedFields = new Set([
    ...coreFields,
    ...engineFields,
    ...weightFields,
  ]);

  const otherFields = allFields.filter((f) => !categorizedFields.has(f));

  if (otherFields.length === 0) {
    console.log('   (All fields shown above)');
  } else {
    otherFields.forEach((field) => {
      const value = record[field];
      const shortValue =
        String(value).length > 50
          ? String(value).substring(0, 47) + '...'
          : String(value);
      console.log(`   ${field.padEnd(30)} = "${shortValue}"`);
    });
  }

  // ============================================================================
  // 5. RECOMMENDATIONS
  // ============================================================================
  console.log('\n\n💡 RECOMMENDATIONS');
  console.log('═'.repeat(60));

  const validWeightFields = weightFields.filter((f) => isValidWeight(record[f]));
  const vinInWeightFields = weightFields.filter((f) =>
    looksLikeVIN(String(record[f]))
  );
  const validCCFields = engineFields.filter((f) => {
    const parsed = parseFloat(String(record[f]));
    return Number.isFinite(parsed) && parsed >= 50 && parsed <= 15000;
  });

  if (validWeightFields.length > 0) {
    console.log('\n✅ GOOD NEWS: Valid weight data found!');
    console.log('   Use these fields in parseRelevantFields():');
    validWeightFields.forEach((f) => {
      console.log(`   - ${f}: ${record[f]}kg`);
    });
  } else {
    console.log('\n❌ PROBLEM: No valid weight fields found');
    console.log('   Solutions:');
    console.log('   1. Add this vehicle to manufacturer weight lookup table');
    console.log('   2. Allow user to input weight manually');
    console.log('   3. Use default weight based on vehicle type');
  }

  if (vinInWeightFields.length > 0) {
    console.log('\n⚠️  WARNING: VIN detected in weight fields!');
    console.log('   These fields contain VINs instead of weights:');
    vinInWeightFields.forEach((f) => {
      console.log(`   - ${f}: "${record[f]}"`);
    });
    console.log('\n   ✅ GOOD NEWS: Your parseFloatSafeLocal() function should catch this!');
  }

  if (validCCFields.length > 0) {
    console.log('\n✅ Engine CC found!');
    validCCFields.forEach((f) => {
      console.log(`   - ${f}: ${record[f]}cc`);
    });
  } else {
    console.log('\n⚠️  No valid CC fields found');
    console.log('   Make sure engine code is in engineCCLookup.ts');
  }

  console.log('\n');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Usage: npx tsx tools/discoverAPIFields.ts <plate-number>');
    console.error('   Example: npx tsx tools/discoverAPIFields.ts 29696501');
    process.exit(1);
  }

  const plate = args[0];

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       API FIELD DISCOVERY TOOL v1.0                    ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\nSearching for plate: ${plate}`);

  const result = await fetchRecordByPlate(plate);

  if (!result) {
    console.log('\n❌ Vehicle not found in any API');
    process.exit(1);
  }

  analyzeRecord(result.record, result.type);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { fetchRecordByPlate, analyzeRecord };
