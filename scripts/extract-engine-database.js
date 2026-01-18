/**
 * Engine Database Extraction Script v2
 *
 * Strategy:
 * 1. Fetch all records from ENGINE CC API (has nefach_manoa/CC)
 * 2. Fetch records from WEIGHT API (has kinuy_mishari/clean model names)
 * 3. Cross-reference to build brand → clean_model → CC mapping
 *
 * Usage: node scripts/extract-engine-database.js
 */

const fs = require('fs');
const path = require('path');

// API Configuration
const ENGINE_CC_API_RESOURCE_ID = '03adc637-b6fe-402b-9937-7c3d3afc9140';
const WEIGHT_API_RESOURCE_ID = '851ecab1-0622-4dbe-a6c7-f950cf82abf9';
const DATA_GOV_IL_BASE = 'https://data.gov.il/api/3/action/datastore_search';

// Rate limiting
const DELAY_BETWEEN_REQUESTS = 100; // ms
const BATCH_SIZE = 10000; // Records per batch

// Hebrew to English brand translation (with country suffixes)
const BRAND_MAP = {
  // Japanese brands
  'טויוטה': 'Toyota',
  'טויוטה טורקיה': 'Toyota',
  'טויוטה אוסטריה': 'Toyota',
  'טויוטה אנגליה': 'Toyota',
  'טויוטה ארה"ב': 'Toyota',
  'טויוטה ב מ וו': 'Toyota',
  'טויוטה בלגיה': 'Toyota',
  'טויוטה יפן': 'Toyota',
  'טויוטה מקסיקו': 'Toyota',
  "טויוטה צ'כיה": 'Toyota',
  'טויוטה צרפת': 'Toyota',
  'טויוטה קנדה': 'Toyota',
  'הונדה': 'Honda',
  'הונדה בריטניה': 'Honda',
  'הונדה מקסיקו': 'Honda',
  'הונדה סין': 'Honda',
  'הונדה-ארה"ב': 'Honda',
  'הונדה-יפן': 'Honda',
  'הונדה-קנדה': 'Honda',
  'מאזדה': 'Mazda',
  'מזדה ארה"ב': 'Mazda',
  'מזדה יפן': 'Mazda',
  'מזדה תאילנד': 'Mazda',
  'ניסאן': 'Nissan',
  'ניסאן אנגליה': 'Nissan',
  'ניסאן ארה"ב': 'Nissan',
  'ניסאן הודו': 'Nissan',
  'ניסאן יפן': 'Nissan',
  'ניסאן ספרד': 'Nissan',
  'ניסאן קוריאה': 'Nissan',
  'סובארו': 'Subaru',
  'סובארו ארה"ב': 'Subaru',
  'סובארו יפן': 'Subaru',
  'מיצובישי': 'Mitsubishi',
  'מיצובישי ארה"ב': 'Mitsubishi',
  'מיצובישי יפן': 'Mitsubishi',
  'לקסוס': 'Lexus',
  'לקסוס יפן': 'Lexus',
  'לקסוס קנדה': 'Lexus',
  'אקורה יפן': 'Acura',
  'אינפיניטי': 'Infiniti',
  'סוזוקי': 'Suzuki',
  'סוזוקי הונגריה': 'Suzuki',
  'סוזוקי ספרד': 'Suzuki',
  'סוזוקי קנדה': 'Suzuki',
  'סוזוקי-יפן': 'Suzuki',
  'דייהטסו': 'Daihatsu',
  'איסוזו': 'Isuzu',
  'איסוזו יפן': 'Isuzu',
  'הינו ואנטיק': 'Hino',

  // Korean brands
  'קיא': 'Kia',
  'קיה': 'Kia',
  'קיה ארה"ב': 'Kia',
  'קיה מכסיקו': 'Kia',
  'קיה סלובקיה': 'Kia',
  'קיה קוריאה': 'Kia',
  'יונדאי': 'Hyundai',
  'יונדאי ארה"ב': 'Hyundai',
  "יונדאי צ'כיה": 'Hyundai',
  'יונדאי קוריאה': 'Hyundai',
  "ג'נסיס": 'Genesis',
  'סאנגיונג': 'SsangYong',
  'סאנגיונג ד.קור': 'SsangYong',

  // German brands
  'פולקסווגן': 'Volkswagen',
  'פולקסווגן ארגנ': 'Volkswagen',
  'פולקסווגן ארהב': 'Volkswagen',
  'פולקסווגן בלגי': 'Volkswagen',
  'פולקסווגן גרמנ': 'Volkswagen',
  'פולקסווגן מכסי': 'Volkswagen',
  'פולקסווגן סלוב': 'Volkswagen',
  'פולקסווגן פולי': 'Volkswagen',
  'פולקסווגן פורט': 'Volkswagen',
  'פולקסוגן פורשה': 'Volkswagen',
  'אאודי': 'Audi',
  'אאודי בלגיה': 'Audi',
  'אאודי הונגריה': 'Audi',
  'אאודי סלובקיה': 'Audi',
  'אאודי ספרד': 'Audi',
  'מרצדס': 'Mercedes-Benz',
  'מרצדס בנץ ארהב': 'Mercedes-Benz',
  'מרצדס בנץ גרמנ': 'Mercedes-Benz',
  'מרצדס בנץ ד.אפ': 'Mercedes-Benz',
  'מרצדס בנץ הונג': 'Mercedes-Benz',
  'מרצדס בנץ מקסי': 'Mercedes-Benz',
  'מרצדס בנץ ספרד': 'Mercedes-Benz',
  'מרצדס בנץ פינל': 'Mercedes-Benz',
  'מרצדס-בנץ אוסט': 'Mercedes-Benz',
  'מרצדס-בנץ צרפת': 'Mercedes-Benz',
  'דימלר בנץ גרמנ': 'Mercedes-Benz',
  'דימלרקריזלר-אס': 'Mercedes-Benz',
  'דימלרקריזלר-אר': 'Mercedes-Benz',
  'דימלרקריזלר-גר': 'Mercedes-Benz',
  'דימלרקריזלר-קנ': 'Mercedes-Benz',
  'ב מ וו': 'BMW',
  'ב מ וו אוסטריה': 'BMW',
  'ב מ וו ארה"ב': 'BMW',
  'ב מ וו בריטניה': 'BMW',
  'ב מ וו גרמניה': 'BMW',
  'ב מ וו הולנד': 'BMW',
  'ב.מ.וו': 'BMW',
  'פורשה': 'Porsche',
  'פורשה גרמניה': 'Porsche',
  'פורשה סלובקיה': 'Porsche',
  'מיני': 'Mini',
  'מיני אנגליה': 'Mini',
  'אופל': 'Opel',
  'אופל-גרמניה': 'Opel',

  // European brands
  'סקודה': 'Skoda',
  'סקודה סלובקיה': 'Skoda',
  "סקודה צ'כיה": 'Skoda',
  'סיאט': 'Seat',
  'סיאט גרמניה': 'Seat',
  'סיאט ספרד': 'Seat',
  'רנו': 'Renault',
  'רנו צרפת': 'Renault',
  'רנו רומניה': 'Renault',
  "פיג'ו": 'Peugeot',
  'פיג\'ו סלובקיה': 'Peugeot',
  'פיג\'ו צרפת': 'Peugeot',
  'סיטרואן': 'Citroen',
  'סיטרואן ספרד': 'Citroen',
  'סיטרואן צרפת': 'Citroen',
  'סיטרואן סלובק': 'Citroen',
  'פיאט': 'Fiat',
  'פיאט איטליה': 'Fiat',
  'פיאט פולין': 'Fiat',
  'פיאט צרפת': 'Fiat',
  'אלפא רומיאו': 'Alfa Romeo',
  'אלפא/לנציה': 'Alfa Romeo',
  'יגואר': 'Jaguar',
  'לנדרובר': 'Land Rover',
  'לנדרובר ארה"ב': 'Land Rover',
  'וולבו': 'Volvo',
  'וולבו בלגיה': 'Volvo',
  'וולבו צרפת': 'Volvo',
  'וולבו שוודיה': 'Volvo',
  'מזראטי': 'Maserati',
  'מזארטי איטליה': 'Maserati',
  'למבורגיני': 'Lamborghini',
  'פרארי': 'Ferrari',
  'בנטלי בריטניה': 'Bentley',
  'אסטון מרטין': 'Aston Martin',
  'רולס-רויס': 'Rolls-Royce',
  'לוטוס': 'Lotus',
  'סאאב פינלנד': 'Saab',
  'סאאב שודיה': 'Saab',
  'לנצ\'יה': 'Lancia',
  'סמארט': 'Smart',
  'סמארט ג\'.מ.ב.ה': 'Smart',
  'סמארט סלובניה': 'Smart',
  'סמארט צרפת': 'Smart',
  'רובר אנגליה': 'Rover',

  // American brands
  'פורד': 'Ford',
  'פורד איטליה': 'Ford',
  'פורד ארה"ב': 'Ford',
  'פורד בריטניה': 'Ford',
  'פורד גרמניה': 'Ford',
  'פורד מקסיקו': 'Ford',
  'פורד ספרד': 'Ford',
  'פורד קנדה': 'Ford',
  'פורד תאילנד': 'Ford',
  'פורד-ברזיל': 'Ford',
  'שברולט': 'Chevrolet',
  'שברולט ארה"ב': 'Chevrolet',
  'שברולט ד.קוריא': 'Chevrolet',
  'שברולט מקסיקו': 'Chevrolet',
  'שברולט קנדה': 'Chevrolet',
  "ג'יפ ארה\"ב": 'Jeep',
  "ג'פ": 'Jeep',
  'קדילק': 'Cadillac',
  'קאדילאק ארה"ב': 'Cadillac',
  'קאדילאק מכסיקו': 'Cadillac',
  'לינקולן': 'Lincoln',
  'ביואיק ארהב': 'Buick',
  'ביואיק קנדה': 'Buick',
  'קרייזלר ארגנט': 'Chrysler',
  'קרייזלר ארה"ב': 'Chrysler',
  'קרייזלר יפן': 'Chrysler',
  'קרייזלר מזארטי': 'Chrysler',
  'קרייזלר מכסיקו': 'Chrysler',
  'קרייזלר קנדה': 'Chrysler',
  'קרייזלר-אוסטרי': 'Chrysler',
  'קרייזלר-צרפת': 'Chrysler',
  "דודג'": 'Dodge',
  "דודג' ארה\"ב": 'Dodge',
  "דודג' מקסיקו": 'Dodge',
  "דודג' קיו": 'Dodge',
  "דודג' קנדה": 'Dodge',
  'דודג מיצובישי': 'Dodge',
  "ג'י אם סי": 'GMC',
  "ג'.מ ארה\"ב": 'GMC',
  "ג'י.אמ.סי": 'GMC',
  'פונטיאק': 'Pontiac',
  'פונטיאק קנדה': 'Pontiac',
  'האמר-ארה"ב': 'Hummer',

  // Electric brands
  'טסלה': 'Tesla',
  "טסלה ארה''ב": 'Tesla',
  'טסלה סין': 'Tesla',

  // Chinese brands
  "צ'רי סין": 'Chery',
  'בי ווי די': 'BYD',
  'סקיוול סין': 'Skywell',
  'מ.ג': 'MG',
  'מ. ג אנגליה': 'MG',

  // Motorcycle brands
  'הארלי דיוידסון': 'Harley-Davidson',
  'דוקטי איטליה': 'Ducati',
  'קוואסאקי': 'Kawasaki',
  'קוואסאקי יפן': 'Kawasaki',
  'ימהה איטליה': 'Yamaha',
  'ימהה ארה"ב': 'Yamaha',
  'ימהה יפן': 'Yamaha',
  'ימהה ספרד': 'Yamaha',
  'טריאומף בריטי': 'Triumph',
  'טריומף בריטניה': 'Triumph',
  'בימוטה איטליה': 'Bimota',
};

