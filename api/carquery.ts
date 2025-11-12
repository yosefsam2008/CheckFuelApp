// api/carquery.ts
// Vercel Serverless Function לחיבור עם CarQuery API
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * המרה מ-MPG (miles per gallon) ל-km/L (קילומטר לליטר)
 * 1 MPG = 0.425144 km/L
 */
function mpgToKmPerL(mpg: number): number {
  return mpg * 0.425144;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // רק GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { brand, model, year } = req.query;

    // ולידציה בסיסית
    if (!brand || !model) {
      return res.status(400).json({ 
        error: 'Missing required parameters: brand and model' 
      });
    }

    console.log(`🔍 Searching for: ${brand} ${model} ${year || 'any year'}`);

    // בניית URL ל-CarQuery API
    const params = new URLSearchParams({
      cmd: 'getTrims',
      make: brand,
      model: model,
      full_results: '1'
    });

    if (year) {
      params.append('year', year);
    }

    const carQueryUrl = `https://www.carqueryapi.com/api/0.3/?${params.toString()}`;
    console.log(`📡 CarQuery URL: ${carQueryUrl}`);

    // קריאה ל-CarQuery API
    const response = await fetch(carQueryUrl);
    
    if (!response.ok) {
      throw new Error(`CarQuery API returned ${response.status}`);
    }

    const data = await response.json();
    console.log(`📦 Received ${data.Trims?.length || 0} trims`);

    // אם אין תוצאות
    if (!data.Trims || data.Trims.length === 0) {
      return res.status(200).json({
        trimsFound: 0,
        trimsWithData: 0,
        computedKmPerL: null,
        message: 'No trims found for this vehicle'
      });
    }

    // חישוב ממוצע צריכת דלק
    let totalMpg = 0;
    let count = 0;

    for (const trim of data.Trims) {
      // CarQuery מחזיר model_engine_fuel_mpg_mixed או דומה
      const mpgMixed = parseFloat(trim.model_engine_fuel_mpg_mixed);
      const mpgCity = parseFloat(trim.model_engine_fuel_city);
      const mpgHwy = parseFloat(trim.model_engine_fuel_hwy);

      // נעדיף mixed, אחרת ממוצע של city+hwy
      let mpg = mpgMixed;
      if (!mpg && mpgCity && mpgHwy) {
        mpg = (mpgCity + mpgHwy) / 2;
      }

      if (mpg && mpg > 0) {
        totalMpg += mpg;
        count++;
      }
    }

    if (count === 0) {
      return res.status(200).json({
        trimsFound: data.Trims.length,
        trimsWithData: 0,
        computedKmPerL: null,
        message: 'No fuel consumption data found'
      });
    }

    // חישוב ממוצע והמרה מ-MPG ל-km/L
    const avgMpg = totalMpg / count;
    const kmPerL = avgMpg * 0.425144; // המרה מ-MPG (US) ל-km/L

    console.log(`✅ Computed: ${kmPerL.toFixed(2)} km/L from ${count} trims`);

    return res.status(200).json({
      trimsFound: data.Trims.length,
      trimsWithData: count,
      computedKmPerL: Math.round(kmPerL * 100) / 100, // עיגול ל-2 ספרות
      avgMpg: Math.round(avgMpg * 100) / 100,
      brand,
      model,
      year: year || 'all years'
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch vehicle data',
      details: error.message 
    });
  }
}