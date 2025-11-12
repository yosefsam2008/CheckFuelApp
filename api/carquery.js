export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { brand, model, year } = req.query;
    const brandStr = Array.isArray(brand) ? brand[0] : brand;
    const modelStr = Array.isArray(model) ? model[0] : model;
    const yearStr = Array.isArray(year) ? year[0] : year;

    if (!brandStr || !modelStr) {
      return res.status(400).json({ 
        error: 'Missing required parameters: brand and model' 
      });
    }

    const params = new URLSearchParams({
      cmd: 'getTrims',
      make: brandStr,
      model: modelStr,
      full_results: '1'
    });

    if (yearStr) {
      params.append('year', yearStr);
    }

    const carQueryUrl = `https://www.carqueryapi.com/api/0.3/?${params.toString()}`;
    const response = await fetch(carQueryUrl);
    
    if (!response.ok) {
      throw new Error(`CarQuery API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.Trims || data.Trims.length === 0) {
      return res.status(200).json({
        trimsFound: 0,
        trimsWithData: 0,
        computedKmPerL: null,
        message: 'No trims found for this vehicle'
      });
    }

    let totalMpg = 0;
    let count = 0;

    for (const trim of data.Trims) {
      const mpgMixed = parseFloat(trim.model_engine_fuel_mpg_mixed);
      const mpgCity = parseFloat(trim.model_engine_fuel_city);
      const mpgHwy = parseFloat(trim.model_engine_fuel_hwy);

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

    const avgMpg = totalMpg / count;
    const kmPerL = avgMpg * 0.425144;

    return res.status(200).json({
      trimsFound: data.Trims.length,
      trimsWithData: count,
      computedKmPerL: Math.round(kmPerL * 100) / 100,
      avgMpg: Math.round(avgMpg * 100) / 100,
      brand: brandStr,
      model: modelStr,
      year: yearStr || 'all years'
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch vehicle data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}