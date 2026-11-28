// PM Roitx - Board Updates scraper (Node 20+, koi npm package nahi chahiye)
// Sources:
//   1) CBSE official circular page            -> "Official Source"
//   2) BSEB official page(s) (BSEB_URLS)      -> "Official Source" (agar site khule)
//   3) Google News RSS (BSEB khabrein, Hindi) -> "News" (publisher ka naam, official nahi)
// Naya item board_updates me, aur notifications table me (site ke notification panel ke liye).

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const DRY_RUN      = process.env.DRY_RUN === '1';       // 1 = sirf dikhao, DB me mat likho

const MAX_AGE_DAYS      = 45;  // CBSE: isse purane ignore
const MAX_NEWS_DAYS     = 10;  // News: isse purane ignore
const NOTIFY_MAX_DAYS   = 3;   // isse purane items ki notification nahi
const NEWS_PER_GROUP    = 6;   // ek (category + class) ki max itni news
const MAX_NOTIFS_PER_RUN = 5;  // ek run me zyada notification nahi (spam rokne ke liye)

const BSEB_URLS = (process.env.BSEB_URLS || 'https://secondary.biharboardonline.com/,https://biharboardonline.bihar.gov.in/')
  .split(',').map(s => s.trim()).filter(Boolean);
const CBSE_URL = 'https://www.cbse.gov.in/cbsenew/examination_Circular.html';
const NEWS_QUERIES = ['BSEB', 'Bihar Board 10th 12th', 'बिहार बोर्ड मैट्रिक इंटर', 'बिहार बोर्ड एडमिट कार्ड', 'बिहार बोर्ड डमी एडमिट कार्ड', 'बिहार बोर्ड परीक्षा 2027'];

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

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
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
        'Upgrade-Insecure-Requests': '1'
      },
      signal: ctrl.signal, redirect: 'follow'
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } catch (e) {
    const why = e.cause ? (e.cause.code || e.cause.message) : (e.name === 'AbortError' ? 'timeout (25s)' : '');
    throw new Error(e.message + (why ? ' [' + why + ']' : ''));
  } finally { clearTimeout(t); }
}

/* Category: English + Hindi keywords. Order matter karta hai. */
function categoryOf(title) {
  const t = title.toLowerCase();
  if (/model\s*(paper|question)|मॉडल\s*(पेपर|प्रश्न)|मॉडल\s*सेट|sample\s*paper/.test(t)) return 'model';
  if (/admit\s*card|hall\s*ticket|एडमिट\s*कार्ड|प्रवेश\s*पत्र|डमी\s*(एडमिट|रजिस्ट्रेशन|पंजीयन)|dummy\s*(admit|registration)/.test(t)) return 'admit';
  if (/date\s*sheet|datesheet|time\s*table|timetable|exam\s*schedule|टाइम\s*टेबल|टाइम-टेबल|डेटशीट|डेट\s*शीट|परीक्षा\s*(तिथि|कार्यक्रम)/.test(t)) return 'date';
  if (/\bresult|रिजल्ट|परिणाम/.test(t)) return 'result';
  if (/syllabus|curriculum|marking scheme|सिलेबस|पाठ्यक्रम/.test(t)) return 'syllabus';
  if (/registration|online\s*form|application\s*form|आवेदन|पंजीयन|रजिस्ट्रेशन|फॉर्म|last\s*date/.test(t)) return 'form';
  return 'other';
}

function classOf(title) {
  const found = new Set();
  const roman = { IX: '9', X: '10', XI: '11', XII: '12' };
  for (const m of title.matchAll(/\bclass(?:es)?\s*[-:]?\s*(IX|XII|XI|X|9|10|11|12)\b/gi)) found.add(roman[m[1].toUpperCase()] || m[1]);
  if (/class/i.test(title)) for (const m of title.matchAll(/\b(IX|XII|XI|X)\b/g)) found.add(roman[m[1]]);
  if (/\bmatric(ulation)?\b|10th|10वीं|10 वीं|दसवीं|मैट्रिक|मैट्रिक/i.test(title)) found.add('10');
  if (/\binter(mediate)?\b|12th|12वीं|12 वीं|बारहवीं|इंटर/i.test(title)) found.add('12');
  return found.size === 1 ? [...found][0] : null;   // ek se zyada ya koi nahi = sab class
}

const BSEB_RELEVANT = /bseb|bihar\s*board|biharboard|बिहार\s*बोर्ड|बिहार\s*विद्यालय\s*परीक्षा\s*समिति|बीएसईबी/i;

/* ---------------- CBSE (table: DATE | CIRCULAR | ENGLISH | HINDI | ...) ---------------- */
function parseCbse(html, baseUrl) {
  const items = [];
  const firstTable = (html.match(/<table[\s\S]*?<\/table>/i) || [html])[0];   // sirf chalu saal ki table
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
    items.push({ board: 'CBSE', title, url, date, hasDate: true, official: true, source: 'CBSE' });
  }
  return items;
}

/* ---------------- BSEB official (generic: keyword wale links) ---------------- */
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
    out.push({ board, title, url, date: null, hasDate: false, official: true, source: board });
  }
  return out;
}

