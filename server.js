  app.set('view engine', 'ejs'); app.set('views', path.join(__dirname, 'views'));
  app.get('/health', (_req, res) => res.json({ status: 'healthy' }));
  function publicBaseUrl(req) { if (process.env.APP_URL) return String(process.env.APP_URL).replace(/\/$/, ''); if (process.env.RENDER_EXTERNAL_URL) return String(process.env.RENDER_EXTERNAL_URL).replace(/\/$/, ''); const proto = req.get('x-forwarded-proto') || req.protocol || 'https'; return `${proto}://${req.get('host')}`; }
  const STATIC_SITEMAP_PATHS = ['/', '/listings', '/adventures', '/list-your-cabin', '/referral', '/operators', '/faq', '/guides/about-the-ozarks', '/guides/buffalo-river-cabins', '/guides/ozarks-adventures', '/guides/ozarks-camping-rv', '/guides/hidden-gem-cabins', '/guides/buffalo-river-kayaking', '/guides/hot-tub-cabins', '/guides/pet-friendly-cabins', '/guides/treehouse-rentals', '/guides/glamping-ozarks', '/guides/luxury-cabins', '/guides/ozarks-road-trip', '/guides/trip-planner', '/guides/best-things-to-do-eureka-springs', '/guides/buffalo-river-float-trips', '/guides/ozarks-waterfalls', '/guides/ozarks-weekend-getaway', '/guides/cabins-near-eureka-springs', '/guides/family-things-to-do-ozarks', '/guides/romantic-getaways-ozarks', '/guides/best-hiking-ozarks', '/guides/missouri-ozarks-float-trips', '/guides/best-ozarks-springs', '/guides/best-caves-in-the-ozarks', '/guides/ozarks-fishing-trips', '/guides/ozarks-camping', '/guides/ozarks-scenic-drives', '/guides/branson-outdoor-adventures', '/guides/bentonville-mountain-biking', '/guides/fayetteville-arkansas-outdoors', '/guides/ozarks-swimming-holes'];
  app.get('/sitemap.xml', (req, res) => { const base = publicBaseUrl(req); const paths = [...STATIC_SITEMAP_PATHS, ...adventures.map(a => `/adventures/${a.slug}`)]; const body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...paths.map(p => ['  <url>', `    <loc>${base}${p}</loc>`, '    <changefreq>weekly</changefreq>', `    <priority>${p === '/' ? '1.0' : p.startsWith('/adventures/') || p.startsWith('/guides/') ? '0.9' : '0.7'}</priority>`, '  </url>'].join('\n')), '</urlset>', ''].join('\n'); res.type('application/xml').send(body); });
  app.get('/robots.txt', (req, res) => { const base = publicBaseUrl(req); res.type('text/plain').send(`User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`); });
  app.get('/superagent-status', (_req, res) => { try { res.json(require('./lib/super-agent').getStatus()); } catch (err) { res.status(503).json({ error: 'Super Agent not enabled', detail: err.message }); } });
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));
  app.get('/campaign', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'campaign', 'index.html')));
  app.get('/', (_req, res) => res.render('layout', buildLandingContext()));
  app.get('/listings', async (_req, res) => {
    const { getAllListings } = require('./db/listing-submissions');
    const { getDirectoryCategories, getBundle } = require('./lib/affiliate-links');
    const listings = await getAllListings();
    res.render('listings', { listings, directoryCategories: getDirectoryCategories(), affiliateBundles: { stays: getBundle('stays'), camping: getBundle('camping'), adventure: getBundle('adventure'), gear: getBundle('gear') } });
  });
  app.get('/adventures', (_req, res) => { const { getBundle } = require('./lib/affiliate-links'); res.render('adventures', { adventures, categories, affiliateLinks: getBundle('adventure') }); });
  app.get('/adventures/:slug', (req, res) => {
    const adventure = getAdventureBySlug(req.params.slug);
    if (!adventure) return res.status(404).send('Adventure not found');
    const { getBundle } = require('./lib/affiliate-links');
    const relatedAdventures = adventures
      .filter(item => item.slug !== adventure.slug)
      .map(item => ({ item, score: (item.region === adventure.region ? 2 : 0) + (item.category === adventure.category ? 1 : 0) }))
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, 6)
      .map(({ item }) => item);
    return res.render('adventure-detail', { adventure, relatedAdventures, affiliateLinks: getBundle('adventure'), baseUrl: publicBaseUrl(req) });
  });
  const PARTNER_HOST_ALLOW = new Set(['stay22.com','www.stay22.com','hipcamp.com','www.hipcamp.com','rei.com','www.rei.com','getyourguide.com','www.getyourguide.com','viator.com','www.viator.com','outdoorsy.com','www.outdoorsy.com','rvshare.com','www.rvshare.com','vrbo.com','www.vrbo.com','booking.com','www.booking.com','publiclands.com','www.publiclands.com','expedia.com','www.expedia.com','hotels.com','www.hotels.com','kayak.com','www.kayak.com','tripadvisor.com','www.tripadvisor.com','klook.com','www.klook.com','alltrails.com','www.alltrails.com','amazon.com','www.amazon.com','airbnb.com','www.airbnb.com','recreation.gov','www.recreation.gov']);
  function isAllowedPartnerUrl(raw) { if (!isSafeExternalUrl(raw)) return false; try { const u = new URL(raw); return u.protocol === 'https:' && PARTNER_HOST_ALLOW.has(u.hostname.toLowerCase()); } catch { return false; } }
  app.get('/out', outLimiter, async (req, res) => { const listingId = sanitizeText(req.query.listing, 32); const partner = sanitizeText(req.query.partner, 40).toLowerCase(); const toRaw = typeof req.query.to === 'string' ? req.query.to : ''; if (toRaw && !listingId) { let target = toRaw; try { target = decodeURIComponent(toRaw); } catch {} if (!isAllowedPartnerUrl(target)) return res.redirect('/guides/hot-tub-cabins'); pool.query('INSERT INTO affiliate_clicks (listing_id, partner, user_agent, clicked_at) VALUES ($1, $2, $3, NOW())', [null, partner || 'direct', sanitizeText(req.headers['user-agent'], 300) || null]).catch(() => {}); return res.redirect(302, target); } if (!listingId || !partner || !/^\d+$/.test(listingId)) return res.redirect('/listings'); try { const row = await pool.query("SELECT website_url FROM listing_submissions WHERE id = $1 AND (payment_status = 'paid' OR (payment_status = 'free' AND created_at >= NOW() - INTERVAL '90 days'))", [listingId]); if (!row.rows[0]) return res.redirect('/listings'); const target = row.rows[0].website_url; if (!isSafeExternalUrl(target)) return res.redirect('/listings'); pool.query('INSERT INTO affiliate_clicks (listing_id, partner, user_agent, clicked_at) VALUES ($1, $2, $3, NOW())', [listingId, partner, sanitizeText(req.headers['user-agent'], 300) || null]).catch(err => console.error('[affiliate_clicks] insert error:', err?.message)); return res.redirect(302, target); } catch (err) { console.error('[/out route] error:', err?.message); return res.redirect('/listings'); } });
  app.use('/list-your-cabin', formLimiter, require('./routes/list-your-cabin'));
  app.use('/referral', formLimiter, require('./routes/referral'));
  app.use('/operators', formLimiter, require('./routes/operators'));
  app.use('/guides', require('./routes/guides'));
  app.use('/guides', require('./routes/high-intent-guides'));
  app.use('/api/affiliate', apiLimiter, require('./routes/affiliate-api'));
  app.use('/api/health', apiLimiter, require('./routes/health-api'));
  app.use('/api/killer', apiLimiter, require('./routes/killer-api'));
  app.use('/api/autonomous', apiLimiter, require('./routes/autonomous-api'));
  app.use('/api/opsbot', apiLimiter, require('./routes/opsbot-api'));
  app.use('/api/rover', apiLimiter, require('./routes/rover'));
  app.get('/faq', (_req, res) => res.render('faq'));
  app.use(errorTracker.errorHandler());
  app.listen(port, () => console.log(`Server running on port ${port}`));
}
startServer().catch(err => { console.error('[startup] Fatal error:', err.message); process.exit(1); });
