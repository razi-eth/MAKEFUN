// The four surfaces, each a function from live API data to HTML.
// Board, bounty page, leaderboard and profile: every one reachable by
// a link and by its own hash URL (see main.js for the routes).

import { abs } from './api.js';
import { date, esc, isOpen, joinedDate, money, num, shortWallet, timeLeft } from './format.js';

/** The reward as it stands now: the live pot, entry fees included. */
export function pot(bounty) {
  return money(bounty.potUsd ?? bounty.rewardAmount);
}

/** The entry fee, when the bounty charges one. */
export function fee(bounty) {
  return bounty.entryFeeUsd ? `${money(bounty.entryFeeUsd)} fee` : 'Free entry';
}

/** Time-left text with a class for its urgency (soon < 24h, over = ended). */
function timeLeftHtml(bounty) {
  const ms = new Date(bounty.deadline).getTime() - Date.now();
  const cls = ms <= 0 ? 'ended' : ms < 86400000 ? 'soon' : '';
  return `<span class="time ${cls}">${timeLeft(bounty.deadline)}</span>`;
}

// ---------------------------------------------------------------- board

/** The board's rows for a sort/filter/search state (list only, so typing never loses focus). */
export function boardRows(items, state) {
  const q = state.query.trim().toLowerCase();
  const open = items.filter(isOpen);
  const ended = items.filter((b) => !isOpen(b));
  let list = state.filter === 'ended' ? ended : state.filter === 'soon' ? open.filter((b) => new Date(b.deadline).getTime() - Date.now() < 86400000) : open;
  if (q) list = list.filter((b) => `${b.title} ${b.slug} ${b.category}`.toLowerCase().includes(q));
  const byPot = (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount);
  const byDeadline = (a, b) => new Date(a.deadline) - new Date(b.deadline);
  const byEntries = (a, b) => Number(b.submissionCount) - Number(a.submissionCount);
  list = [...list].sort(state.sort === 'deadline' ? byDeadline : state.sort === 'entries' ? byEntries : byPot);
  if (!list.length) return `<p class="empty">No bounties match. Try another search or filter.</p>`;
  return `<ul class="board">${list
    .map(
      (b) => `<li>
        <a class="row-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
        <span class="row-cat">${esc(b.category || '')}</span>
        <span class="row-pot">${pot(b)}</span>
        <span class="row-fee">${fee(b)}</span>
        <span>${timeLeftHtml(b)}</span>
        <span class="row-entries">${num(b.submissionCount)} ${Number(b.submissionCount) === 1 ? 'entry' : 'entries'}</span>
      </li>`,
    )
    .join('')}</ul>`;
}

/** The board: live bounties with pot, fee, time left and entries; search, sort and filter are client-side. */
export function board(items, state) {
  const open = items.filter(isOpen).length;
  const soon = items.filter((b) => isOpen(b) && new Date(b.deadline).getTime() - Date.now() < 86400000).length;
  return `<h1>Open bounties</h1>
  <p class="lede">${open} open now · ${soon} ending within a day · ${num(items.length)} listed</p>
  <div class="controls">
    <input id="board-search" type="search" placeholder="Search bounties…" value="${esc(state.query)}" aria-label="Search bounties">
    <label>Sort
      <select id="board-sort">
        <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Biggest pot</option>
        <option value="deadline"${state.sort === 'deadline' ? ' selected' : ''}>Ending soonest</option>
        <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
      </select>
    </label>
    <label>Show
      <select id="board-filter">
        <option value="open"${state.filter === 'open' ? ' selected' : ''}>Open now</option>
        <option value="soon"${state.filter === 'soon' ? ' selected' : ''}>Ending &lt; 24h</option>
        <option value="ended"${state.filter === 'ended' ? ' selected' : ''}>Ended</option>
      </select>
    </label>
  </div>
  <div id="board-list">${boardRows(items, state)}</div>`;
}

// ------------------------------------------------------- bounty (detail)

