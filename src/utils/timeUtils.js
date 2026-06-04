export function formatArrivalTime(durationSeconds) {
  const d = new Date(Date.now() + durationSeconds * 1000);
  const pad = n => n < 10 ? "0" + n : n;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
