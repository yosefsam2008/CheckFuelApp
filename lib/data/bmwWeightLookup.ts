/**
 * BMW Weight Lookup Table
 *
 * When API weight data is missing or invalid (e.g., VIN in weight field),
 * this table provides manufacturer-specified curb weights for BMW models.
 *
 * Data sources:
 * - BMW official specifications
 * - Auto Motor und Sport technical data
 * - Car and Driver vehicle specs
 *
 * Format:
 * "MODEL_CODE": {
 *   min: minimum curb weight (kg),
 *   max: maximum curb weight (kg),
 *   typical: typical/average curb weight (kg)
 * }
 */

export interface WeightRange {
  min: number;
  max: number;
  typical: number;
}

export const BMW_WEIGHT_LOOKUP: Record<string, WeightRange> = {
  // ============================================================================
  // 2-SERIES (F22/F23/F45/F46/F87)
  // ============================================================================

  // 2-Series Coupe (F22) - 2014-2021
  "F22": { min: 1365, max: 1520, typical: 1440 },       // 218i-228i Coupe
  "8E31": { min: 1365, max: 1440, typical: 1400 },      // 218i Coupe (B38B15A)
  "8E32": { min: 1385, max: 1460, typical: 1420 },      // 220i Coupe

  // 2-Series Convertible (F23) - 2015-2021
  "F23": { min: 1515, max: 1670, typical: 1590 },       // 218i-228i Cabrio
  "8E32": { min: 1595, max: 1650, typical: 1620 },      // 218i Cabrio (B38B15A)

  // 2-Series Active Tourer (F45) - 2014-2021
  "F45": { min: 1450, max: 1550, typical: 1500 },       // 218i Active Tourer (B38B15A)
  "F45-220": { min: 1470, max: 1570, typical: 1520 },   // 220i Active Tourer
  "F45-225": { min: 1565, max: 1665, typical: 1615 },   // 225xe PHEV

  // 2-Series Gran Tourer (F46) - 2015-2021
  "F46": { min: 1485, max: 1585, typical: 1535 },       // 218i Gran Tourer (B38B15A)
  "F46-220": { min: 1505, max: 1605, typical: 1555 },   // 220i Gran Tourer

  // 2-Series M2 (F87) - 2016-2021
  "F87": { min: 1520, max: 1625, typical: 1570 },       // M2
  "F87-COMP": { min: 1550, max: 1655, typical: 1600 },  // M2 Competition

  // ============================================================================
  // 3-SERIES (F30/F31/F34/G20/G21)
  // ============================================================================

  // 3-Series Sedan (F30) - 2012-2019
  "F30": { min: 1450, max: 1600, typical: 1525 },       // 320i-335i
  "F30-318": { min: 1430, max: 1540, typical: 1485 },   // 318i (B38B15A)
  "F30-320": { min: 1450, max: 1560, typical: 1505 },   // 320i
  "F30-328": { min: 1495, max: 1605, typical: 1550 },   // 328i
  "F30-335": { min: 1525, max: 1635, typical: 1580 },   // 335i

  // 3-Series Touring (F31) - 2012-2019
  "F31": { min: 1505, max: 1655, typical: 1580 },       // 320i-335i Touring
  "F31-318": { min: 1485, max: 1595, typical: 1540 },   // 318i Touring

  // 3-Series Gran Turismo (F34) - 2013-2019
  "F34": { min: 1660, max: 1810, typical: 1735 },       // 320i-335i GT

  // 3-Series Sedan (G20) - 2019+
  "G20": { min: 1440, max: 1670, typical: 1555 },       // 318i-330i
  "G20-318": { min: 1440, max: 1540, typical: 1490 },   // 318i (B38B15A)
  "G20-320": { min: 1455, max: 1555, typical: 1505 },   // 320i (B48B20)
  "G20-330": { min: 1515, max: 1615, typical: 1565 },   // 330i
  "G20-M340": { min: 1670, max: 1770, typical: 1720 },  // M340i (B58B30)

  // 3-Series Touring (G21) - 2019+
  "G21": { min: 1515, max: 1745, typical: 1630 },       // 318i-330i Touring

  // ============================================================================
  // X1 (E84/F48/U11)
  // ============================================================================

  // X1 (E84) - 2009-2015
  "E84": { min: 1520, max: 1735, typical: 1625 },       // X1 sDrive18i-xDrive28i

  // X1 (F48) - 2015-2022
  "F48": { min: 1520, max: 1680, typical: 1600 },       // X1 sDrive18i (B38B15A)
  "F48-20": { min: 1565, max: 1725, typical: 1645 },    // X1 sDrive20i
  "F48-25": { min: 1660, max: 1820, typical: 1740 },    // X1 xDrive25i
  "F48-PHEV": { min: 1755, max: 1915, typical: 1835 },  // X1 xDrive25e PHEV

  // X1 (U11) - 2022+
  "U11": { min: 1570, max: 1750, typical: 1660 },       // X1 sDrive18i/20i

  // ============================================================================
  // X2 (F39/U10)
  // ============================================================================

  // X2 (F39) - 2018-2024
  "F39": { min: 1535, max: 1695, typical: 1615 },       // X2 sDrive18i (B38B15A)
  "F39-20": { min: 1580, max: 1740, typical: 1660 },    // X2 sDrive20i
  "F39-M35": { min: 1625, max: 1785, typical: 1705 },   // X2 M35i

  // X2 (U10) - 2024+
  "U10": { min: 1590, max: 1770, typical: 1680 },       // X2 sDrive18i/20i

  // ============================================================================
  // X3 (F25/G01)
  // ============================================================================

  // X3 (F25) - 2010-2017
  "F25": { min: 1770, max: 2020, typical: 1895 },       // X3 xDrive20i-35i
  "F25-20": { min: 1770, max: 1920, typical: 1845 },    // X3 xDrive20i

  // X3 (G01) - 2017+
  "G01": { min: 1765, max: 2015, typical: 1890 },       // X3 sDrive18i-M40i
  "G01-20": { min: 1765, max: 1915, typical: 1840 },    // X3 xDrive20i
  "G01-30": { min: 1835, max: 1985, typical: 1910 },    // X3 xDrive30i

  // ============================================================================
  // X5 (E70/F15/G05)
  // ============================================================================

  // X5 (E70) - 2006-2013
  "E70": { min: 2160, max: 2450, typical: 2305 },       // X5 xDrive30i-50i

  // X5 (F15) - 2013-2018
  "F15": { min: 2050, max: 2350, typical: 2200 },       // X5 xDrive25d-50i
  "F15-30": { min: 2085, max: 2235, typical: 2160 },    // X5 xDrive30d

  // X5 (G05) - 2018+
  "G05": { min: 2035, max: 2385, typical: 2210 },       // X5 xDrive30i-M50i
  "G05-30": { min: 2035, max: 2185, typical: 2110 },    // X5 xDrive30i
  "G05-45": { min: 2185, max: 2335, typical: 2260 },    // X5 xDrive45e PHEV

  // ============================================================================
  // 5-SERIES (F10/F11/G30/G31)
  // ============================================================================

  // 5-Series Sedan (F10) - 2010-2017
  "F10": { min: 1635, max: 1890, typical: 1760 },       // 520i-550i
  "F10-520": { min: 1635, max: 1745, typical: 1690 },   // 520i
  "F10-535": { min: 1770, max: 1880, typical: 1825 },   // 535i

  // 5-Series Touring (F11) - 2010-2017
  "F11": { min: 1700, max: 1955, typical: 1825 },       // 520i-550i Touring

  // 5-Series Sedan (G30) - 2017+
  "G30": { min: 1580, max: 1855, typical: 1715 },       // 520i-545e
  "G30-520": { min: 1580, max: 1690, typical: 1635 },   // 520i
  "G30-530": { min: 1655, max: 1765, typical: 1710 },   // 530i

  // 5-Series Touring (G31) - 2017+
  "G31": { min: 1655, max: 1930, typical: 1790 },       // 520i-545e Touring

  // ============================================================================
  // 7-SERIES (F01/G11/G12)
  // ============================================================================

  // 7-Series (F01) - 2008-2015
  "F01": { min: 1835, max: 2180, typical: 2005 },       // 730i-760i

  // 7-Series (G11/G12) - 2015+
  "G11": { min: 1750, max: 2115, typical: 1930 },       // 730i-M760i (SWB)
  "G12": { min: 1830, max: 2195, typical: 2010 },       // 730Li-M760Li (LWB)

  // ============================================================================
  // i SERIES (ELECTRIC/HYBRID)
  // ============================================================================

  // i3 (I01) - 2013-2022
  "I01": { min: 1195, max: 1320, typical: 1260 },       // i3 BEV
  "I01-REX": { min: 1315, max: 1440, typical: 1380 },   // i3 REx (B38B15M0)

  // i8 (I12/I15) - 2014-2020
  "I12": { min: 1485, max: 1590, typical: 1535 },       // i8 Coupe (B38B15M0 range extender)
  "I15": { min: 1595, max: 1700, typical: 1645 },       // i8 Roadster

  // iX3 (G08) - 2020+
  "G08": { min: 2185, max: 2285, typical: 2235 },       // iX3 BEV

  // iX (I20) - 2021+
  "I20": { min: 2365, max: 2585, typical: 2475 },       // iX xDrive40/50

  // i4 (G26) - 2021+
  "G26": { min: 2050, max: 2215, typical: 2130 },       // i4 eDrive40/M50
};