// Tiny markdown for bounty descriptions: headings, bold, italic, code,
// links, lists and paragraphs. Text is escaped first, so no raw HTML
// from the API ever reaches the page.
export function markdown(md) {
  const lines = String(md ?? '').split('\n');
  let html = '';
  let list = false;
  const inline = (s) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const closeList = () => {
    if (list) {
      html += '</ul>';
      list = false;
    }
  };
  for (const raw of lines) {
    const line = esc(raw);
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const item = line.match(/^[-*]\s+(.*)$/);
    if (h) {
      closeList();
      html += `<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`;
    } else if (item) {
      if (!list) {
        html += '<ul>';
        list = true;
      }
      html += `<li>${inline(item[1])}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else if (line.trim() === '---') {
      closeList();
      html += '<hr>';
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

/** A bounty's page: summary, rules, rewards with the live pot, dates and status. */
export function bounty(b) {
  const open = isOpen(b);
  const rewards = Object.entries(b.rewards || {})
    .map(([place, amount]) => [Number(place), Number(amount)])
    .filter(([, amount]) => Number.isFinite(amount))
    .sort((a, b2) => a[0] - b2[0]);
  const rewardRows = rewards
    .map(([place, amount]) => `<tr><td>${place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`}</td><td>${money(amount)}</td></tr>`)
    .join('');
  return `<p class="back"><a href="#/">← All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  <p class="lede">${esc(b.summary || '')}</p>
  <dl class="meta">
    <dt>Live pot</dt><dd class="big">${pot(b)}</dd>
    <dt>Entry fee</dt><dd>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</dd>
    <dt>Deadline</dt><dd>${date(b.deadline)} (${timeLeft(b.deadline)})</dd>
    <dt>Status</dt><dd>${open ? 'Open — taking entries' : 'Ended'}</dd>
    <dt>Entries</dt><dd>${num(b.submissionCount)}</dd>
    <dt>Category</dt><dd>${esc(b.category || '—')}</dd>
    ${b.skills?.length ? `<dt>Skills</dt><dd>${b.skills.map(esc).join(', ')}</dd>` : ''}
    ${b.sponsor?.name ? `<dt>Sponsor</dt><dd>${esc(b.sponsor.name)}</dd>` : ''}
  </dl>
  <p><a class="button" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View leaderboard →</a></p>
  ${rewardRows ? `<h2>Rewards</h2><table class="rewards"><thead><tr><th>Place</th><th>Prize</th></tr></thead><tbody>${rewardRows}</tbody></table>` : ''}
  <h2>About this bounty</h2>
  <div class="description">${markdown(b.description || '')}</div>`;
}

// ------------------------------------------------------------- leaderboard

/** The leaderboard's primary score: Elo, judge score, PnL or whatever the bounty scores on. */
function primaryScore(row) {
  const d = row.display || {};
  const v = row.values || {};
  for (const key of ['elo', 'judge', 'net_pnl', 'score']) {
    if (d[key] !== undefined) return { label: key === 'elo' ? 'Elo' : key === 'judge' ? 'Judge' : key, text: num(d[key]) };
    if (v[key] !== undefined) return { label: key, text: num(v[key]) };
  }
  const first = Object.entries(d).find(([, x]) => typeof x === 'string' && /^-?[\d,.]+$/.test(x));
  return first ? { label: first[0], text: num(first[1]) } : { label: 'Score', text: '—' };
}

/** One leaderboard row: rank, entrant (avatar, handle, entry name), score, record. */
function leaderboardRow(row) {
  const score = primaryScore(row);
  const d = row.display || {};
  const wdl =
    d.wins !== undefined ? `${num(d.wins)}–${num(d.draws ?? 0)}–${num(d.losses ?? 0)}` : '';
  const spare = d.spare_plies !== undefined ? num(d.spare_plies) : '';
  const avatar = row.image ? `<img class="avatar" src="${esc(abs(row.image))}" crossorigin="anonymous" alt="" loading="lazy" width="28" height="28" onerror="this.remove()">` : '';
  return `<tr${row.ranked === false ? ' class="unranked"' : ''}>
    <td class="rank">${num(row.rank)}</td>
    <td class="entrant">${avatar}<a href="#/u/${encodeURIComponent(row.handle)}">@${esc(row.handle)}</a>${row.title ? `<span class="entry-title">${esc(row.title)}</span>` : ''}</td>
    <td class="score">${score.text}</td>
    <td>${wdl || '—'}</td>
    <td>${spare || '—'}</td>
  </tr>`;
}

/** A bounty's leaderboard, best first, 25 rows at a time (no extra requests to page). */
export function leaderboard(data, slug, shown) {
  const rows = data.leaderboard || data.entries || [];
  const ranked = rows.filter((r) => r.ranked !== false).length;
  const score = rows.length ? primaryScore(rows[0]).label : 'Score';
  const visible = rows.slice(0, shown);
  return `<p class="back"><a href="#/bounty/${encodeURIComponent(slug)}">← Back to bounty</a></p>
  <h1>Leaderboard</h1>
  <p class="lede">${num(ranked)} ranked · showing ${num(visible.length)} of ${num(rows.length)}</p>
  ${rows.length ? `<table class="leaderboard">
    <thead><tr><th>#</th><th>Entrant</th><th>${esc(score)}</th><th>W–D–L</th><th>Spare</th></tr></thead>
    <tbody>${visible.map(leaderboardRow).join('')}</tbody>
  </table>` : `<p class="empty">No leaderboard yet — be the first entry.</p>`}
  ${rows.length > shown ? `<p><button id="lb-more" type="button">Show more</button></p>` : ''}`;
}

// ----------------------------------------------------------------- profile

/** An account's public profile: avatar, bio, links, wallet, record and entries. */
export function profile(p) {
  const links = [
    p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub @${esc(p.github_login)}</a>` : '',
    p.x?.username ? `<a href="${esc(p.x.url || `https://x.com/${encodeURIComponent(p.x.username)}`)}">X @${esc(p.x.username)}</a>` : '',
    p.discord?.username ? `<a href="${esc(p.discord.url || '#')}">Discord @${esc(p.discord.username)}</a>` : '',
  ].filter(Boolean);
  const record = p.record || {};
  const solutions = Array.isArray(p.solutions) ? p.solutions : [];
  return `<p class="back"><a href="#/">← All bounties</a></p>
  <div class="profile-head">
    ${p.avatar?.url ? `<img class="avatar-lg" src="${esc(abs(p.avatar.url))}" crossorigin="anonymous" alt="Avatar of ${esc(p.display_name || p.handle)}" width="96" height="96" onerror="this.remove()">` : ''}
    <div>
      <h1>${esc(p.display_name || p.handle)}</h1>
      <p class="handle">@${esc(p.handle)}</p>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
    </div>
  </div>
  ${links.length ? `<p class="links">${links.join(' · ')}</p>` : ''}
  <dl class="meta">
    <dt>Joined</dt><dd>${joinedDate(p.joined_at)}</dd>
    ${p.wallet?.address ? `<dt>Wallet</dt><dd><a href="${esc(p.wallet.explorer_url || '#')}">${shortWallet(p.wallet.address)}</a></dd>` : ''}
    <dt>Entered</dt><dd>${num(record.competitions_entered)}</dd>
    <dt>Placed</dt><dd>${num(record.competitions_placed)}</dd>
    <dt>Won</dt><dd>${num(record.competitions_won)}</dd>
    <dt>Prize money</dt><dd>${money(record.prize_usd ?? 0)}</dd>
  </dl>
  <h2>Entries</h2>
  ${solutions.length ? `<ul class="solutions">${solutions.map((s) => `<li><a href="#/bounty/${encodeURIComponent(s.slug || s.competition || '')}">${esc(s.title || s.slug || 'Entry')}</a>${s.placement ? ` — ${esc(String(s.placement))}` : ''}</li>`).join('')}</ul>` : `<p class="empty">No entries yet.</p>`}`;
}
