Analytics & affiliate tracking setup

1) Google Analytics 4 (GA4)
   - Create a GA4 property and copy the measurement ID (G-XXXXXXX).
   - Replace MEASUREMENT_ID in index.html.
   - In GA, create events for 'affiliate_click' (use link click events) and 'newsletter_signup'.

2) Affiliate click tracking
   - Add `data-affiliate="AFFILIATE_ID"` to affiliate <a> tags.
   - Add a small click handler (or use gtag) to send an `affiliate_click` event to GA with the product ID and affiliate network.

3) Conversion tracking
   - Track purchases via the affiliate network's conversion pixels (if they provide them), or track outbound clicks as proxy conversions.

4) Verify
   - Use GA real-time reports and Tag Assistant to confirm events fire.

Notes: Credentials for affiliate networks and Mailchimp/ConvertKit are required to enable payouts and webhook subscriptions. Store secrets externally — do not commit them to this repo.
