/**
 * Static Engine CC Lookup Table
 *
 * This lookup table maps common Israeli vehicle engine codes to their
 * displacement (CC). This compensates for the lack of CC data in the
 * Israeli government car API.
 *
 * Data sources:
 * - Manufacturer specifications
 * - Wikipedia engine databases
 * - Community contributions
 *
 * Format: { "ENGINE_CODE": CC_VALUE }
 */

export const ENGINE_CC_LOOKUP: Record<string, number> = {
  // ============================================================================
  // TOYOTA ENGINES
  // ============================================================================
  "3ZZ": 1598,      // Toyota Corolla, Matrix
  "2ZZ": 1796,      // Toyota Celica, Corolla
  "1ZZ": 1794,      // Toyota Corolla
  "4ZZ": 1398,      // Toyota Yaris, Vitz
  "1NZ": 1497,      // Toyota Yaris, Vitz
  "2NZ": 1298,      // Toyota Yaris, Vitz
  "1KR": 998,       // Toyota Aygo, Yaris
  "2KR": 998,       // Toyota Aygo, Passo
  "1KD": 2982,      // Toyota Hilux, Land Cruiser (diesel)
  "2KD": 2494,      // Toyota Hilux, Fortuner (diesel)
  "1GR": 3956,      // Toyota Land Cruiser, 4Runner, Tacoma
  "2GR": 3456,      // Toyota Camry, Highlander, RAV4
  "3GR": 2995,      // Toyota Crown
  "2AR": 2494,      // Toyota Camry, RAV4
  "1AR": 1998,      // Toyota RAV4, Scion tC
  "2AZ": 2362,      // Toyota Camry, RAV4
  "1AZ": 1998,      // Toyota RAV4, Avensis

  // ============================================================================
  // HYUNDAI ENGINES (G-series)
  // ============================================================================
  "G4FD": 1591,     // Hyundai Accent, i30
  "G4FA": 1396,     // Hyundai i20, i30
  "G4FC": 1368,     // Hyundai i10
  "G4LA": 1248,     // Hyundai i10, Kia Picanto
  "G4LC": 1197,     // Hyundai i10
  "G4KD": 1998,     // Hyundai Tucson, Elantra
  "G4KE": 1999,     // Hyundai Sonata, Tucson
  "G4KH": 1998,     // Hyundai Sonata (Turbo)
  "G4NA": 1999,     // Hyundai Elantra, i30
  "G4NC": 1797,     // Hyundai Elantra, Forte
  "THETA": 1998,    // Hyundai Sonata (Theta II)
  "LAMBDA": 3342,   // Hyundai Santa Fe, Genesis
  "NU": 1591,       // Hyundai Accent, Elantra

  // ============================================================================
  // KIA ENGINES (Same as Hyundai - shared platform)
  // ============================================================================
  "G4FA-K": 1396,   // Kia Rio, Venga
  "G4FC-K": 1368,   // Kia Picanto
  "G4LA-K": 1248,   // Kia Picanto
  "G4FD-K": 1591,   // Kia Ceed, Rio

  // ============================================================================
  // HONDA ENGINES
  // ============================================================================
  "K20": 1998,      // Honda Civic Si, CR-V
  "K24": 2354,      // Honda Accord, CR-V
  "D16": 1590,      // Honda Civic
  "D17": 1668,      // Honda Civic
  "R18": 1799,      // Honda Civic
  "R20": 1997,      // Honda Civic
  "L13": 1339,      // Honda Fit, Insight
  "L15": 1496,      // Honda Fit, Jazz
  "J35": 3471,      // Honda Pilot, Odyssey
  "J37": 3664,      // Honda Accord V6

  // ============================================================================
  // MAZDA ENGINES
  // ============================================================================
  "SKYACTIV-G-1.5": 1496,  // Mazda 2, CX-3
  "SKYACTIV-G-2.0": 1998,  // Mazda 3, CX-5
  "SKYACTIV-G-2.5": 2488,  // Mazda 6, CX-5
  "PE-VPS": 1498,          // Mazda 2, Demio
  "P5-VPS": 1498,          // Mazda 2
  "ZJ-VE": 1298,           // Mazda 2, Demio
  "ZY-VE": 1348,           // Mazda 2

  // ============================================================================
  // NISSAN ENGINES
  // ============================================================================
  "HR16DE": 1598,   // Nissan Sentra, Juke
  "MR20DD": 1997,   // Nissan Qashqai, X-Trail
  "QR25DE": 2488,   // Nissan Altima, Rogue
  "VQ35DE": 3498,   // Nissan Altima, Maxima, 350Z
  "VQ37VHR": 3696,  // Nissan 370Z, Infiniti G37
  "YD25DDTi": 2488, // Nissan Navara, Pathfinder (diesel)

  // ============================================================================
  // VOLKSWAGEN ENGINES
  // ============================================================================
  "EA111": 1390,    // VW Polo, Golf (1.4 TSI)
  "EA211": 999,     // VW Polo, Golf (1.0 TSI)
  "EA888": 1984,    // VW Golf, Passat, Audi A4 (2.0 TSI)
  "EA113": 1781,    // VW Passat, Audi A4 (1.8T)
  "EA827": 1781,    // VW Golf, Jetta (older 1.8)
  "TDI": 1968,      // VW diesel engines (generic)
  "CFNA": 1390,     // VW Golf 1.4 TSI
  "CBZA": 1197,     // VW Polo 1.2 TSI
  "CDAB": 1598,     // VW Golf 1.6 TDI (diesel)

  // ============================================================================
  // BMW ENGINES
  // ============================================================================
  // B38 Family - 3-cylinder 1.5L Turbo (2014+)
  "B38B15A": 1499,  // BMW 218i, 318i, X1 sDrive18i, X2 sDrive18i
  "B38B15B": 1499,  // BMW 218i Active/Gran Tourer (variant)
  "B38B15M0": 1499, // BMW i8 range extender

  // B48 Family - 4-cylinder 2.0L Turbo (2014+)
  "B48B20": 1998,   // BMW 320i, 330i (modern turbo)
  "B48A20": 1998,   // BMW 320i (variant)
  "B48B20O0": 1998, // BMW 330i (high output)

  // B58 Family - 6-cylinder 3.0L Turbo (2015+)
  "B58B30": 2998,   // BMW 340i, M240i (modern single-turbo)
  "B58B30O0": 2998, // BMW M340i (high output)

  // N20 Family - 4-cylinder 2.0L Turbo (2011-2017)
  "N20B20": 1997,   // BMW 320i, 328i (turbo)
  "N20B20O0": 1997, // BMW 328i (high output)

  // N52 Family - 6-cylinder 3.0L NA (2004-2015)
  "N52B30": 2996,   // BMW 330i, X5 (NA)
  "N52B30AF": 2996, // BMW 330i (variant)

  // N54/N55 Family - 6-cylinder 3.0L Turbo (2006-2016)
  "N54B30": 2979,   // BMW 335i, 135i (twin-turbo)
  "N55B30": 2979,   // BMW 335i, X5 (single-turbo)
  "N55B30O0": 2979, // BMW 335i (high output)

  // Diesel Engines
  "M57D30": 2993,   // BMW diesel (3.0d)
  "M47D20": 1995,   // BMW diesel (2.0d)
  "N47D20": 1995,   // BMW diesel (320d, 2007-2015)
  "B47D20": 1995,   // BMW diesel (320d, 2014+)

  // ============================================================================
  // MERCEDES-BENZ ENGINES
  // ============================================================================
  "M276": 3498,     // Mercedes E350, C350, ML350
  "M274": 1991,     // Mercedes C-Class, E-Class (2.0T)
  "M271": 1796,     // Mercedes C-Class, SLK (1.8 Kompressor)
  "M272": 3498,     // Mercedes E-Class, ML-Class
  "OM642": 2987,    // Mercedes diesel (3.0 V6)
  "OM651": 2143,    // Mercedes diesel (2.1 4-cyl)
  "OM646": 2148,    // Mercedes Sprinter diesel
  "M133": 1991,     // Mercedes A45 AMG

  // ============================================================================
  // FORD ENGINES
  // ============================================================================
  "ECOBOOST-1.0": 999,   // Ford Fiesta, Focus (1.0L)
  "ECOBOOST-1.5": 1499,  // Ford Escape, Fusion
  "ECOBOOST-2.0": 1999,  // Ford Edge, Explorer
  "ECOBOOST-2.3": 2261,  // Ford Mustang, Ranger
  "DURATEC-2.5": 2488,   // Ford Fusion, Escape
  "ZETEC": 1596,         // Ford Focus (older)
  "PUMA": 1679,          // Ford Fiesta, Focus (diesel)

  // ============================================================================
  // CHEVROLET / GM ENGINES
  // ============================================================================
  "ECOTEC-1.4": 1364,    // Chevy Cruze, Sonic (turbo)
  "ECOTEC-1.8": 1796,    // Chevy Cruze, Volt
  "ECOTEC-2.4": 2384,    // Chevy Equinox, Malibu
  "LS3": 6162,           // Chevy Corvette, Camaro SS
  "LT1": 6162,           // Chevy Corvette C7
  "LT4": 6162,           // Chevy Corvette Z06 (supercharged)

  // ============================================================================
  // RENAULT ENGINES
  // ============================================================================
  "K7M": 1598,      // Renault Megane, Logan
  "K9K": 1461,      // Renault diesel (dCi)
  "F4R": 1998,      // Renault Megane, Laguna
  "H4M": 999,       // Renault Kwid
  "M9R": 1995,      // Renault diesel (2.0 dCi)

  // ============================================================================
  // PEUGEOT / CITROEN ENGINES
  // ============================================================================
  "TU5JP4": 1587,   // Peugeot 206, 207
  "EP6": 1598,      // Peugeot 308, Citroen C4 (1.6 VTi)
  "DV6": 1560,      // Peugeot/Citroen diesel (1.6 HDi)
  "EB2": 1199,      // Peugeot 208, 2008 (1.2 PureTech)

  // ============================================================================
  // SUBARU ENGINES
  // ============================================================================
  "EJ20": 1994,     // Subaru WRX, Impreza
  "EJ25": 2457,     // Subaru Outback, Forester
  "FA20": 1998,     // Subaru BRZ, WRX
  "FB20": 1995,     // Subaru XV, Forester
  "FB25": 2498,     // Subaru Legacy, Outback

  // ============================================================================
  // MITSUBISHI ENGINES
  // ============================================================================
  "4G63": 1997,     // Mitsubishi Lancer Evolution
  "4G69": 2378,     // Mitsubishi Outlander
  "4B11": 1998,     // Mitsubishi Lancer
  "4D56": 2477,     // Mitsubishi L200 (diesel)
  "3A92": 1193,     // Mitsubishi Mirage

  // ============================================================================
  // SUZUKI ENGINES
  // ============================================================================
  "J20A": 1995,     // Suzuki Grand Vitara, SX4
  "M13A": 1328,     // Suzuki Swift
  "K14B": 1373,     // Suzuki Swift, Vitara
  "K12M": 1197,     // Suzuki Baleno, Swift
  "G13B": 1298,     // Suzuki Swift (older)

  // ============================================================================
  // SKODA / SEAT (VW Group)
  // ============================================================================
  "CAYC": 1598,     // Skoda Octavia 1.6 TDI
  "CBAB": 1197,     // Skoda Fabia 1.2 TSI
  "CJAA": 1968,     // Skoda Superb 2.0 TDI

  // ============================================================================
  // VOLVO ENGINES
  // ============================================================================
  "B4204": 1969,    // Volvo S60, V60 (2.0T)
  "B5254": 2521,    // Volvo S60, XC90 (2.5T)
  "D5244": 2401,    // Volvo diesel (2.4D)

  // ============================================================================
  // COMMON MOTORCYCLE ENGINES (for completeness)
  // ============================================================================
  "CBR600": 599,    // Honda CBR600
  "CBR1000": 998,   // Honda CBR1000RR
  "NINJA650": 649,  // Kawasaki Ninja 650
  "YZF-R1": 998,    // Yamaha YZF-R1
  "GSX-R1000": 999, // Suzuki GSX-R1000
};

