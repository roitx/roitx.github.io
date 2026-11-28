// PM Roitx - Board Updates scraper (Node 20+, koi npm package nahi chahiye)
// Kaam: CBSE / BSEB ke official pages padhna -> naye items board_updates table me daalna
//       -> har naye item ki notifications table me entry (site ke notification panel me dikhegi)

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const DRY_RUN      = process.env.DRY_RUN === '1';       // 1 = sirf dikhao, DB me mat likho

const MAX_AGE_DAYS    = 45;  // isse purane CBSE items ignore
const NOTIFY_MAX_DAYS = 3;   // isse purane items ki notification nahi

// BSEB ke notice pages (apne aap ek baar official site khol kar sahi URL daalna)
const BSEB_URLS = (process.env.BSEB_URLS || 'https://biharboardonline.bihar.gov.in/')
  .split(',').map(s => s.trim()).filter(Boolean);

const CBSE_URL = 'https://www.cbse.gov.in/cbsenew/examination_Circular.html';

const UA = 'Mozilla/5.0 (compatible; PMRoitxBot/1.0; +https://roitx.dpdns.org)';

/* ---------------- helpers ---------------- */
const decode = s => String(s)
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&ndash;|&mdash;/g, '-')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const strip = html => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

async function getHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

function categoryOf(title) {
  const t = title.toLowerCase();
  if (/admit\s*card|hall\s*ticket|e-?admit/.test(t)) return 'admit';
  if (/date\s*sheet|datesheet|time\s*table|timetable|exam\s*schedule/.test(t)) return 'date';
  if (/\bresult/.test(t)) return 'result';
  if (/syllabus|curriculum|marking scheme|sample paper/.test(t)) return 'syllabus';
  return 'other';
}

function classOf(title) {
  const found = new Set();
  const roman = { IX: '9', X: '10', XI: '11', XII: '12' };
  for (const m of title.matchAll(/\bclass(?:es)?\s*[-:]?\s*(IX|XII|XI|X|9|10|11|12)\b/gi)) found.add(roman[m[1].toUpperCase()] || m[1]);
  // "Classes X and XII" jaise case
  for (const m of title.matchAll(/\b(IX|XII|XI|X)\b/g)) if (/class/i.test(title)) found.add(roman[m[1]]);
  return found.size === 1 ? [...found][0] : null;   // ek se zyada ya koi nahi = sab class
}

/* ---------------- CBSE (table: DATE | CIRCULAR | ENGLISH | HINDI | ...) ---------------- */
function parseCbse(html, baseUrl) {
  const items = [];
  const year = new Date().getFullYear();
  // sirf chalu saal ki pehli table (CIRCULARS - 2026), baaki saal purane hain
  const firstTable = (html.match(/<table[\s\S]*?<\/table>/i) || [html])[0];
  for (const row of firstTable.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const cells = row.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (cells.length < 3) continue;
    const dm = strip(cells[0]).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dm) continue;
    const date = new Date(Date.UTC(+dm[3], +dm[2] - 1, +dm[1], 6, 30)); // 12:00 IST
    const title = strip(cells[1]).replace(/\s*\|\s*.*$/, '').trim();
    if (!title) continue;
    const linkOf = c => { const m = c && c.match(/<a[^>]+href\s*=\s*["']([^"']+)["']/i); return m ? decode(m[1]) : null; };
    const href = linkOf(cells[2]) || linkOf(cells[1]) || linkOf(cells[3]) || baseUrl;
    let url;
    try { url = new URL(href.trim(), baseUrl).href; } catch { continue; }
    items.push({ board: 'CBSE', title, url, date, hasDate: true });
  }
  return items;
}

/* ---------------- BSEB (generic: keyword wale links) ---------------- */
function parseGenericLinks(html, baseUrl, board) {
  const out = [], seen = new Set();
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const title = strip(m[2]);
    if (title.length < 12 || title.length > 200) continue;
    if (categoryOf(title) === 'other') continue;
    let url;
    try { url = new URL(decode(m[1]).trim(), baseUrl).href; } catch { continue; }
    if (/^(javascript:|mailto:|tel:)/i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({ board, title, url, date: null, hasDate: false });
  }
  return out;
}

