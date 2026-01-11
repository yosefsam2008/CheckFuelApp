// api/fuel-economy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { XMLParser } from 'fast-xml-parser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ⚡ CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { make, model, year, vehicleId } = req.query;

    if (!make && !vehicleId) {
      return res.status(400).json({ error: 'Missing required parameters: make or vehicleId' });
    }

    const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true });

    // 🔹 שלב 2 - אם יש vehicleId, שליפת נתונים ספציפיים
    if (vehicleId) {
      const apiUrl = `https://www.fueleconomy.gov/ws/rest/vehicle/${vehicleId}`;
      console.log('📡 Fetching vehicle data:', apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch vehicle data', status: response.status });
      }

      const xmlData = await response.text();
      const jsonData = parser.parse(xmlData);

      const fuelData = {
        cityMPG: jsonData.vehicle?.city08,
        highwayMPG: jsonData.vehicle?.highway08,
        combinedMPG: jsonData.vehicle?.comb08,
      };

      res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate'); // Cache שבוע
      return res.status(200).json({ vehicle: jsonData.vehicle, fuel: fuelData });
    }

    // 🔹 שלב 1 - חיפוש vehicleId לפי make & model
    if (!model) {
      return res.status(400).json({ error: 'Missing required parameter: model' });
    }

    const y = year || new Date().getFullYear();
    const searchUrl = `https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year=${y}&make=${encodeURIComponent(String(make))}&model=${encodeURIComponent(String(model))}`;
    console.log('🔍 Searching vehicles:', searchUrl);

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      return res.status(searchResponse.status).json({ error: 'Failed to search vehicles', status: searchResponse.status });
    }

    const xmlData = await searchResponse.text();
    const jsonData = parser.parse(xmlData);

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // Cache יום
    return res.status(200).json(jsonData);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