/**
 * Translate brand name to English
 */
function translateBrand(hebrewBrand) {
  if (!hebrewBrand) return null;
  const trimmed = hebrewBrand.trim();

  // Direct lookup
  if (BRAND_MAP[trimmed]) {
    return BRAND_MAP[trimmed];
  }

  // Try partial match (for truncated names)
  for (const [hebrew, english] of Object.entries(BRAND_MAP)) {
    if (trimmed.startsWith(hebrew) || hebrew.startsWith(trimmed)) {
      return english;
    }
  }

  // Return original if no translation found
  return trimmed;
}

/**
 * Normalize model name - clean up and standardize
 */
function normalizeModel(model) {
  if (!model) return null;

  let normalized = model.trim().toUpperCase();

  // Remove leading/trailing underscores
  normalized = normalized.replace(/^_+|_+$/g, '');

  // Remove excessive spaces
  normalized = normalized.replace(/\s+/g, ' ');

  // Skip if looks like a code rather than a model name
  // Valid model names should be mostly letters/spaces with optional numbers
  // Skip entries that are mostly numbers/codes
  if (/^[A-Z0-9]{6,}$/.test(normalized)) {
    return null; // Looks like an internal code
  }

  // Skip if contains too many special characters
  if (/[^A-Z0-9\s\-\/\.]/.test(normalized)) {
    return null; // Contains non-latin characters
  }

  // Skip very short entries
  if (normalized.length < 2) {
    return null;
  }

  return normalized;
}

