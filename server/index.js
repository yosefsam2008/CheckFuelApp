/*
  Mock Fuel Price Aggregator API
  - GET /v1/stations
  - GET /v1/price/station/:id
  - GET /v1/price/latest?city={city}&fuel={fuel}
  - GET /v1/metadata

  This is a simple Express server serving mock data for demo purposes.
*/

const express = require('express');
const cors = require('cors');
const { stations, prices } = require('./data/mockData');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper: compute average for given city and fuel
function averagePriceByCity(city, fuel) {
  const cityStations = stations.filter(s => s.city.toLowerCase() === city.toLowerCase());
  if (!cityStations.length) return null;
  const values = [];
  cityStations.forEach(s => {
    const rec = prices[s.id];
    if (!rec) return;
    if (fuel === 'gasoline95' && rec.gasoline95) values.push(rec.gasoline95.price);
    if (fuel === 'diesel' && rec.diesel) values.push(rec.diesel.price);
  });
  if (!values.length) return null;
  const sum = values.reduce((a,b) => a + b, 0);
  return sum / values.length;
}

// GET /v1/stations -> list of stations
app.get('/v1/stations', (req, res) => {
  // Return station basic info
  res.json({
    source: 'mock',
    count: stations.length,
    stations
  });
});

// GET /v1/price/station/:id -> latest prices for station
app.get('/v1/price/station/:id', (req, res) => {
  const id = req.params.id;
  const record = prices[id];
  if (!record) {
    return res.status(404).json({ error: 'Station not found' });
  }
  return res.json({ stationId: id, prices: record });
});

// GET /v1/price/latest?city={city}&fuel={fuel}
app.get('/v1/price/latest', (req, res) => {
  const city = req.query.city;
  const fuel = req.query.fuel; // expected 'gasoline95' or 'diesel'
  if (!city || !fuel) {
    return res.status(400).json({ error: 'Missing city or fuel query param' });
  }
  const avg = averagePriceByCity(city, fuel);
  if (avg === null) {
    return res.status(404).json({ error: 'No data for given city/fuel' });
  }
  return res.json({ city, fuel, average: parseFloat(avg.toFixed(3)), currency: 'ILS' });
});

// GET /v1/metadata -> sources + update info
app.get('/v1/metadata', (req, res) => {
  const metadata = {
    sources: [
      {
        id: 'GlobalPetrolPrices',
        description: 'Country-level average prices (simulated)',
        update_frequency: 'weekly',
        url: 'https://www.globalpetrolprices.com/'
      },
      {
        id: 'GasStop',
        description: 'Station-level info and user reports (mocked)',
        update_frequency: 'hourly (simulated)',
        url: 'https://example.com/gasstop'
      },
      {
        id: 'MinistryOfEnergy',
        description: 'Official station list and locations (mocked)',
        update_frequency: 'monthly (simulated)',
        url: 'https://www.gov.il/en/departments/ministry_of_energy'
      }
    ],
    last_aggregated: new Date().toISOString(),
    note: 'This is mock metadata for demo. Replace with real sources in production.'
  };
  res.json(metadata);
});

app.listen(PORT, () => {
  console.log(`Mock Fuel Aggregator API running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('- GET /v1/stations');
  console.log('- GET /v1/price/station/:id');
  console.log('- GET /v1/price/latest?city={city}&fuel={fuel}');
  console.log('- GET /v1/metadata');
});

/*
  Notes for later:
  - To replace mock data with real APIs, implement a fetch/ETL step that
    periodically queries legal data sources and updates the `prices` store
    (or a persistent DB).
  - Ensure you have legal rights or API agreements before scraping or using
    third-party data.
*/