/* ---------------- Google News RSS (BSEB khabrein) ---------------- */
function parseNewsRss(xml, board) {
  const out = [];
  let total = 0, droppedRelevance = 0;
  for (const it of xml.match(/<item>[\s\S]*?<\/item>/gi) || []) {
    const pick = tag => { const m = it.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i')); return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() : ''; };
    let title = decode(strip(pick('title')));
    const source = decode(strip(pick('source')));
    const link = decode(pick('link'));
    const date = new Date(pick('pubDate'));
    if (!title || !link || isNaN(date)) continue;
    total++;
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3)).trim();
    if (!BSEB_RELEVANT.test(title)) { droppedRelevance++; continue; }
    out.push({ board, title, url: link, date, hasDate: true, official: false, source: source || 'News' });
  }
  console.log(`   RSS raw items: ${total}, relevance filter se hate: ${droppedRelevance}, bache: ${out.length}`);
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
async function boardHasOfficialRows(board) {
  const rows = await sb(`board_updates?select=id&board=eq.${board}&is_official=eq.true&limit=1`);
  return rows.length > 0;
}

/* ---------------- main ---------------- */
let okSources = 0;
async function collect() {
  const all = [];
  try {
    const items = parseCbse(await getHtml(CBSE_URL), CBSE_URL);
    console.log(`CBSE: ${items.length} rows parse hue`);
    if (!items.length) console.warn('CBSE: 0 rows. Page ka design badal gaya ho sakta hai, parseCbse() dekhein.');
    all.push(...items); okSources++;
  } catch (e) { console.error('CBSE fetch fail:', e.message); }

  for (const u of BSEB_URLS) {
    try {
      const items = parseGenericLinks(await getHtml(u), u, 'BSEB');
      console.log(`BSEB official (${u}): ${items.length} matching links`);
      all.push(...items); okSources++;
    } catch (e) { console.error('BSEB official fail', u, e.message); }
  }

  for (const q of NEWS_QUERIES) {
    const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:' + MAX_NEWS_DAYS + 'd') + '&hl=hi&gl=IN&ceid=IN:hi';
    try {
      const items = parseNewsRss(await getHtml(url), 'BSEB');
      console.log(`BSEB news (${q}): ${items.length} items`);
      all.push(...items); okSources++;
    } catch (e) { console.error('BSEB news fail', q, e.message); }
  }
  return all;
}

async function main() {
  if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error('SUPABASE_URL ya SUPABASE_SERVICE_KEY set nahi hai.'); process.exit(1);
  }
  const now = Date.now();
  const seeded = {};   // board -> official rows pehle se hain ya nahi
  const rows = [];
  const newsCount = {};

  const found = (await collect()).sort((a, b) => (b.date || 0) - (a.date || 0));
  for (const it of found) {
    const category = categoryOf(it.title);
    if (category === 'other') { if (DRY_RUN) console.log('   skip (category other):', it.title.slice(0, 80)); continue; }
    const cls = classOf(it.title);

    let published, notify = true;
    if (it.hasDate) {
      const ageDays = (now - it.date) / 864e5;
      if (ageDays > (it.official ? MAX_AGE_DAYS : MAX_NEWS_DAYS)) continue;
      if (!it.official) {                                      // news: ek hi tarah ki bahut saari khabrein na dikhein
        const key = category + '|' + (cls || 'all');
        newsCount[key] = (newsCount[key] || 0) + 1;
        if (newsCount[key] > NEWS_PER_GROUP) continue;
      }
      published = ageDays < 2 && it.official ? new Date(now) : it.date;
      notify = ageDays <= NOTIFY_MAX_DAYS;
    } else {
      if (!DRY_RUN) {
        if (!(it.board in seeded)) seeded[it.board] = await boardHasOfficialRows(it.board);
        if (!seeded[it.board]) { published = new Date(now - 40 * 864e5); notify = false; }   // pehli baar: sirf archive
      }
      published = published || new Date(now);
    }
    rows.push({
      board: it.board, class: cls, category,
      title: it.title.slice(0, 200), source_url: it.url,
      published_at: published.toISOString(),
      is_official: it.official, source_name: it.source,
      _notify: notify
    });
  }
  console.log(`Kul ${rows.length} relevant items mile`);
  if (okSources === 0) { console.error('Koi bhi source open nahi hua (blocked ho sakta hai).'); process.exit(1); }
  if (DRY_RUN) { rows.forEach(r => console.log(' -', r.board, r.category, r.class || 'all', r.is_official ? 'OFFICIAL' : 'NEWS:' + r.source_name, '|', r.title.slice(0, 70), '|', r.published_at.slice(0, 10))); return; }
  if (!rows.length) return;

  const notifyMap = Object.fromEntries(rows.map(r => [r.source_url, r._notify]));
  const payload = rows.map(({ _notify, ...r }) => r);
  const inserted = await sb('board_updates?on_conflict=source_url', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });
  console.log(`Naye items: ${inserted.length}`);

  const label = { date: 'Date Sheet', admit: 'Admit Card', result: 'Result', syllabus: 'Syllabus', model: 'Model Paper', form: 'Form / Registration' };
  const notifs = inserted.filter(r => notifyMap[r.source_url]).slice(0, MAX_NOTIFS_PER_RUN).map(r => ({
    title: r.title.slice(0, 120),
    message: `${r.board}${r.class ? ' Class ' + r.class : ''} · ${label[r.category]} · ${r.is_official ? 'Official source par dekhein' : 'Khabar: ' + (r.source_name || '')}`,
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
export { parseCbse, parseGenericLinks, parseNewsRss, categoryOf, classOf };