/**
 * Parse integer safely
 */
function parseIntSafe(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Delay helper for rate limiting
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Query the API with pagination
 */
async function queryAPI(resourceId, filters = {}, limit = 1000, offset = 0) {
  const filtersJson = JSON.stringify(filters);
  const url = `${DATA_GOV_IL_BASE}?resource_id=${resourceId}&filters=${encodeURIComponent(filtersJson)}&limit=${limit}&offset=${offset}`;

  const response = await fetchWithTimeout(url, 30000);
  if (!response.ok) {
    throw new Error(`API returned status: ${response.status}`);
  }

  const json = await response.json();
  return {
    records: json?.result?.records || [],
    total: json?.result?.total || 0,
  };
}

/**
 * Fetch all records from an API (with pagination)
 */
async function fetchAllRecords(resourceId, apiName) {
  console.log(`\nFetching from ${apiName}...`);
  console.log(`Resource ID: ${resourceId}`);

  const allRecords = [];
  let offset = 0;
  let total = 0;
  let batchNum = 1;

  // First, get total count
  const initial = await queryAPI(resourceId, {}, 1, 0);
  total = initial.total;
  console.log(`Total records: ${total.toLocaleString()}`);

  // Fetch all records in batches
  while (offset < total) {
    process.stdout.write(`\rFetching batch ${batchNum}: ${offset.toLocaleString()} - ${Math.min(offset + BATCH_SIZE, total).toLocaleString()} of ${total.toLocaleString()}    `);

    try {
      const result = await queryAPI(resourceId, {}, BATCH_SIZE, offset);
      allRecords.push(...result.records);
    } catch (error) {
      console.error(`\nError fetching batch: ${error.message}`);
      await delay(2000);
      try {
        const result = await queryAPI(resourceId, {}, BATCH_SIZE, offset);
        allRecords.push(...result.records);
      } catch (retryError) {
        console.error(`Retry failed: ${retryError.message}`);
      }
    }

    offset += BATCH_SIZE;
    batchNum++;
    await delay(DELAY_BETWEEN_REQUESTS);
  }

  console.log(`\nCollected ${allRecords.length.toLocaleString()} records from ${apiName}`);
  return allRecords;
}

/**
 * Build a lookup table of degem_nm -> kinuy_mishari from Weight API
 */
function buildModelNameLookup(weightRecords) {
  console.log('\nBuilding model name lookup from Weight API...');

  const lookup = new Map(); // brand_degem -> kinuy_mishari
  let entriesAdded = 0;

  for (const record of weightRecords) {
    const brand = translateBrand(record.tozeret_nm);
    const degemNm = record.degem_nm;
    const kinuyMishari = record.kinuy_mishari;

    if (!brand || !degemNm || !kinuyMishari) continue;

    const normalized = normalizeModel(kinuyMishari);
    if (!normalized) continue;

    const key = `${brand}::${degemNm.trim().toUpperCase()}`;

    if (!lookup.has(key)) {
      lookup.set(key, normalized);
      entriesAdded++;
    }
  }

  console.log(`Built lookup with ${entriesAdded.toLocaleString()} entries`);
  return lookup;
}

/**
 * Extract clean model name from degem_nm field
 * Falls back to extracting model name patterns from the raw field
 */
function extractModelName(degemNm, brand, modelLookup) {
  if (!degemNm) return null;

  const normalized = degemNm.trim().toUpperCase();

  // Try lookup first
  const lookupKey = `${brand}::${normalized}`;
  if (modelLookup.has(lookupKey)) {
    return modelLookup.get(lookupKey);
  }

  // Common model name patterns to extract
  const modelPatterns = [
    // Toyota
    /\b(COROLLA|CAMRY|RAV4|YARIS|HILUX|LAND CRUISER|PRIUS|AURIS|AVENSIS|HIGHLANDER|SIENNA|TACOMA|TUNDRA|VENZA|AVALON|SUPRA|86|CROWN|FORTUNER|INNOVA|RUSH|ALPHARD|VELLFIRE|NOAH|VOXY|SEQUOIA|4RUNNER)\b/,
    // Honda
    /\b(CIVIC|ACCORD|CR-V|HR-V|FIT|JAZZ|PILOT|ODYSSEY|RIDGELINE|PASSPORT|CITY|INSIGHT|CLARITY|S2000|NSX|ELEMENT|CR-Z)\b/,
    // Mazda
    /\b(MAZDA2|MAZDA3|MAZDA6|CX-3|CX-30|CX-5|CX-9|MX-5|MIATA|RX-7|RX-8|CX-50|CX-60|CX-90|DEMIO|AXELA|ATENZA)\b/,
    // Nissan
    /\b(ALTIMA|MAXIMA|SENTRA|VERSA|LEAF|ROGUE|MURANO|PATHFINDER|ARMADA|FRONTIER|TITAN|KICKS|JUKE|QASHQAI|X-TRAIL|NAVARA|PATROL|GT-R|370Z|350Z|NOTE|TIIDA|MICRA|MARCH|SUNNY)\b/,
    // Hyundai
    /\b(ELANTRA|SONATA|TUCSON|SANTA FE|PALISADE|KONA|VENUE|IONIQ|ACCENT|AZERA|GENESIS|VELOSTER|I10|I20|I30|I40|IX35|CRETA|GRAND I10|VERNA|XCENT)\b/,
    // Kia
    /\b(FORTE|OPTIMA|K5|SORENTO|SPORTAGE|TELLURIDE|SOUL|SELTOS|RIO|STINGER|CARNIVAL|SEDONA|NIRO|EV6|PICANTO|CEED|PRO CEED|CERATO|CARENS)\b/,
    // BMW
    /\b(3 SERIES|5 SERIES|7 SERIES|X1|X2|X3|X4|X5|X6|X7|Z4|M3|M4|M5|I3|I4|I7|IX|IX3|318|320|325|328|330|335|340|520|525|528|530|535|540|550|730|740|750|760)\b/,
    // Mercedes
    /\b(A CLASS|B CLASS|C CLASS|E CLASS|S CLASS|CLA|CLS|GLA|GLB|GLC|GLE|GLS|G CLASS|AMG GT|SL|SLC|A180|A200|A250|C180|C200|C250|C300|C350|E200|E250|E300|E350|S350|S400|S500|S560|S600|SPRINTER|VITO|V CLASS)\b/,
    // Volkswagen
    /\b(GOLF|POLO|PASSAT|JETTA|TIGUAN|ATLAS|ARTEON|ID\.4|ID\.3|TAOS|TOUAREG|BEETLE|SCIROCCO|CC|EOS|SHARAN|TOURAN|CADDY|TRANSPORTER|MULTIVAN|CARAVELLE|T5|T6|UP|BORA)\b/,
    // Audi
    /\b(A1|A3|A4|A5|A6|A7|A8|Q2|Q3|Q5|Q7|Q8|TT|R8|E-TRON|RS3|RS4|RS5|RS6|RS7|S3|S4|S5|S6|S7|S8|SQ5|SQ7|SQ8)\b/,
    // Ford
    /\b(MUSTANG|F-150|F-250|F-350|RANGER|BRONCO|EXPLORER|EXPEDITION|ESCAPE|EDGE|FOCUS|FIESTA|FUSION|TAURUS|TRANSIT|MAVERICK|ECOSPORT|KUGA|MONDEO|GALAXY|S-MAX|C-MAX|PUMA)\b/,
    // Chevrolet
    /\b(CAMARO|CORVETTE|MALIBU|IMPALA|CRUZE|SPARK|SONIC|EQUINOX|TRAVERSE|TAHOE|SUBURBAN|SILVERADO|COLORADO|BLAZER|TRAX|BOLT|AVEO|CAPTIVA|ORLANDO)\b/,
    // Subaru
    /\b(IMPREZA|WRX|STI|LEGACY|OUTBACK|FORESTER|CROSSTREK|XV|ASCENT|BRZ|LEVORG|TRIBECA)\b/,
    // Other common models
    /\b(OUTLANDER|LANCER|PAJERO|ASX|ECLIPSE|MIRAGE|SPACE STAR|L200)\b/, // Mitsubishi
    /\b(SWIFT|VITARA|JIMNY|S-CROSS|IGNIS|BALENO|CELERIO|ALTO|WAGON R|ERTIGA|XL7)\b/, // Suzuki
    /\b(FABIA|OCTAVIA|SUPERB|KAROQ|KODIAQ|KAMIQ|SCALA|ENYAQ|RAPID|ROOMSTER|YETI)\b/, // Skoda
    /\b(CLIO|MEGANE|CAPTUR|KADJAR|KOLEOS|SCENIC|TALISMAN|TWINGO|ZOE|DUSTER|SANDERO|LOGAN)\b/, // Renault
    /\b(208|308|508|2008|3008|5008|PARTNER|RIFTER|TRAVELLER|EXPERT)\b/, // Peugeot
    /\b(C1|C3|C4|C5|BERLINGO|SPACETOURER|DS3|DS4|DS5|DS7)\b/, // Citroen
    /\b(500|PANDA|TIPO|PUNTO|GRANDE PUNTO|BRAVO|DOBLO|DUCATO|FIORINO)\b/, // Fiat
    /\b(XC40|XC60|XC90|S60|S90|V40|V60|V90|C30|C40)\b/, // Volvo
    /\b(F-TYPE|XE|XF|XJ|E-PACE|F-PACE|I-PACE)\b/, // Jaguar
    /\b(RANGE ROVER|DISCOVERY|DEFENDER|EVOQUE|VELAR|SPORT|FREELANDER)\b/, // Land Rover
    /\b(MODEL S|MODEL 3|MODEL X|MODEL Y|ROADSTER)\b/, // Tesla
    /\b(LEON|IBIZA|ARONA|ATECA|TARRACO|ALHAMBRA)\b/, // Seat
    /\b(GHIBLI|LEVANTE|QUATTROPORTE|GRECALE)\b/, // Maserati
    /\b(WRANGLER|GRAND CHEROKEE|CHEROKEE|COMPASS|RENEGADE|GLADIATOR)\b/, // Jeep
    /\b(CHARGER|CHALLENGER|DURANGO|RAM 1500|RAM 2500)\b/, // Dodge/Ram
  ];

  for (const pattern of modelPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  // Try to clean up the degem_nm if it looks like a model name
  const cleaned = normalizeModel(degemNm);
  if (cleaned && cleaned.length >= 2 && cleaned.length <= 30) {
    // Check if it's mostly alphabetic
    const alphaRatio = (cleaned.match(/[A-Z]/g) || []).length / cleaned.length;
    if (alphaRatio > 0.6) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Process records and build the engine database
 */
function buildEngineDatabase(engineRecords, modelLookup) {
  console.log('\nBuilding engine database...');

  const database = {};
  let validRecords = 0;
  let skippedNoCC = 0;
  let skippedNoBrand = 0;
  let skippedNoModel = 0;
  let skippedInvalidCC = 0;

  for (const record of engineRecords) {
    const brand = translateBrand(record.tozeret_nm);
    const cc = parseIntSafe(record.nefach_manoa);

    // Skip if missing required fields
    if (!brand) {
      skippedNoBrand++;
      continue;
    }
    if (cc === undefined) {
      skippedNoCC++;
      continue;
    }

    // Validate CC range (50cc to 15000cc)
    if (cc < 50 || cc > 15000) {
      skippedInvalidCC++;
      continue;
    }

    // Try to get clean model name
    const model = extractModelName(record.degem_nm, brand, modelLookup);
    if (!model) {
      skippedNoModel++;
      continue;
    }

    // Initialize brand if not exists
    if (!database[brand]) {
      database[brand] = {};
    }

    // Initialize model if not exists
    if (!database[brand][model]) {
      database[brand][model] = new Set();
    }

    // Add CC value
    database[brand][model].add(cc);
    validRecords++;
  }

  console.log('\nProcessing statistics:');
  console.log(`  Valid records: ${validRecords.toLocaleString()}`);
  console.log(`  Skipped (no brand): ${skippedNoBrand.toLocaleString()}`);
  console.log(`  Skipped (no model): ${skippedNoModel.toLocaleString()}`);
  console.log(`  Skipped (no CC): ${skippedNoCC.toLocaleString()}`);
  console.log(`  Skipped (invalid CC): ${skippedInvalidCC.toLocaleString()}`);

  // Convert Sets to sorted arrays
  const finalDatabase = {};
  let totalBrands = 0;
  let totalModels = 0;

  for (const brand of Object.keys(database).sort()) {
    finalDatabase[brand] = {};
    totalBrands++;

    for (const model of Object.keys(database[brand]).sort()) {
      const ccValues = Array.from(database[brand][model]).sort((a, b) => a - b);
      finalDatabase[brand][model] = ccValues;
      totalModels++;
    }
  }

  console.log('\nDatabase summary:');
  console.log(`  Total brands: ${totalBrands}`);
  console.log(`  Total models: ${totalModels}`);

  return { database: finalDatabase, stats: { totalBrands, totalModels, validRecords } };
}

/**
 * Generate the TypeScript file content
 */
function generateTypeScript(database, stats) {
  const now = new Date().toISOString().split('T')[0];

  let content = `/**
 * Comprehensive Engine Database
 *
 * Extracted from Israeli Government Vehicle Registry APIs
 * Data sources:
 * - Engine CC: data.gov.il יבוא אישי API (Resource: ${ENGINE_CC_API_RESOURCE_ID})
 * - Model names: data.gov.il ביטול סופי API (Resource: ${WEIGHT_API_RESOURCE_ID})
 *
 * Generated: ${now}
 * Total brands: ${stats.totalBrands}
 * Total models: ${stats.totalModels}
 * Valid records processed: ${stats.validRecords.toLocaleString()}
 *
 * Format: { Brand: { MODEL: [cc1, cc2, ...] } }
 * - Brand names are in English (translated from Hebrew)
 * - Model names are UPPERCASE
 * - CC values are sorted ascending, duplicates removed
 */

import { translateBrandToEnglish } from './fuelData';

/**
 * Complete engine database mapping brand -> model -> engine CCs
 */
export const KNOWN_ENGINES: Record<string, Record<string, number[]>> = {\n`;

  // Generate the database entries
  const brands = Object.keys(database).sort();
  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i];
    const models = database[brand];
    const modelNames = Object.keys(models).sort();

    content += `  '${escapeString(brand)}': {\n`;

    for (let j = 0; j < modelNames.length; j++) {
      const model = modelNames[j];
      const ccValues = models[model];
      const ccString = ccValues.join(', ');
      const comma = j < modelNames.length - 1 ? ',' : '';
      content += `    '${escapeString(model)}': [${ccString}]${comma}\n`;
    }

    const brandComma = i < brands.length - 1 ? ',' : '';
    content += `  }${brandComma}\n`;
  }

  content += `};

/**
 * Get known engine CCs for a brand-model combination
 * @param brand - Brand name (Hebrew or English)
 * @param model - Model name (case-insensitive)
 * @returns Array of known CC values, or undefined if not found
 *
 * @example
 * getKnownEngineCCs('Honda', 'CIVIC') // [1339, 1496, 1497, 1798, ...]
 * getKnownEngineCCs('הונדה', 'civic') // [1339, 1496, 1497, 1798, ...]
 */
export function getKnownEngineCCs(brand: string, model: string): number[] | undefined {
  const normalizedBrand = translateBrandToEnglish(brand);
  const normalizedModel = model.toUpperCase().trim();
  return KNOWN_ENGINES[normalizedBrand]?.[normalizedModel];
}

/**
 * Get all brands in the database
 * @returns Array of brand names (English)
 */
export function getAllBrands(): string[] {
  return Object.keys(KNOWN_ENGINES).sort();
}

/**
 * Get all models for a brand
 * @param brand - Brand name (Hebrew or English)
 * @returns Array of model names, or undefined if brand not found
 */
export function getModelsForBrand(brand: string): string[] | undefined {
  const normalizedBrand = translateBrandToEnglish(brand);
  const models = KNOWN_ENGINES[normalizedBrand];
  return models ? Object.keys(models).sort() : undefined;
}

/**
 * Get database statistics
 */
export function getEngineDatabaseStats() {
  const brands = Object.keys(KNOWN_ENGINES);
  let totalModels = 0;
  let totalCCVariants = 0;

  for (const brand of brands) {
    const models = Object.keys(KNOWN_ENGINES[brand]);
    totalModels += models.length;
    for (const model of models) {
      totalCCVariants += KNOWN_ENGINES[brand][model].length;
    }
  }

  return {
    totalBrands: brands.length,
    totalModels,
    totalCCVariants,
    generatedDate: '${now}',
  };
}
`;

  return content;
}

/**
 * Escape special characters in strings for TypeScript
 */
function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');
}

/**
 * Print sample entries for verification
 */
function printSamples(database) {
  console.log('\n========================================');
  console.log('Sample entries for verification:');
  console.log('========================================');

  const priorityBrands = ['Toyota', 'Honda', 'Mazda', 'Hyundai', 'Kia', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Nissan', 'Ford'];
  let found = 0;

  for (const brand of priorityBrands) {
    if (database[brand]) {
      const models = Object.keys(database[brand]).slice(0, 5);
      console.log(`\n${brand}:`);
      for (const model of models) {
        const ccValues = database[brand][model];
        console.log(`  ${model}: [${ccValues.join(', ')}]`);
      }
      found++;
      if (found >= 5) break;
    }
  }

  // Also show brands with most models
  console.log('\n\nBrands with most models:');
  const brandsByModelCount = Object.entries(database)
    .map(([brand, models]) => ({ brand, count: Object.keys(models).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  for (const { brand, count } of brandsByModelCount) {
    console.log(`  ${brand}: ${count} models`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('========================================');
  console.log('Engine Database Extraction Tool v2');
  console.log('========================================');

  try {
    // Step 1: Fetch from Weight API (for kinuy_mishari mapping)
    const weightRecords = await fetchAllRecords(WEIGHT_API_RESOURCE_ID, 'Weight API (ביטול סופי)');

    // Step 2: Build model name lookup
    const modelLookup = buildModelNameLookup(weightRecords);

    // Step 3: Fetch from Engine CC API
    const engineRecords = await fetchAllRecords(ENGINE_CC_API_RESOURCE_ID, 'Engine CC API (יבוא אישי)');

    if (engineRecords.length === 0) {
      console.error('No engine records fetched. Exiting.');
      process.exit(1);
    }

    // Step 4: Build database
    const { database, stats } = buildEngineDatabase(engineRecords, modelLookup);

    // Step 5: Print samples
    printSamples(database);

    // Step 6: Generate TypeScript
    console.log('\n\nGenerating TypeScript file...');
    const tsContent = generateTypeScript(database, stats);

    // Step 7: Write file
    const outputPath = path.join(__dirname, '..', 'lib', 'data', 'engineDatabase.ts');
    fs.writeFileSync(outputPath, tsContent, 'utf8');

    console.log(`\nFile written to: ${outputPath}`);
    console.log('\n========================================');
    console.log('Extraction complete!');
    console.log('========================================');
    console.log(`Total brands: ${stats.totalBrands}`);
    console.log(`Total models: ${stats.totalModels}`);
    console.log(`Output file: ${outputPath}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
