// app/fuelData.ts

export type FuelType = "Electric" | "Gasoline" | "Diesel";

export interface FuelRecord {
  brand: string;
  model: string;
  year: number;
  fuelType: FuelType;
  kmPerL?: number;
  batteryCapacityKWh?: number;
  rangeKm?: number;
}

/** מילון תרגום מותגים מעברית לאנגלית */
export const brandTranslations: Record<string, string> = {
  "טויוטה": "Toyota",
  "הונדה": "Honda",
  "פורד גרמניה": "Ford",
  "פורד": "Ford",
  "שברולט ישראל": "Chevrolet",
  "ג'נרל מוטורס": "General Motors",
  "שברולט": "Chevrolet",
  "יונדאי": "Hyundai",
  "קיא": "Kia",
  "קיה": "Kia",
  "מאזדה": "Mazda",
  "מיצובישי": "Mitsubishi",
  "ניסאן": "Nissan",
  "פולקסווגן": "Volkswagen",
  "סקודה": "Skoda",
  "פיג'ו": "Peugeot",
  "סיטרואן": "Citroen",
  "ב.מ.וו": "BMW",
  "מרצדס": "Mercedes-Benz",
  "אאודי": "Audi",
  "סובארו": "Subaru",
  "סוזוקי": "Suzuki",
  "לנד רובר": "Land Rover",
  "ג'יפ": "Jeep",
  "שיאן": "Chery",
  "דאצ'יה": "Dacia",
  "פיאט": "Fiat",
  "מיני": "Mini",
  "וולוו": "Volvo",
  "אינפיניטי": "Infiniti",
  "לקסוס": "Lexus",
  "טסלה": "Tesla",
  "רנו": "Renault",
  "מזראטי": "Maserati",
  "אלפא רומיאו": "Alfa Romeo",
  "סאנגיונג": "SsangYong",
  "מרצדס בנץ": "Mercedes-Benz",
  "סיאט": "Seat",
  "דייהו": "Daewoo",
  "אופל": "Opel",
  "טאטה": "Tata",
};

/** תרגום מותג מעברית לאנגלית */
export function translateBrandToEnglish(brandHe: string): string {
  const trimmed = brandHe.trim();
  return brandTranslations[trimmed] || trimmed;
}

/**
 * Fetch fuel consumption from CarQuery API via your Vercel serverless function
 * Returns km/L or undefined if not found
 */
export async function fetchCarQueryKmPerL(
  brand: string,
  model: string,
  year?: string | number,
  vehicleType?: 'car' | 'motorcycle' | 'truck'
): Promise<number | undefined> {
  try {
    const cleanBrand = brand.trim();
    const cleanModel = model.trim();
    
    if (!cleanBrand || !cleanModel) {
      console.log('❌ CarQuery: חסר מותג או דגם');
      return undefined;
    }

    const params = new URLSearchParams({ 
      brand: cleanBrand, 
      model: cleanModel 
    });
    
    if (year) {
      params.append("year", String(year));
    }

    // ⭐ תקן את ה-URL הזה לפי ה-deployment האמיתי שלך ב-Vercel!
    // לדוגמה: https://check-fuel-app.vercel.app
    // או: https://check-fuel-app-git-main-yosefs-projects.vercel.app
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "https://check-fuel-app.vercel.app";
    const url = `${baseUrl}/api/carquery?${params.toString()}`;
    
    console.log(`🔍 CarQuery: מחפש ${cleanBrand} ${cleanModel} ${year || ''}`);
    console.log(`📡 URL: ${url}`);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ CarQuery API error ${res.status}: ${errorText}`);
      return undefined;
    }

    const data = await res.json();
    console.log('📦 CarQuery response:', JSON.stringify(data, null, 2));
    
    if (data.computedKmPerL && typeof data.computedKmPerL === 'number' && data.computedKmPerL > 0) {
      console.log(`✅ CarQuery מצא: ${data.computedKmPerL} km/L`);
      console.log(`   📊 מבוסס על ${data.trimsWithData}/${data.trimsFound} גרסאות`);
      return data.computedKmPerL;
    }
    
    console.log('❌ CarQuery: לא נמצאו נתוני צריכה');
    if (data.message) {
      console.log(`   💬 ${data.message}`);
    }
    return undefined;

  } catch (err) {
    console.error("❌ fetchCarQueryKmPerL failed:", err);
    if (err instanceof Error) {
      console.error("   פרטי שגיאה:", err.message);
    }
    return undefined;
  }
}