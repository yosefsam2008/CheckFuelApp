// app/fuelData.ts

/**
 * תרגום שמות מותגים מעברית לאנגלית
 */
export function translateBrandToEnglish(hebrewBrand: string): string {
  const brandMap: Record<string, string> = {
    'טויוטה': 'Toyota',
    'הונדה': 'Honda',
    'מאזדה': 'Mazda',
    'ניסאן': 'Nissan',
    'סובארו': 'Subaru',
    'מיצובישי': 'Mitsubishi',
    'קיא': 'Kia',
    'יונדאי': 'Hyundai',
    'פולקסווגן': 'Volkswagen',
    'סקודה': 'Skoda',
    'סיאט': 'Seat',
    'אאודי': 'Audi',
    'מרצדס': 'Mercedes-Benz',
    'ב.מ.וו': 'BMW',
    'פורשה': 'Porsche',
    'רנו': 'Renault',
    'פיג\'ו': 'Peugeot',
    'סיטרואן': 'Citroen',
    'פיאט': 'Fiat',
    'אלפא רומיאו': 'Alfa Romeo',
    'פורד': 'Ford',
    'פורד גרמניה': 'Ford',
    'שברולט': 'Chevrolet',
    'דודג\'': 'Dodge',
    'ג\'יפ': 'Jeep',
    'טסלה': 'Tesla',
    'לקסוס': 'Lexus',
    'אינפיניטי': 'Infiniti',
    'אקורה': 'Acura',
    'לנד רובר': 'Land Rover',
    'ג\'גואר': 'Jaguar',
    'וולוו': 'Volvo',
    'מיני': 'Mini',
    'מזראטי': 'Maserati',
    'קדילק': 'Cadillac',
    'לינקולן': 'Lincoln',
    'ביואיק': 'Buick',
    'ג\'י.אמ.סי': 'GMC',
    'ראם': 'Ram',
    'קרייזלר': 'Chrysler',
  };

  const normalized = hebrewBrand.trim();
  return brandMap[normalized] || hebrewBrand;
}

// 🔧 הגדר את ה-URL של ה-Vercel proxy שלך כאן
const VERCEL_PROXY_URL = 'https://carquery-proxy.vercel.app/api/fuel-economy';

/**
 * שליפת נתוני צריכת דלק מ-FuelEconomy.gov API
 * @returns km/L או undefined
 */
export async function fetchFuelEconomyKmPerL(
  make: string,
  model: string,
  year?: number
): Promise<number | undefined> {
  try {
    if (!make || !model) {
      console.log('❌ Missing make or model');
      return undefined;
    }

    const y = year ?? new Date().getFullYear();

    // STEP 1: חיפוש אפשרויות רכב דרך Vercel Proxy (עם JSON)
    const searchUrl = 
      `${VERCEL_PROXY_URL}?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${y}`;

    console.log(`🔍 FuelEconomy (via Vercel) - Searching: ${make} ${model} ${y}`);

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      console.log(`❌ FuelEconomy - Search failed: ${searchRes.status}`);
      return undefined;
    }

    const searchData = await searchRes.json();

    // נתיב אל האופציות ב-JSON
    const menuItems = searchData?.menuItem;
    if (!menuItems || !Array.isArray(menuItems) || menuItems.length === 0) {
      console.log('❌ FuelEconomy - No menu items found');
      return undefined;
    }

    // קח את האופציה הראשונה
    const firstOption = menuItems[0];
    const vehicleId = firstOption?.value;

    if (!vehicleId) {
      console.log('❌ FuelEconomy - No vehicle ID found');
      return undefined;
    }

    console.log(`✅ FuelEconomy - Found vehicle ID: ${vehicleId}`);

    // STEP 2: שליפת נתוני הרכב המלאים דרך Vercel Proxy
    const dataUrl = `${VERCEL_PROXY_URL}?vehicleId=${vehicleId}`;

    const dataRes = await fetch(dataUrl);
    if (!dataRes.ok) {
      console.log(`❌ FuelEconomy - Data fetch failed: ${dataRes.status}`);
      return undefined;
    }

    const vehicleData = await dataRes.json();

    // comb08 = Combined MPG (city + highway average)
    const mpg = parseFloat(vehicleData?.comb08);

    if (!mpg || mpg <= 0) {
      console.log('❌ FuelEconomy - Invalid MPG value');
      return undefined;
    }

    console.log(`✅ FuelEconomy - MPG from API: ${mpg}`);

    // המרה מ-MPG ל-km/L
    // 1 MPG (US) = 0.425144 km/L
    const kmPerL = mpg * 0.425144;
    const rounded = Number(kmPerL.toFixed(2));

    console.log(`✅ FuelEconomy - Final result: ${rounded} km/L`);

    return rounded;
  } catch (err) {
    console.error('❌ FuelEconomy API error:', err);
    return undefined;
  }
}