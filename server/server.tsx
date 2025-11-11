// server/server.ts
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/api/carquery", async (req, res) => {
  try {
    const brand = req.query.brand?.toString();
    const model = req.query.model?.toString();
    const year = req.query.year?.toString();

    if (!brand || !model) return res.status(400).json({ error: "Missing brand or model" });

    const yearParam = year ? `&year=${encodeURIComponent(year)}` : "";
    const url = `https://www.carqueryapi.com/api/0.3/?cmd=getTrims&make=${encodeURIComponent(
      brand
    )}&model=${encodeURIComponent(model)}${yearParam}&full_results=1`;

    const response = await fetch(url);
    const text = await response.text();
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) return res.status(500).json({ error: "Invalid CarQuery response" });

    const data = JSON.parse(jsonMatch[0]);
    const trims = data?.Trims ?? [];

    res.json({ Trims: trims });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
