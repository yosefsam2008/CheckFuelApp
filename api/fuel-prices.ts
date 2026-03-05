// api/fuel-prices.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function: Fuel Price Proxy
 * 
 * This function acts as a CORS-friendly proxy for the Data.gov.il fuel price API.
 * It fetches official Israeli government fuel prices and returns them as clean JSON.
 * 
 * Query Parameters:
 *   - type: "gasoline" or "diesel" (required)
 * 
 * Response:
 *   - 200 OK: { price: number, currency: string, fuel_type: string, timestamp: string, station_count: number }
 *   - 400 Bad Request: { error: string }
 *   - 503 Service Unavailable: { error: string, fallback_price: number }
 */

// Data.gov.il Resource IDs for official fuel prices
const RESOURCE_IDS = {
  gasoline: '1c77faf0-88fc-4a0d-87eb-a4fa0c2a7e7f',
  diesel: 'ffc58ac3-82e5-4bb0-98f3-8e1b29bc1cc0',
} as const;

// Field names in the API response (Hebrew)
const FIELD_NAMES = {
  gasoline: 'בנזין 95',
  diesel: 'סולר',
} as const;

// Fallback prices (default if API fails) in Israeli Shekel (₪)
const FALLBACK_PRICES = {
  gasoline: 6.5,
  diesel: 5.8,
} as const;

// API endpoint constants
const DATA_GOV_IL_API = 'https://www.data.gov.il/api/3/action/datastore_search';
const API_TIMEOUT = 5000; // 5 seconds timeout

/**
 * Fetch fuel prices from Data.gov.il with timeout protection
 */
async function fetchFromDataGovIl(resourceId: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const url = new URL(DATA_GOV_IL_API);
    url.searchParams.append('resource_id', resourceId);
    url.searchParams.append('limit', '5000');
    url.searchParams.append('sort', 'date desc');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // Use a common browser User-Agent to avoid bot/JS challenge pages
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://data.gov.il/',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from Data.gov.il`);
    }

    const data = await response.json();
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * שולף את המחיר העדכני ביותר (הראשון התקין) במקום לחשב ממוצע היסטורי
 * רץ בסיבוכיות O(1) במקום O(N)
 */
function getLatestValidPrice(
  records: any[],
  fieldName: string
): { price: number; timestamp: string } | null {
  if (!Array.isArray(records) || records.length === 0) return null;

  // פונקציית עזר לניקוי המספר
  const normalizeNumber = (val: any): number => {
    if (val == null) return NaN;
    if (typeof val === 'number') return val;
    const s = String(val).replace(/[^0-9.,-]/g, '').trim();
    if (s === '') return NaN;
    const dotified = s.indexOf(',') > -1 && s.indexOf('.') === -1 ? s.replace(/,/g, '.') : s.replace(/,/g, '');
    return parseFloat(dotified);
  };

  const candidateTimestampFields = ['date', 'Date', 'timestamp', 'time', 'תאריך', 'עדכון'];

  // עוברים על הרשומות (הן כבר ממוינות מהחדש לישן מה-API)
  for (const record of records) {
    let priceValue = normalizeNumber(record[fieldName]);
    
    // Fallback: אם אין שדה מדויק, נחפש ערך מספרי סביר למחיר דלק (בין 4 ל-15 שקלים)
    if (isNaN(priceValue) || priceValue <= 0) {
      for (const key of Object.keys(record)) {
        const v = normalizeNumber(record[key]);
        if (!isNaN(v) && v > 4 && v < 15) {
          priceValue = v;
          break;
        }
      }
    }

    // ברגע שמצאנו את המחיר התקין הראשון (הכי חדש), אנחנו מחזירים אותו מיד ויוצאים מהלולאה!
    if (!isNaN(priceValue) && priceValue > 0) {
      let timestamp = new Date().toISOString();
      for (const f of candidateTimestampFields) {
        if (record[f] && !isNaN(Date.parse(String(record[f])))) {
          timestamp = new Date(String(record[f])).toISOString();
          break;
        }
      }

      return { 
        price: parseFloat(priceValue.toFixed(2)), 
        timestamp 
      };
    }
  }

  return null;
}

/**
 * Main handler function
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS for React Native and web clients
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'max-age=300, public'); // Cache for 5 minutes

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Extract and validate fuel type parameter
    const fuelType = (req.query.type as string)?.toLowerCase();

    if (!fuelType || !['gasoline', 'diesel'].includes(fuelType)) {
      return res.status(400).json({
        error: 'Invalid or missing fuel type. Use "gasoline" or "diesel".',
      });
    }

    // Get resource ID and field name for the requested fuel type
    const resourceId = RESOURCE_IDS[fuelType as keyof typeof RESOURCE_IDS];
    const fieldName = FIELD_NAMES[fuelType as keyof typeof FIELD_NAMES];

    // Fetch data from Data.gov.il
    let apiData: any;
    try {
      apiData = await fetchFromDataGovIl(resourceId);
    } catch (fetchError: any) {
      console.error('Data.gov.il API Error:', fetchError.message);
      
      // Return fallback price if API fails
      const fallbackPrice = FALLBACK_PRICES[fuelType as keyof typeof FALLBACK_PRICES];
      return res.status(503).json({
        error: 'Unable to fetch live prices from Data.gov.il',
        fallback_price: fallbackPrice,
        currency: 'ILS',
        fuel_type: fuelType,
        timestamp: new Date().toISOString(),
        note: 'Using fallback price due to service unavailability',
      });
    }

    // Extract and validate records
    const records = apiData?.result?.records;
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('No records found in API response');
    }

    // חילוץ המחיר העדכני ביותר (הראשון התקין במערך הממוין)
    const latestPriceData = getLatestValidPrice(records, fieldName);
    if (!latestPriceData) {
      throw new Error('Could not find a valid latest price in the records');
    }

    // Return success response with official current price
    return res.status(200).json({
      price: latestPriceData.price,
      currency: 'ILS',
      fuel_type: fuelType,
      timestamp: latestPriceData.timestamp,
      data_source: 'data.gov.il',
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);

    // Return 500 for unexpected errors
    return res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
