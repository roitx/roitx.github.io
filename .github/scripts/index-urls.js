// Submits changed (or all) sitemap URLs to Google Indexing API
const fs = require('fs');
const { execSync } = require('child_process');
const { google } = require('googleapis');

const DOMAIN = 'https://roitx.dpdns.org';
const LIMIT = 200; // daily quota

function sitemapUrls() {
  const xml = fs.readFileSync('sitemap.xml', 'utf8');
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
}

function changedUrls() {
  try {
    const files = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' })
      .split('\n').filter(f => f.endsWith('.html'));
    return files.map(f => f === 'index.html' ? DOMAIN + '/' : DOMAIN + '/' + f);
  } catch (e) {
    return [];
  }
}

async function main() {
  const all = sitemapUrls();
  let urls = process.env.MODE === 'all' ? all : changedUrls().filter(u => all.includes(u));
  if (urls.length === 0) {
    console.log('No changed sitemap pages found, submitting homepage only.');
    urls = [DOMAIN + '/'];
  }
  urls = urls.slice(0, LIMIT);

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.SA_KEY),
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
  const client = await auth.getClient();
  console.log('Authenticated. Submitting ' + urls.length + ' URL(s)');

  let ok = 0, fail = 0;
  for (const url of urls) {
    try {
      await client.request({
        url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
        method: 'POST',
        data: { url, type: 'URL_UPDATED' },
      });
      ok++;
      console.log('OK   ' + url);
    } catch (err) {
      fail++;
      const msg = err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message;
      console.log('FAIL ' + url + ' -> ' + msg);
    }
  }
  console.log('Done. success=' + ok + ' failed=' + fail);
}

main().catch(e => { console.error('Auth/setup error:', e.message); process.exit(1); });