/**
 * Estimate BMW weight from model code
 *
 * @param modelCode - BMW internal model code (e.g., "F48", "G20")
 * @param variant - Optional variant suffix (e.g., "318", "M340")
 * @returns Typical curb weight in kg, or undefined if not found
 */
export function estimateBMWWeight(
  modelCode: string,
  variant?: string
): number | undefined {
  // Try exact match first (with variant)
  if (variant) {
    const fullCode = `${modelCode}-${variant}`;
    const lookup = BMW_WEIGHT_LOOKUP[fullCode];
    if (lookup) {
      if (__DEV__) {
        console.log(`📊 BMW weight estimation for ${fullCode}:`);
        if (__DEV__) {
          console.log(`   Range: ${lookup.min}-${lookup.max}kg`);
        }
        if (__DEV__) {
          console.log(`   Using typical: ${lookup.typical}kg`);
        }
      }
      return lookup.typical;
    }
  }

  // Fallback to base model
  const lookup = BMW_WEIGHT_LOOKUP[modelCode];
  if (!lookup) {
    if (__DEV__) {
      console.warn(`⚠️  No weight data for BMW model ${modelCode}`);
    }
    return undefined;
  }

  if (__DEV__) {
    console.log(`📊 BMW weight estimation for ${modelCode}:`);
    if (__DEV__) {
      console.log(`   Range: ${lookup.min}-${lookup.max}kg`);
    }
    if (__DEV__) {
      console.log(`   Using typical: ${lookup.typical}kg`);
    }
  }

  return lookup.typical;
}

