#!/usr/bin/env node

/**
 * Cold Call Killer CLI
 * Generate emails, scripts, and manage campaigns from the command line
 * 
 * Usage:
 *   node scripts/killer-cli.js email --company "Acme Corp" --pain "low conversions" --solution "our platform"
 *   node scripts/killer-cli.js script --company "Acme Corp" --pain "low conversions"
 *   node scripts/killer-cli.js sequence --company "Acme Corp"
 *   node scripts/killer-cli.js performance
 *   node scripts/killer-cli.js hot-leads
 */

require('dotenv').config();

const killer = require('../lib/cold-call-killer');
const killerDb = require('../db/cold-call-killer');

const command = process.argv[2];
const args = require('minimist')(process.argv.slice(3));

async function generateEmail() {
  console.log('\n📧 COLD EMAIL GENERATOR\n');
  console.log('='.repeat(70));

  const email = await killer.generateColdEmail({
    firstName: args.firstName || 'John',
    lastName: args.lastName || 'Smith',
    company: args.company || 'Acme Corp',
    role: args.role || 'VP Marketing',
    painPoint: args.pain || 'low conversion rates',
    solution: args.solution || 'our platform',
    framework: args.framework || 'pas',
    aggressiveness: args.aggressive || 'medium',
  });

  console.log('\n📬 SUBJECT LINE');
  console.log(`   ${email.subject}\n`);

  console.log('📝 EMAIL BODY');
  console.log('='.repeat(70));
  console.log(email.body);
  console.log('='.repeat(70));

  console.log(`\n✅ Framework: ${email.framework}`);
  console.log(`🎯 Ready to send!\n`);
}

async function generateScript() {
  console.log('\n📞 COLD CALL SCRIPT\n');
  console.log('='.repeat(70));

  const script = await killer.generateCallScript({
    firstName: args.firstName || 'John',
    company: args.company || 'Acme Corp',
    role: args.role || 'VP Marketing',
    painPoint: args.pain || 'low conversion rates',
    solution: args.solution || 'our platform',
    aggressiveness: args.aggressive || 'medium',
  });

  console.log('\n📞 SCRIPT\n');
  console.log(script.script);
  console.log('\n' + '='.repeat(70));
  console.log('💡 Tips:');
  console.log('   • Breathe naturally between lines');
  console.log('   • Let them respond - this is a conversation');
  console.log('   • Use their first name once');
  console.log('   • Pause for their responses\n');
}

async function generateSequence() {
  console.log('\n🔄 FOLLOW-UP SEQUENCE\n');
  console.log('='.repeat(70));

  const sequence = await killer.generateFollowupSequence({
    firstName: args.firstName || 'John',
    company: args.company || 'Acme Corp',
    initialEmail: args.subject || 'Quick thought about your business',
    days: args.days || 5,
  });

  console.log('\n📧 FOLLOW-UP SEQUENCE\n');
  console.log(sequence.sequence);
  console.log('\n' + '='.repeat(70));
  console.log('💡 The Money is in Follow-up:');
  console.log('   • 80% of deals happen after 5+ touches');
  console.log('   • Each follow-up should be different');
  console.log('   • Be more direct each time');
  console.log('   • Never give up!\n');
}

