const fs = require('fs');
const path = require('path');

// Enhanced affiliate generator
// Supports affiliate objects with { id, url, project, product_id, pay_link }
// Generates:
//  - affiliates.json (normalized)
//  - r/<id>.html redirect pages that POST a tracking beacon (via JS fetch) then redirect
//  - payments/<id>.html redirect pages for pay_link if present//  - affiliate-index.html listing ids with project/product info

function safeJsonParse(s){ try { return JSON.parse(s) } catch(e) { return null } }

function main(){
  const cwd = process.cwd();
  const outFile = path.join(cwd, 'affiliates.json');
  let json = null;
  if (process.env.AFFILIATES_JSON){
    json = safeJsonParse(process.env.AFFILIATES_JSON);
    if (!json) { console.error('AFFILIATES_JSON parse error'); process.exit(1); }
  } else if (fs.existsSync(outFile)){
    json = safeJsonParse(fs.readFileSync(outFile,'utf8'));
  } else {
    console.log('No affiliates.json or AFFILIATES_JSON provided; writing empty list');
    json = { affiliates: [] };
  }

  // Normalize entries: ensure required fields and defaults
  json.affiliates = (json.affiliates || []).map(a => ({
    id: String(a.id || a.key || a.name || '').trim(),
    url: a.url || '',
    project: a.project || 'default',
    product_id: a.product_id || a.pid || '',
    pay_link: a.pay_link || ''
  })).filter(a => a.id && a.url);

  fs.writeFileSync(outFile, JSON.stringify(json, null, 2));
  console.log('Wrote affiliates.json with', json.affiliates.length, 'entries');

  const rDir = path.join(cwd, 'r');
  if (!fs.existsSync(rDir)) fs.mkdirSync(rDir);
  const payDir = path.join(cwd, 'payments');
  if (!fs.existsSync(payDir)) fs.mkdirSync(payDir);

  // Generate redirect pages that POST a tracking beacon to /_track (if available), then redirect.
  json.affiliates.forEach(a => {
    const fname = path.join(rDir, `${a.id}.html`);
    // Use a small script to attempt a POST to /_track with project/id/product, then navigate to target.
    const html = `<!doctype html>\n<html><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex\">\n<title>Redirecting...</title></head><body>Redirecting... <a href=\"${a.url}\">continue</a>\n<script>\n(function(){\n  var payload = { project: ${JSON.stringify(a.project)}, id: ${JSON.stringify(a.id)}, product_id: ${JSON.stringify(a.product_id)}, ts: Date.now() };\n  try{\n    // fire-and-forget send to local tracking endpoint if available\n    fetch('/_track', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload), keepalive: true }).catch(()=>{});\n  }catch(e){}\n  // fallback: after 250ms, navigate to affiliate URL\n  setTimeout(function(){ window.location = ${JSON.stringify(a.url)}; }, 250);\n})();\n</script></body></html>`;
    fs.writeFileSync(fname, html);
    console.log('Wrote redirect', fname);

    if (a.pay_link){
      const pfile = path.join(payDir, `${a.id}.html`);
      const phtml = `<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0;url=${a.pay_link}\"><meta name=\"robots\" content=\"noindex\"><title>Redirecting to payment</title></head><body>Redirecting to payment... <a href=\"${a.pay_link}\">pay</a></body></html>`;
      fs.writeFileSync(pfile, phtml);
      console.log('Wrote payment redirect', pfile);
    }
  });

  // Generate affiliate index with richer info
  const idx = path.join(cwd, 'affiliate-index.html');
  const listHtml = `<!doctype html><html><head><meta charset=\"utf-8\"><title>Affiliates</title></head><body><h1>Affiliates</h1><ul>${json.affiliates.map(a=>`<li><strong>${a.id}</strong> (project: ${a.project}, product: ${a.product_id}) - <a href=\"/r/${a.id}.html\">visit</a>${a.pay_link?` - <a href=\"/payments/${a.id}.html\">pay</a>`:''}</li>`).join('')}</ul></body></html>`;
  fs.writeFileSync(idx, listHtml);
  console.log('Wrote affiliate-index.html');
}

main();

