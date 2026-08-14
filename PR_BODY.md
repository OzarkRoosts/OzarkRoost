This PR deploys the initial Ozark Roost monetization scaffold:

- Minimal static site (index, styles)
- Affiliate config and click-tracking
- Lead magnet and welcome email templates
- GitHub Pages workflow (auto-deploy on merge)
- Sitemap, robots, and social post templates

After merging, set the GA4 Measurement ID (meta[name="ga-id"]) in Pages repo settings or via environment injection and add real affiliate URLs to affiliates.json. Merge to publish and verify tracking.
