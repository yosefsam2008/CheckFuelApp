export async function fetchCarQueryKmPerL(
  brand: string,
  model: string,
  year?: string | number
): Promise<number | undefined> {
  try {
    const params = new URLSearchParams({ brand, model });
    if (year) params.append("year", String(year));

    // כאן ה‑URL של ה‑Vercel שלך
    const baseUrl = "https://your-vercel-project.vercel.app/api/carquery";
    const res = await fetch(`${baseUrl}?${params.toString()}`);
    if (!res.ok) throw new Error(`Server responded ${res.status}`);

    const data = await res.json();
    return data.computedKmPerL;
  } catch (err) {
    console.error("fetchCarQueryKmPerL failed:", err);
    return undefined;
  }
}
