// make.fun's public API, read-only GET, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Performance, by design: every answer is cached in memory for one
// minute (the API's ETags are bound to the minute), revalidated with
// If-None-Match so a repeat view costs a 304 instead of a download,
// and in-flight requests are shared, so two views asking for the same
// bounty at once make one request, never two. A view therefore costs
// exactly one request on first visit and usually zero after that.

const API = 'https://make.fun/api';
const TTL_MS = 60_000;

/** Absolute URL for an image the API points at (avatars are /api/... paths). */
export function abs(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // /api/... paths are already rooted at the origin, not under the API base.
  if (url.startsWith('/api/')) return 'https://make.fun' + url;
  return API + (url.startsWith('/') ? url : `/${url}`);
}

// url -> { data, etag, time } ; url -> Promise (in flight)
const cache = new Map();
const inflight = new Map();

async function get(path) {
  const url = API + path;
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && now - hit.time < TTL_MS) return hit.data;
  if (inflight.has(url)) return inflight.get(url);
  const work = (async () => {
    const headers = {};
    if (hit?.etag) headers['If-None-Match'] = hit.etag;
    const res = await fetch(url, { headers });
    if (res.status === 304 && hit) {
      hit.time = now;
      return hit.data;
    }
    if (!res.ok) throw new Error(`${res.status} ${path}`);
    const data = await res.json();
    cache.set(url, { data, etag: res.headers.get('ETag') || '', time: now });
    return data;
  })();
  inflight.set(url, work);
  try {
    return await work;
  } finally {
    inflight.delete(url);
  }
}

/** The bounty board: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getCompetitions = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getCompetition = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard rows, best first (limit keeps the payload small). */
export const getLeaderboard = (slug, limit = 100) =>
  get(`/competitions/${encodeURIComponent(slug)}/leaderboard?limit=${limit}`);

/** An account's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
