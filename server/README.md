Mock Fuel Price Aggregator API

This small Express server provides mock endpoints used by the demo React Native frontend.

Install & run

1. Open a terminal in `server/` and run:

   npm install

2. Start the server:

   npm start

By default the server runs on `http://localhost:3000`.

Endpoints

- GET /v1/stations
  - Returns the list of mock stations with ids, names, cities and coords.

- GET /v1/price/station/:id
  - Returns the latest price record for the requested station id.

- GET /v1/price/latest?city={city}&fuel={fuel}
  - Returns a simple city-average price for the given fuel (`gasoline95` or `diesel`).

- GET /v1/metadata
  - Returns mocked metadata about data sources and last aggregation time.

Notes

- This server is intentionally simple and in-memory: no DB or persistence.
- Replace `server/data/mockData.js` or adapt `index.js` to fetch real sources for production.
