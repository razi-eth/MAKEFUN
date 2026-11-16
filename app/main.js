// A make.fun frontend: the bounty board, a bounty's page, its
// leaderboard and an account's public profile, on hash routes.
//
//   #/                          the board
//   #/bounty/<slug>             one bounty
//   #/bounty/<slug>/leaderboard its leaderboard
//   #/u/<handle>                an account's public profile
//
// window.__shotReady is false while a page loads and true once its data
// is on screen, so a screenshot script knows when to capture.

import { getCompetition, getCompetitions, getLeaderboard, getProfile } from './api.js';
import { board, boardRows, bounty, leaderboard, profile } from './views.js';

const app = document.getElementById('app');

// The board's sort/filter/search, kept in memory so typing never reloads.
const boardState = { sort: 'pot', filter: 'open', query: '' };
let boardItems = null;
let leaderboardShown = 25;

/** The error page, with a retry that re-runs the same route. */
function showError(message) {
  app.innerHTML = `<h1>Could not load</h1><p>${message}. The make.fun API may be unreachable — check your connection and try again.</p><p><button id="retry" type="button">Retry</button></p>`;
  document.getElementById('retry').addEventListener('click', render);
}

/** Wire the board's controls (search, sort, filter) to re-render its list only. */
function wireBoardControls() {
  const list = document.getElementById('board-list');
  const search = document.getElementById('board-search');
  const sort = document.getElementById('board-sort');
  const filter = document.getElementById('board-filter');
  const update = () => {
    boardState.query = search.value;
    boardState.sort = sort.value;
    boardState.filter = filter.value;
    list.innerHTML = boardRows(boardItems, boardState);
  };
  let timer = 0;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(update, 120);
  });
  sort.addEventListener('change', update);
  filter.addEventListener('change', update);
}

/** Wire the leaderboard's "Show more" to reveal 25 more rows, no new request. */
function wireLeaderboardMore(data, slug) {
  const more = document.getElementById('lb-more');
  if (!more) return;
  more.addEventListener('click', () => {
    leaderboardShown += 25;
    app.innerHTML = leaderboard(data, slug, leaderboardShown);
    wireLeaderboardMore(data, slug);
  });
}

async function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const bountyMatch = hash.match(/^#\/bounty\/([^/]+)(?:\/leaderboard)?\/?$/);
  const profileMatch = hash.match(/^#\/u\/([^/]+)\/?$/);
  try {
    if (bountyMatch && hash.includes('/leaderboard')) {
      const slug = decodeURIComponent(bountyMatch[1]);
      document.title = `Leaderboard · ${slug} | make.fun`;
      app.innerHTML = '<p>Loading leaderboard…</p>';
      const [data, b] = await Promise.all([getLeaderboard(slug), getCompetition(slug).catch(() => null)]);
      document.title = `Leaderboard · ${b?.title || slug} | make.fun`;
      leaderboardShown = 25;
      app.innerHTML = leaderboard(data, slug, leaderboardShown);
      wireLeaderboardMore(data, slug);
    } else if (bountyMatch) {
      const slug = decodeURIComponent(bountyMatch[1]);
      document.title = `${slug} | make.fun`;
      app.innerHTML = '<p>Loading bounty…</p>';
      const b = await getCompetition(slug);
      document.title = `${b.title} | make.fun`;
      app.innerHTML = bounty(b);
    } else if (profileMatch) {
      const handle = decodeURIComponent(profileMatch[1]);
      document.title = `@${handle} | make.fun`;
      app.innerHTML = '<p>Loading profile…</p>';
      const p = await getProfile(handle);
      document.title = `${p.display_name || p.handle} (@${p.handle}) | make.fun`;
      app.innerHTML = profile(p);
    } else {
      document.title = 'make.fun bounties';
      if (!boardItems) {
        app.innerHTML = '<p>Loading bounties…</p>';
        boardItems = (await getCompetitions()).items || [];
      }
      app.innerHTML = board(boardItems, boardState);
      wireBoardControls();
    }
  } catch (err) {
    showError(err.message || 'Something went wrong');
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
