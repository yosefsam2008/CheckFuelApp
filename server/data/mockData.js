// Mock data for fuel stations and prices
// 3 stations: Tel Aviv, Jerusalem, Haifa

const stations = [
  {
    id: "tlv-1",
    name: "Tel Aviv Station 1",
    city: "Tel Aviv",
    coords: { lat: 32.0853, lon: 34.7818 }
  },
  {
    id: "jrs-1",
    name: "Jerusalem Station 1",
    city: "Jerusalem",
    coords: { lat: 31.7683, lon: 35.2137 }
  },
  {
    id: "hf-1",
    name: "Haifa Station 1",
    city: "Haifa",
    coords: { lat: 32.7940, lon: 34.9896 }
  }
];

// Price records for stations -- include timestamps
const now = () => new Date().toISOString();

const prices = {
  "tlv-1": {
    gasoline95: { price: 6.49, currency: "ILS", ts: now() },
    diesel: { price: 5.79, currency: "ILS", ts: now() }
  },
  "jrs-1": {
    gasoline95: { price: 6.55, currency: "ILS", ts: now() },
    diesel: { price: 5.85, currency: "ILS", ts: now() }
  },
  "hf-1": {
    gasoline95: { price: 6.60, currency: "ILS", ts: now() },
    diesel: { price: 5.70, currency: "ILS", ts: now() }
  }
};

module.exports = { stations, prices };