/**
 * Lookup engine CC from engine code
 * Returns CC if found, undefined otherwise
 */
export function lookupEngineCC(engineCode: string | undefined | null): number | undefined {
  if (!engineCode) return undefined;

  const code = String(engineCode).trim().toUpperCase();
  if (code.length === 0) return undefined;

  return ENGINE_CC_LOOKUP[code];
}

/**
 * Get all known engine codes (for debugging/admin)
 */
export function getAllKnownEngineCodes(): string[] {
  return Object.keys(ENGINE_CC_LOOKUP).sort();
}

/**
 * Get statistics about the lookup table (for debugging/admin)
 */
export function getLookupTableStats() {
  const entries = Object.entries(ENGINE_CC_LOOKUP);

  const ccValues = entries.map(([_, cc]) => cc);
  const minCC = Math.min(...ccValues);
  const maxCC = Math.max(...ccValues);
  const avgCC = Math.round(ccValues.reduce((a, b) => a + b, 0) / ccValues.length);

  return {
    totalEngines: entries.length,
    minCC,
    maxCC,
    avgCC,
    coverage: {
      under1000cc: ccValues.filter(cc => cc < 1000).length,
      from1000to2000cc: ccValues.filter(cc => cc >= 1000 && cc < 2000).length,
      from2000to3000cc: ccValues.filter(cc => cc >= 2000 && cc < 3000).length,
      over3000cc: ccValues.filter(cc => cc >= 3000).length,
    },
  };
}
