/** 1234.5 -> "1,234.50" */
export function formatAmount(n: number, decimals = 2) {
  const [int, frac] = n.toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}
