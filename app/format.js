// Small helpers for showing API values. All user-visible text from the
// API goes through esc() before it reaches innerHTML.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('646.50', 500 or 0.5) as '$646.50' or '$500'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

/** A count with thousands separators (10768 -> '10,768'). */
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** A deadline as a date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** Milliseconds until a deadline, as '2d 4h left', '35m left', '45s left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return `${seconds}s left`;
}

/** True when a bounty still takes entries: by its deadline, not its status alone. */
export function isOpen(bounty) {
  return new Date(bounty.deadline).getTime() > Date.now();
}

/** A joined-at date as 'Nov 15, 2026'. */
export function joinedDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
}

/** A Solana address shortened to its ends (DXGB…AgYC). */
export function shortWallet(address) {
  const a = String(address ?? '');
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}
