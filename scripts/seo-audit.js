#!/usr/bin/env node
/**
 * Lightweight SEO/crawl audit for OzarkRoost.
 * Uses only Node 20+ built-in fetch; no credentials and no crawling of external domains.
 */
const SITE_URL = (process.env.SITE_URL || 'https://ozarkroost-jibz.onrender.com').replace(/\/$/, '');
const MAX_PAGES = Math.min(Number(process.env.CRAWL_MAX_PAGES || 100), 250);

function textBetween(html, tag, attr = '') {
  const re = new RegExp('<' + tag + '\\b' + attr + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const m = html.match(re);
  return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim() : '';
}
function attr(html, tag, name) {
  const re = new RegExp('<' + tag + '\\b[^>]*\\b' + name + '=["\\\']([^"\\\']+)["\\\']', 'i');
  const m = html.match(re);
  return m ? m[1] : '';
}
function links(html) {
  return [...html.matchAll(/<a\\b[^>]*href=["']([^"']+)["']/gi)].map(m => m[1]);
}
function absolute(href) {
  try { return new URL(href, SITE_URL).href; } catch { return null; }
}
async function get(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'OzarkRoost-SEO-Audit/1.0' } });
  return { res, html: await res.text() };
}
async function main() {
  const sitemap = await get(SITE_URL + '/sitemap.xml');
  if (!sitemap.res.ok) throw new Error('sitemap.xml returned HTTP ' + sitemap.res.status);
  const urls = [...sitemap.html.matchAll(/<loc>([^<]+)<\\/loc>/g)].map(m => m[1]).filter(u => u.startsWith(SITE_URL)).slice(0, MAX_PAGES);
  const queue = [...new Set(urls)];
  const seen = new Set();
  const issues = [];
  const pages = [];
  while (queue.length && seen.size < MAX_PAGES) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const {res, html} = await get(url);
      const title = textBetween(html, 'title');
      const description = attr(html, 'meta', 'name=["\\\']description["\\\']\\s+content');
      const canonical = attr(html, 'link', 'rel=["\\\']canonical["\\\']\\s+href');
      const h1s = [...html.matchAll(/<h1\\b[^>]*>([\\s\\S]*?)<\\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim()).filter(Boolean);
      const internal = links(html).map(absolute).filter(u => u && u.startsWith(SITE_URL));
      if (!res.ok) issues.push({url, issue:'http_status', detail:String(res.status)});
      if (!title) issues.push({url, issue:'missing_title'});
      if (!description) issues.push({url, issue:'missing_meta_description'});
      if (h1s.length !== 1) issues.push({url, issue:'h1_count', detail:String(h1s.length)});
      if (canonical && !canonical.startsWith(SITE_URL)) issues.push({url, issue:'canonical_offsite', detail:canonical});
      for (const u of internal) if (!seen.has(u) && queue.length < MAX_PAGES * 2) queue.push(u.split('#')[0]);
      pages.push({url,status:res.status,title,description,h1Count:h1s.length,internalLinks:internal.length});
    } catch (e) {
      issues.push({url, issue:'fetch_error', detail:e.message});
    }
  }
  const report = {site:SITE_URL, crawled:pages.length, issues:issues.length, pages, issues, generatedAt:new Date().toISOString()};
  console.log(JSON.stringify(report, null, 2));
  if (issues.some(i => i.issue === 'http_status' || i.issue === 'fetch_error')) process.exitCode = 1;
}
main().catch(e => { console.error(e.stack || e); process.exit(1); });
