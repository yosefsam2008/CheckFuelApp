import { calculateEVConsumptionAdvanced } from './advancedEvConsumption';

/**
 * טסטר מורחב המבוסס על image_51e960.jpg
 * בודק סנכרון בין רכבי יוקרה, משקלים כבדים וסוגי הנעה
 */

interface TestVehicle {
  plate: string;
  brand: string;
  model: string;
  year: number;
  isPhev: boolean;
  mishkalKolel: number;
}

const luxuryDatabase: TestVehicle[] = [
  // --- סדרת BMW 745e (ספינות דגל - Luxury + Heavy PHEV) ---
  { plate: "59750001", brand: "BMW", model: "745e PURE EXCELLENCE", year: 2020, isPhev: true, mishkalKolel: 2655 },
  { plate: "59711101", brand: "BMW", model: "745e PURE EXCELLENCE", year: 2019, isPhev: true, mishkalKolel: 2655 },
  { plate: "59555001", brand: "BMW", model: "745e M-SPORT", year: 2019, isPhev: true, mishkalKolel: 2655 },
  
  // --- סדרת BMW 530e (מנהלים - Luxury + Mid-Weight PHEV) ---
  { plate: "59520001", brand: "BMW", model: "530e M-SPORT", year: 2019, isPhev: true, mishkalKolel: 2420 },
  { plate: "59533301", brand: "BMW", model: "530e EXCLUSIVE", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59541201", brand: "BMW", model: "530e EXCLUSIVE", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59558701", brand: "BMW", model: "530e EXCLUSIVE", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59776401", brand: "BMW", model: "530e EXCLUSIVE", year: 2019, isPhev: true, mishkalKolel: 2350 },
  
  // --- מרצדס A-Class (Compact Sleek - בונוס אווירודינמי) ---
  { plate: "59824903", brand: "Mercedes-Benz", model: "A250e PREMIUM", year: 2024, isPhev: true, mishkalKolel: 2155 },
  { plate: "59814303", brand: "Mercedes-Benz", model: "A250e AMG PLUS", year: 2024, isPhev: true, mishkalKolel: 2155 },
  
  // --- מיני (Boxy Design - קנס אווירודינמי) ---
  { plate: "59585601", brand: "Mini", model: "Countryman SE", year: 2019, isPhev: true, mishkalKolel: 2270 },
  { plate: "59845501", brand: "Mini", model: "Countryman SE", year: 2019, isPhev: true, mishkalKolel: 2270 },
  
  // --- סקודה (Efficient Sedan PHEV) ---
  { plate: "59847102", brand: "Skoda", model: "Superb iV SPORT", year: 2021, isPhev: true, mishkalKolel: 2259 },
  { plate: "59844502", brand: "Skoda", model: "Superb iV STYLE", year: 2021, isPhev: true, mishkalKolel: 2259 },
  
  // --- פורשה (Extreme Luxury & Performance) ---
  { plate: "59882802", brand: "Porsche", model: "Cayenne E-Hybrid", year: 2021, isPhev: true, mishkalKolel: 3030 },
  { plate: "59875502", brand: "Porsche", model: "Taycan Cross Turismo", year: 2021, isPhev: false, mishkalKolel: 2885 },

  // --- דגימות נוספות מהטבלה ---
  { plate: "59606601", brand: "BMW", model: "530e", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59602401", brand: "BMW", model: "530e", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59615801", brand: "BMW", model: "530e", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59658301", brand: "BMW", model: "530e", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59632601", brand: "BMW", model: "530e", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59623701", brand: "BMW", model: "330e", year: 2019, isPhev: true, mishkalKolel: 2300 },
  { plate: "59640001", brand: "BMW", model: "330e", year: 2019, isPhev: true, mishkalKolel: 2300 },
  { plate: "59818801", brand: "BMW", model: "530e", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59700001", brand: "BMW", model: "530e", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59920001", brand: "BMW", model: "745e", year: 2019, isPhev: true, mishkalKolel: 2655 },
  { plate: "59828301", brand: "BMW", model: "530e", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59555501", brand: "BMW", model: "745e", year: 2019, isPhev: true, mishkalKolel: 2655 },
  { plate: "59740001", brand: "BMW", model: "530e", year: 2019, isPhev: true, mishkalKolel: 2350 },
  { plate: "59970501", brand: "BMW", model: "745e", year: 2019, isPhev: true, mishkalKolel: 2655 }
];

async function runLuxuryTestRunner() {
  console.log("💎 STARTING ULTIMATE LUXURY & PERFORMANCE TESTER");
  console.log("============================================================\n");

  for (const v of luxuryDatabase) {
    const result = await calculateEVConsumptionAdvanced({
      brand: v.brand,
      model: v.model,
      year: v.year,
      vehicleType: 'car',
      mishkal_kolel: v.mishkalKolel,
      isPhev: v.isPhev
    });

    const kwhPerKm = (result.kwhPer100Km / 100).toFixed(4);
    const isHeavy = v.mishkalKolel > 2400 ? "⚖️ HEAVY" : "🚗 LIGHT";
    
    console.log(`🆔 [${v.plate}] ${v.brand} ${v.model} (${v.year}) | ${isHeavy}`);
    console.log(`   Consumption: ${result.kwhPer100Km} kWh/100km`);
    console.log(`   App Value: ${kwhPerKm} kWh/km ⚡`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    
    // בדיקת שפיות (Sanity Check)
    if (v.brand === "Porsche" && result.kwhPer100Km < 22) {
      console.warn("⚠️  WARNING: Porsche consumption seems too low!");
    }
    
    console.log("------------------------------------------------------------");
  }

  console.log("\n✅ ALL 30 LUXURY TESTS COMPLETED.");
}

runLuxuryTestRunner();