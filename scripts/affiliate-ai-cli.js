#!/usr/bin/env node

/**
 * Affiliate AI Command Line Interface
 * 
 * Usage:
 *   node scripts/affiliate-ai-cli.js report      — Show revenue report
 *   node scripts/affiliate-ai-cli.js scan        — Run opportunity scan
 *   node scripts/affiliate-ai-cli.js status      — Show current status
 *   node scripts/affiliate-ai-cli.js opportunities — List top opportunities
 */

require('dotenv').config();

const affiliateAI = require('../lib/affiliate-ai-engine');
const affiliateRevenue = require('../db/affiliate-revenue');

const command = process.argv[2];

async function showReport() {
  console.log('\n📊 AFFILIATE REVENUE REPORT\n');
  console.log('='.repeat(60));
  
  const report = await affiliateAI.generateReport();
  const revenueProj = await affiliateRevenue.getRevenueProjection();
  const platformPerf = await affiliateRevenue.getPlatformPerformance();
  
  console.log('\n💰 MONETIZATION STATUS');
  console.log(`  Pending Opportunities: ${report.monetization_status?.pending_opportunities || 0}`);
  console.log(`  Pending Value: $${(report.monetization_status?.pending_value || 0).toFixed(2)}`);
  console.log(`  Implemented: ${report.monetization_status?.implemented_opportunities || 0}`);
  console.log(`  Implemented Value: $${(report.monetization_status?.implemented_value || 0).toFixed(2)}`);
  
  console.log('\n📈 REVENUE PROJECTIONS');
  console.log(`  Daily Average: $${revenueProj.daily_average.toFixed(2)}`);
  console.log(`  Monthly Projection: $${revenueProj.monthly_projection.toFixed(2)}`);
  console.log(`  Quarterly Projection: $${revenueProj.quarterly_projection.toFixed(2)}`);
  console.log(`  Annual Projection: $${(revenueProj.monthly_projection * 12).toFixed(2)}`);
  
  console.log('\n🎯 TOP PLATFORMS');
  for (const platform of (report.platforms || []).slice(0, 5)) {
    console.log(`  ${platform.platform}: ${platform.opportunity_count} opportunities, $${platform.total_potential.toFixed(2)} potential`);
  }
  
  console.log('\n📍 TOP PAGES FOR MONETIZATION');
  for (const page of (report.top_pages || []).slice(0, 5)) {
    console.log(`  ${page.page_path}: ${page.opportunity_count} opportunities, $${page.total_potential.toFixed(2)} potential`);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  process.exit(0);
}

async function runScan() {
  console.log('\n🔍 RUNNING OPPORTUNITY SCAN\n');
  console.log('Scanning all pages for monetization gaps...\n');
  
  await affiliateAI.runOpportunityScan();
  
  const opps = await affiliateRevenue.getTopOpportunities(10);
  console.log(`\nFound ${opps.length} top opportunities:\n`);
  
  for (const opp of opps) {
    console.log(`  • ${opp.page_path}`);
    console.log(`    Platform: ${opp.platform} | Type: ${opp.opportunity_type}`);
    console.log(`    Potential: $${opp.estimated_value.toFixed(2)} | Priority: ${opp.priority}/10\n`);
  }
  
  process.exit(0);
}

async function showStatus() {
  console.log('\n✅ AFFILIATE AI STATUS\n');
  console.log('='.repeat(60));
  
  const pendingValue = await affiliateRevenue.getTotalPendingValue();
  const implementedValue = await affiliateRevenue.getImplementedValue();
  const dailyRevenue = await affiliateRevenue.estimateDailyRevenue();
  const pageStatus = await affiliateRevenue.getPageMonetizationStatus();
  
  console.log(`\n💵 Today's Estimated Revenue: $${dailyRevenue.toFixed(2)}`);
  console.log(`💰 Pending Opportunity Value: $${pendingValue.toFixed(2)}`);
  console.log(`✨ Already Monetized: $${implementedValue.toFixed(2)}`);
  console.log(`📄 Pages Being Tracked: ${pageStatus.length}`);
  
  const fullyMonetized = pageStatus.filter(p => 
    p.has_cabin_links && p.has_activity_links && p.has_rv_links
  ).length;
  
  console.log(`✅ Fully Monetized Pages: ${fullyMonetized}/${pageStatus.length}`);
  
  console.log('\n' + '='.repeat(60) + '\n');
  process.exit(0);
}

async function showOpportunities() {
  console.log('\n🎯 TOP 20 MONETIZATION OPPORTUNITIES\n');
  console.log('='.repeat(80));
  
  const opps = await affiliateRevenue.getTopOpportunities(20);
  
  let lastPage = null;
  for (const opp of opps) {
    if (opp.page_path !== lastPage) {
      console.log(`\n📄 ${opp.page_path}`);
      lastPage = opp.page_path;
    }
    
    console.log(
      `  [${opp.priority}/10] ${opp.opportunity_type.padEnd(15)} → ${opp.platform.padEnd(10)} $${opp.estimated_value.toFixed(2).padStart(8)}`
    );
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
}

async function main() {
  if (!command) {
    console.log(`
Affiliate AI CLI — Revenue Monitoring & Optimization

Usage:
  node scripts/affiliate-ai-cli.js report           Show revenue report & projections
  node scripts/affiliate-ai-cli.js scan             Run opportunity scan
  node scripts/affiliate-ai-cli.js status           Show current status
  node scripts/affiliate-ai-cli.js opportunities    List top opportunities
    `);
    process.exit(0);
  }
  
  try {
    switch (command) {
      case 'report':
        await showReport();
        break;
      case 'scan':
        await runScan();
        break;
      case 'status':
        await showStatus();
        break;
      case 'opportunities':
        await showOpportunities();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err?.message);
    process.exit(1);
  }
}

main();
