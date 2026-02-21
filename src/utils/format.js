export function formatTime(hours) {
  if (!hours || hours <= 0) return "0m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatNumber(n) {
  if (n == null) return "0";
  return Math.round(n).toLocaleString();
}

export function formatPercent(decimal) {
  return `${(decimal * 100).toFixed(1)}%`;
}

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
