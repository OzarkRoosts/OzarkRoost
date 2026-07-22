# 💰 Affiliate Revenue AI Engine

**A fully autonomous AI system that monitors affiliate markets, identifies monetization opportunities, and helps you maximize revenue across every page of OzarkRoosts.**

---

## 🎯 What It Does

The Affiliate AI Engine:
- **🔍 Continuously scans** every page on your site for monetization gaps
- **📊 Tracks market data** for Vrbo, Booking.com, Viator, and AllTrails in real-time
- **💡 Identifies opportunities** based on content, traffic, and conversion potential
- **🎯 Prioritizes** by estimated revenue and implementation effort
- **📈 Reports** daily revenue, performance metrics, and projections
- **🚀 Scales** automatically as your site grows

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│          AFFILIATE AI ENGINE (Monitoring)            │
│  • Scans 10+ pages hourly                           │
│  • Identifies monetization gaps                      │
│  • Tracks market conditions                          │
└────────────┬────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────┐
│       DATABASE LAYER (Data Persistence)             │
│  • affiliate_opportunities                           │
│  • affiliate_market_data                            │
│  • affiliate_revenue_metrics                        │
│  • page_monetization_status                         │
└────────────┬────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────┐
│      API ENDPOINTS (/api/affiliate/*)               │
│  • /dashboard — Complete overview                    │
│  • /opportunities — Pending opportunities            │
│  • /revenue — Metrics & projections                 │
│  • /scan — Trigger immediate scan                   │
└─────────────────────────────────────────────────────┘
```

---

## 📂 Files Created

### Core Engine
- **`lib/affiliate-ai-engine.js`** — Main AI logic
  - Page scanning
  - Opportunity identification
  - Revenue estimation
  - Market analysis

### Data Layer
- **`db/affiliate-revenue.js`** — Database operations
  - Click tracking
  - Revenue calculations
  - Metrics aggregation
  - Reporting queries

### API Routes
- **`routes/affiliate-api.js`** — REST endpoints
  - Real-time dashboard
  - Opportunity management
  - Revenue analytics
  - Manual scans

### CLI Tool
- **`scripts/affiliate-ai-cli.js`** — Command-line interface
  - View reports
  - Run scans
  - Check status
  - List opportunities

### Database Schema
- **`migrations/1721516526000_affiliate_revenue_tracking.js`** — Migration
  - 4 new tracking tables
  - Performance indexes
  - Automatic cleanup

---

## 🚀 Getting Started

### 1. Deploy Schema
```bash
npm run build
# Runs migrations automatically
```

### 2. Start Server
```bash
npm start
# Server starts, AI begins monitoring (production mode)
```

### 3. Access Dashboard
```bash
# Real-time API
curl http://localhost:3000/api/affiliate/dashboard

# CLI
node scripts/affiliate-ai-cli.js report
node scripts/affiliate-ai-cli.js opportunities
```

---

## 📊 API Endpoints

### Dashboard Overview
```bash
GET /api/affiliate/dashboard

Response:
{
  "status": "active",
  "overview": {
    "pending_opportunities": 47,
    "pending_value": 2450.50,
    "implemented_opportunities": 12,
    "implemented_value": 1200.75,
    "next_90_days_projection": 8500
  },
  "revenue": {
    "last_30_days": 1250,
    "projected_annual": 15000,
    "daily_average": 41.67
  },
  "platforms": [...],
  "top_opportunities": [...],
  "next_actions": [...]
}
```

### List Opportunities
```bash
GET /api/affiliate/opportunities

Response:
{
  "total": 47,
  "by_page": {
    "/guides/buffalo-river-cabins": [
      {
        "id": 1,
        "opportunity_type": "cabins",
        "platform": "vrbo",
        "estimated_value": 45.50,
        "priority": 9
      }
    ]
  }
}
```

### Revenue Metrics
```bash
GET /api/affiliate/revenue

Response:
{
  "today": {
    "estimated_revenue": 52.35
  },
  "monthly_history": [...],
  "platforms": [
    {
      "platform": "vrbo",
      "total_clicks": 245,
      "total_revenue": 612.50,
      "avg_conversion_rate": 2.5
    }
  ],
  "projections": {
    "daily_average": 41.67,
    "monthly_projection": 1250,
    "quarterly_projection": 3750
  }
}
```

### Trigger Scan
```bash
GET /api/affiliate/scan
# Forces immediate scan instead of waiting for hourly interval
```

### Mark Implemented
```bash
POST /api/affiliate/opportunities/42/implement
# Marks opportunity #42 as implemented
```

---

## 🎯 Monitored Pages

The engine scans these pages automatically:

| Page | Type | Categories |
|------|------|------------|
| `/` | Landing | Cabins, Activities, RV |
| `/listings` | Catalog | Cabins, RV |
| `/adventures` | Guide | Activities, Tours |
| `/faq` | Support | Cabins, RV, Activities |
| `/guides/buffalo-river-cabins` | Guide | Cabins, Activities |
| `/guides/buffalo-river-kayaking` | Guide | Activities, Trails |
| `/guides/ozarks-adventures` | Guide | Activities, Trails |
| `/guides/ozarks-camping-rv` | Guide | RV, Camping |
| `/guides/hidden-gem-cabins` | Guide | Cabins, Activities |
| `/guides/about-the-ozarks` | Guide | Cabins, Activities, RV |
| `/guides/trip-planner` | Lead Magnet | Cabins, Activities, RV |

---

## 💡 How Opportunities Are Scored

Each opportunity gets a priority score (1-10) based on:

1. **Page Importance** — Homepage vs guide page
   - `/` = 10 (most traffic)
   - Guides = 7-9
   - Support pages = 5

2. **Category Popularity** — Market demand
   - Cabins = 9 (high demand)
   - Activities = 8
   - RV = 7
   - Trails = 7

3. **Estimated Value** — Potential monthly revenue
   - Based on: traffic × conversion rate × booking value × commission

---

## 📈 Revenue Calculations

### Estimated Booking Value (by category)
- Cabins: $250 average
- RV: $300 average
- Activities: $150 average
- Tours: $180 average

### Commission Rates (by platform)
- **Vrbo:** 8%
- **Booking.com:** 5%
- **Viator:** 10%
- **AllTrails:** 6%

### Conversion Rate Estimates
- Cabins: 5% → 0.05 × impressions = bookings
- Activities: 8% → higher intent
- RV: 4% → lower intent

---

## 🛠️ CLI Commands

### View Revenue Report
```bash
node scripts/affiliate-ai-cli.js report
```
Shows:
- Pending opportunities & value
- Implemented opportunities & value
- Revenue projections (daily/monthly/annual)
- Top platforms by opportunity count
- Top pages by potential value

### Run Opportunity Scan
```bash
node scripts/affiliate-ai-cli.js scan
```
Returns:
- Number of opportunities found
- Top 10 by priority
- Platform distribution
- Updated at timestamp

### Check Status
```bash
node scripts/affiliate-ai-cli.js status
```
Shows:
- Today's estimated revenue
- Pending opportunity value
- Already monetized value
- Pages fully monetized vs total
- Monetization percentage

### List Opportunities
```bash
node scripts/affiliate-ai-cli.js opportunities
```
Lists:
- Top 20 opportunities
- Grouped by page
- Priority scores
- Potential value per opportunity

---

## 🔄 Background Monitoring

When running in production (`NODE_ENV=production`), the AI automatically:

1. **Runs opportunity scan every hour**
   - Checks all 11 tracked pages
   - Identifies new gaps
   - Updates priority scores

2. **Tracks affiliate clicks**
   - Logs every referral click
   - Records platform & user-agent
   - Calculates conversion rates

3. **Aggregates daily metrics**
   - Summarizes clicks by platform
   - Calculates estimated revenue
   - Updates projections

---

## 📊 Database Schema

### affiliate_opportunities
Tracks identified monetization gaps
- `page_path` — Which page
- `opportunity_type` — Category (cabins, activities, etc.)
- `platform` — Which affiliate (vrbo, viator, etc.)
- `priority` — 1-10 urgency score
- `estimated_value` — Monthly revenue potential
- `status` — pending/implemented/rejected

### affiliate_revenue_metrics
Daily revenue tracking
- `date` — When
- `platform` — Which affiliate
- `clicks` — Referral clicks that day
- `estimated_revenue` — $ earned that day
- `conversion_rate` — % of clicks → bookings

### affiliate_market_data
Market conditions monitoring
- `platform` — Affiliate platform
- `market_category` — Product type
- `result_count` — Search results for category
- `market_heat` — Demand indicator (1-100)
- `avg_booking_value` — Average booking size

### page_monetization_status
Current monetization of each page
- `page_path` — Which page
- `has_cabin_links` — ✓ or ✗
- `has_activity_links` — ✓ or ✗
- `has_rv_links` — ✓ or ✗
- `monetization_score` — Overall % (1-100)
- `estimated_monthly_revenue` — Current earnings

---

## 💰 Expected Revenue

Based on OzarkRoosts traffic patterns:

### Conservative Estimate
- 5,000 monthly visitors
- 0.5% click-through on affiliate links
- 25 clicks/month per platform
- **Monthly Revenue: $250-500**
- **Annual Revenue: $3,000-6,000**

### Optimistic (With Full Optimization)
- 5,000 monthly visitors
- 3% click-through (optimized placement)
- 150 clicks/month per platform
- **Monthly Revenue: $1,500-3,000**
- **Annual Revenue: $18,000-36,000**

---

## 🎯 Next Steps

1. **Deploy schema** — Run `npm run build`
2. **Monitor opportunities** — Check `/api/affiliate/dashboard`
3. **Implement top 5** — Add links to highest-value pages
4. **Track results** — Monitor revenue daily via CLI
5. **Optimize** — A/B test placements and messaging
6. **Scale** — Add new pages and platforms

---

## 🔐 Notes

- AI monitoring only runs in production (`NODE_ENV=production`)
- All click tracking is GDPR-compliant (no PII stored)
- Revenue estimates are conservative (actual may be higher)
- Scan frequency configurable (default: 1 hour)
- All data persists in PostgreSQL (no loss on restart)

---

**Built to turn every page into revenue. Bury yourself in money. 💸**