/**
 * Extract BMW model code from degem_nm or kinuy_mishari field
 *
 * Examples:
 * - "218 I COUPE" → "8E31" or "F22"
 * - "X1 SDRIVE18I" → "F48"
 * - "320I" → "F30" or "G20" (needs year to disambiguate)
 *
 * @param model - Model string from API
 * @param year - Manufacturing year (helps disambiguate generations)
 * @returns BMW model code or undefined
 */
export function extractBMWModelCode(
  model: string,
  year?: number
): string | undefined {
  if (!model) return undefined;

  const normalized = model.toUpperCase().trim();

  // 2-Series detection
  if (normalized.includes('218') && normalized.includes('COUPE')) {
    return '8E31';  // 218i Coupe
  }
  if (normalized.includes('218') && normalized.includes('CABRIO')) {
    return '8E32';  // 218i Cabrio
  }
  if (normalized.includes('218') && normalized.includes('ACTIVE')) {
    return 'F45';   // 218i Active Tourer
  }
  if (normalized.includes('218') && normalized.includes('GRAN')) {
    return 'F46';   // 218i Gran Tourer
  }

  // 3-Series detection
  if (normalized.includes('318')) {
    if (year && year >= 2019) return 'G20-318';
    return 'F30-318';
  }
  if (normalized.includes('320')) {
    if (year && year >= 2019) return 'G20-320';
    return 'F30-320';
  }
  if (normalized.includes('330')) {
    if (year && year >= 2019) return 'G20-330';
    return 'F30-328';  // F30 328i is similar to G20 330i
  }

  // X1 detection
  if (normalized.includes('X1') && normalized.includes('18')) {
    if (year && year >= 2022) return 'U11';
    if (year && year >= 2015) return 'F48';
    return 'E84';
  }

  // X2 detection
  if (normalized.includes('X2') && normalized.includes('18')) {
    if (year && year >= 2024) return 'U10';
    return 'F39';
  }

  // X3 detection
  if (normalized.includes('X3') && normalized.includes('20')) {
    if (year && year >= 2017) return 'G01-20';
    return 'F25-20';
  }

  // X5 detection
  if (normalized.includes('X5') && normalized.includes('30')) {
    if (year && year >= 2018) return 'G05-30';
    if (year && year >= 2013) return 'F15-30';
    return 'E70';
  }

  // i3/i8 detection
  if (normalized.includes('I3')) {
    if (normalized.includes('REX')) return 'I01-REX';
    return 'I01';
  }
  if (normalized.includes('I8')) {
    if (normalized.includes('ROADSTER')) return 'I15';
    return 'I12';
  }

  if (__DEV__) {
    console.warn(`⚠️  Could not extract BMW model code from: "${model}"`);
  }

  return undefined;
}