async function generateSubjects() {
  console.log('\n🎯 A/B TEST SUBJECT LINES\n');
  console.log('='.repeat(70));

  const variants = await killer.generateSubjectLineVariations({
    company: args.company || 'Acme Corp',
    painPoint: args.pain || 'low conversion rates',
    solution: args.solution || 'our platform',
  });

  console.log('\n📬 TEST THESE SUBJECT LINES\n');
  variants.variants.forEach((variant, i) => {
    console.log(`  ${i + 1}. ${variant.trim()}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('💡 A/B Testing Tips:');
  console.log('   • Test all 5 variants');
  console.log('   • Track opens for each');
  console.log('   • Run for 7-14 days minimum');
  console.log('   • Use winner for main campaign\n');
}

async function showPerformance() {
  console.log('\n📊 CAMPAIGN PERFORMANCE\n');
  console.log('='.repeat(70));

  const stats = await killerDb.getPerformanceStats();
  const frameworks = await killerDb.getTopFrameworks();

  console.log('\n📈 OVERALL METRICS');
  console.log(`  Total Campaigns: ${stats.total_campaigns || 0}`);
  console.log(`  Emails Sent: ${stats.emails_sent || 0}`);
  console.log(`  Emails Opened: ${stats.emails_opened || 0}`);
  console.log(`  Emails Replied: ${stats.emails_replied || 0}`);
  console.log(`  Qualified Leads: ${stats.qualified_leads || 0}`);
  console.log(`  Meetings Booked: ${stats.meetings_booked || 0}`);

  console.log('\n📊 CONVERSION RATES');
  console.log(`  Open Rate: ${stats.open_rate || 0}%`);
  console.log(`  Reply Rate: ${stats.reply_rate || 0}%`);

  console.log('\n🏆 TOP FRAMEWORKS');
  if (frameworks.length > 0) {
    frameworks.slice(0, 5).forEach((f, i) => {
      console.log(
        `  ${i + 1}. ${f.framework}: ${f.reply_rate || 0}% reply rate (${f.campaigns} campaigns)`
      );
    });
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

async function showHotLeads() {
  console.log('\n🔥 HOT LEADS\n');
  console.log('='.repeat(70));

  const hotLeads = await killerDb.getHotLeads();

  if (hotLeads.length === 0) {
    console.log('\nNo hot leads yet. Keep sending!\n');
    return;
  }

  console.log('\n🎯 ENGAGED PROSPECTS\n');
  hotLeads.forEach((lead, i) => {
    console.log(`  ${i + 1}. ${lead.prospect_name} at ${lead.company}`);
    console.log(`     Email: ${lead.prospect_email}`);
    console.log(`     Opens: ${lead.opens || 0} | Clicks: ${lead.clicks || 0} | Replies: ${lead.replies || 0}`);
    if (lead.last_reply) {
      console.log(`     Last reply: ${new Date(lead.last_reply).toLocaleDateString()}`);
    }
    console.log();
  });

  console.log('='.repeat(70));
  console.log('💡 NEXT ACTION: Call these leads ASAP!\n');
}

async function showDrafts() {
  console.log('\n📝 DRAFT CAMPAIGNS\n');
  console.log('='.repeat(70));

  const drafts = await killerDb.getDraftCampaigns(10);

  if (drafts.length === 0) {
    console.log('\nNo drafts. Generate one first!\n');
    return;
  }

  console.log(`\n📋 READY TO SEND (${drafts.length} drafts)\n`);
  drafts.forEach((draft, i) => {
    console.log(`  ${i + 1}. ${draft.prospect_name} at ${draft.company}`);
    console.log(`     Subject: "${draft.subject_line}"`);
    console.log(`     Framework: ${draft.framework}`);
    console.log();
  });

  console.log('='.repeat(70));
  console.log('💡 NEXT ACTION: Review and send these emails!\n');
}

async function main() {
  if (!command) {
    console.log(`
🔪 COLD CALL KILLER - Sales Email & Script Generator

Commands:
  email          Generate a cold email
  script         Generate a call script
  sequence       Generate follow-up sequence
  subjects       Generate A/B test subject lines
  performance    Show campaign performance
  hot-leads      Show engaged prospects
  drafts         Show emails ready to send

Options:
  --company      Target company name
  --firstName    Prospect first name
  --lastName     Prospect last name  
  --pain         Their pain point
  --solution     Your solution
  --framework    Email framework (pas, curiosity, socialProof, valueStack, challenge)
  --aggressive   Aggressiveness level (low, medium, high)
  --days         Days for follow-up sequence (default: 5)

Examples:
  node scripts/killer-cli.js email --company "Acme Corp" --pain "low conversions"
  node scripts/killer-cli.js script --company "Acme Corp" --pain "leads dropping off"
  node scripts/killer-cli.js sequence --company "Acme Corp" --days 7
  node scripts/killer-cli.js performance
  node scripts/killer-cli.js hot-leads
    `);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'email':
        await generateEmail();
        break;
      case 'script':
        await generateScript();
        break;
      case 'sequence':
        await generateSequence();
        break;
      case 'subjects':
        await generateSubjects();
        break;
      case 'performance':
        await showPerformance();
        break;
      case 'hot-leads':
        await showHotLeads();
        break;
      case 'drafts':
        await showDrafts();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err?.message);
    process.exit(1);
  }
}

main();