/* ---------------- Supabase REST ---------------- */
async function sb(path, opts = {}) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json', ...(opts.headers || {})
    }
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
async function boardHasRows(board) {
  const rows = await sb(`board_updates?select=id&board=eq.${board}&limit=1`);
  return rows.length > 0;
}

/* ---------------- main ---------------- */
async function collect() {
  const all = [];
  try {
    const html = await getHtml(CBSE_URL);
    const items = parseCbse(html, CBSE_URL);
    console.log(`CBSE: ${items.length} rows parse hue`);
    if (!items.length) console.warn('CBSE: 0 rows. Page ka design badal gaya ho sakta hai, parseCbse() dekhein.');
    all.push(...items);
  } catch (e) { console.error('CBSE fetch fail:', e.message); }

  for (const u of BSEB_URLS) {
    try {
      const html = await getHtml(u);
      const items = parseGenericLinks(html, u, 'BSEB');
      console.log(`BSEB (${u}): ${items.length} matching links`);
      all.push(...items);
    } catch (e) { console.error('BSEB fetch fail', u, e.message); }
  }
  return all;
}

async function main() {
  if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error('SUPABASE_URL ya SUPABASE_SERVICE_KEY set nahi hai.'); process.exit(1);
  }
  const now = Date.now();
  const seeded = {};   // board -> kya pehle se rows hain
  const rows = [];

  for (const it of await collect()) {
    const category = categoryOf(it.title);
    if (category === 'other') continue;                       // school-admin noise skip

    let published, notify = true;
    if (it.hasDate) {
      const ageDays = (now - it.date) / 864e5;
      if (ageDays > MAX_AGE_DAYS) continue;
      published = ageDays < 2 ? new Date(now) : it.date;
      notify = ageDays <= NOTIFY_MAX_DAYS;
    } else {
      if (!DRY_RUN) {
        if (!(it.board in seeded)) seeded[it.board] = await boardHasRows(it.board);
        if (!seeded[it.board]) { published = new Date(now - 40 * 864e5); notify = false; }   // pehli baar: sirf archive
      }
      published = published || new Date(now);
    }
    rows.push({
      board: it.board, class: classOf(it.title), category,
      title: it.title.slice(0, 200), source_url: it.url,
      published_at: published.toISOString(), _notify: notify
    });
  }
  console.log(`Kul ${rows.length} relevant items mile`);
  if (DRY_RUN) { rows.forEach(r => console.log(' -', r.board, r.category, r.class || 'all', '|', r.title, '|', r.published_at.slice(0, 10))); return; }
  if (!rows.length) return;

  // naye items hi wapas aate hain (duplicate ignore)
  const notifyMap = Object.fromEntries(rows.map(r => [r.source_url, r._notify]));
  const payload = rows.map(({ _notify, ...r }) => r);
  const inserted = await sb('board_updates?on_conflict=source_url', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });
  console.log(`Naye items: ${inserted.length}`);

  const label = { date: 'Date Sheet', admit: 'Admit Card', result: 'Result', syllabus: 'Syllabus' };
  const notifs = inserted.filter(r => notifyMap[r.source_url]).map(r => ({
    title: r.title.slice(0, 120),
    message: `${r.board}${r.class ? ' Class ' + r.class : ''} · ${label[r.category]} · Official source par dekhein`,
    link: 'board-updates.html',
    type: 'update',
    user_id: null
  }));
  if (notifs.length) {
    await sb('notifications', { method: 'POST', body: JSON.stringify(notifs) });
    console.log(`Notifications bheji: ${notifs.length}`);
  }
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });

// test ke liye
export { parseCbse, parseGenericLinks, categoryOf, classOf };
