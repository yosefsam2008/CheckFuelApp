// api/fuel-economy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { make, model, year, vehicleId } = req.query;

    // אם יש vehicleId - שלב 2 (קבלת נתוני הרכב)
    if (vehicleId) {
      const apiUrl = `https://www.fueleconomy.gov/ws/rest/vehicle/${vehicleId}?format=json`;
      console.log('📡 Fetching vehicle data:', apiUrl);

      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          error: 'Failed to fetch vehicle data',
          status: response.status 
        });
      }

      const jsonData = await response.json();
      
      // Cache למשך 7 ימים (נתונים סטטיים)
      res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate');
      return res.status(200).json(jsonData);
    }

    // אם יש make & model - שלב 1 (חיפוש vehicle ID)
    if (!make || !model) {
      return res.status(400).json({ 
        error: 'Missing required parameters: make and model' 
      });
    }

    const y = year || new Date().getFullYear();
    const searchUrl = 
      `https://www.fueleconomy.gov/ws/rest/vehicle/menu/options` +
      `?year=${y}&make=${encodeURIComponent(String(make))}&model=${encodeURIComponent(String(model))}&format=json`;

    console.log('🔍 Searching vehicles:', searchUrl);

    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      return res.status(searchResponse.status).json({ 
        error: 'Failed to search vehicles',
        status: searchResponse.status 
      });
    }

    const jsonData = await searchResponse.json();
    
    // Cache למשך יום אחד
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return res.status(200).json(jsonData);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}