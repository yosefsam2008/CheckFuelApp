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
 * Calculate national average price from all records
 */
function calculateAveragePrice(
  records: any[],
  fieldName: string
): { average: number; count: number } | null {
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  const prices: number[] = [];

  // Helper to normalize various numeric formats (commas, currency, whitespace)
  const normalizeNumber = (val: any): number => {
    if (val == null) return NaN;
    if (typeof val === 'number') return val;
    // Remove non numeric except dot and comma and minus
    const s = String(val).replace(/[^0-9.,-]/g, '').trim();
    if (s === '') return NaN;
    // Replace comma with dot when comma used as decimal separator
    const dotified = s.indexOf(',') > -1 && s.indexOf('.') === -1 ? s.replace(/,/g, '.') : s.replace(/,/g, '');
    return parseFloat(dotified);
  };

  // If the expected field exists in records, prefer it
  const firstHasField = records.some((r) => Object.prototype.hasOwnProperty.call(r, fieldName));

  if (firstHasField) {
    records.forEach((record) => {
      const priceValue = normalizeNumber(record[fieldName]);
      if (!isNaN(priceValue) && priceValue > 0) prices.push(priceValue);
    });
  } else {
    // Fallback: try to autodetect the most likely numeric price field
    const keyCounts: Record<string, number> = {};
    records.forEach((record) => {
      Object.keys(record).forEach((k) => {
        const v = normalizeNumber(record[k]);
        if (!isNaN(v) && v > 0) {
          keyCounts[k] = (keyCounts[k] || 0) + 1;
        }
      });
    });

    // Choose the key that has the most numeric values
    const candidate = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0];
    const detectedKey = candidate ? candidate[0] : null;

    if (detectedKey) {
      records.forEach((record) => {
        const priceValue = normalizeNumber(record[detectedKey]);
        if (!isNaN(priceValue) && priceValue > 0) prices.push(priceValue);
      });
    }
  }

  if (prices.length === 0) {
    return null;
  }

  const sum = prices.reduce((acc, p) => acc + p, 0);
  const average = sum / prices.length;

  return {
    average: parseFloat(average.toFixed(2)),
    count: prices.length,
  };
}

/**
 * Try to extract the most recent timestamp from records.
 * Supports common field names in English and Hebrew.
 */
function extractLatestTimestamp(records: any[]): string | null {
  if (!Array.isArray(records) || records.length === 0) return null;

  const candidateFields = ['date', 'Date', 'timestamp', 'time', 'created_at', 'updated_at', 'תאריך', 'עדכון', 'datetime'];

  let latestTs: number | null = null;

  records.forEach((record) => {
    candidateFields.forEach((f) => {
      if (!record) return;
      const v = record[f];
      if (!v) return;
      const parsed = Date.parse(String(v));
      if (!isNaN(parsed)) {
        if (latestTs === null || parsed > latestTs) latestTs = parsed;
      }
    });
  });

  if (latestTs !== null) {
    return new Date(latestTs).toISOString();
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

    // Calculate national average price
    const priceData = calculateAveragePrice(records, fieldName);
    if (!priceData) {
      throw new Error('Could not calculate average price from records');
    }

    // Try to extract a timestamp from the records (if present)
    const derivedTimestamp = extractLatestTimestamp(records) || new Date().toISOString();

    // Return success response with official national average
    return res.status(200).json({
      price: priceData.average,
      currency: 'ILS',
      fuel_type: fuelType,
      timestamp: derivedTimestamp,
      station_count: priceData.count,
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
