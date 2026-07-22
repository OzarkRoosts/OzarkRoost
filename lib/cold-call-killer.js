/**
 * COLD CALL KILLER AI
 * 
 * Generates conversion-optimized cold emails and sales scripts that:
 * - Hook the prospect in the first line
 * - Build curiosity & urgency
 * - Address objections preemptively
 * - Close hard with a specific CTA
 * - A/B test subject lines automatically
 * 
 * This AI learns what works and gets better every day.
 */

const openai = require('openai');
const pool = require('../db/index');

const client = new openai.OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Cold Email Templates - The Foundation
 * These are battle-tested frameworks that work across industries
 */

const EMAIL_FRAMEWORKS = {
  // The "Problem-Agitate-Solve" pattern
  pas: `Subject: {{subject}}

Hi {{firstName}},

{{hook}}

Most {{targetAudience}} struggle with {{problem}}. We see it all the time.

{{agitate}}

Here's the thing: {{solution}}

{{proof}}

Want to see if it works for {{company}}? I can grab 15 minutes on your calendar: {{link}}

{{signature}}`,

  // The "Curiosity Gap" pattern
  curiosity: `Subject: {{subject}}

{{firstName}},

{{hook}}

I noticed {{observation}}.

Not a criticism—actually kind of brilliant. But here's what I'd probably test instead:

{{suggestion}}

One client saw {{result}}. Worth a quick call?

{{link}}

{{signature}}`,

  // The "Social Proof" pattern
  socialProof: `Subject: {{subject}}

Hey {{firstName}},

{{hook}}

{{companyName}} isn't alone in {{challenge}}. We've helped {{similar}} solve this.

{{proof1}}
{{proof2}}
{{proof3}}

The best part? {{benefit}}.

Curious if we can do the same for you. {{link}}

{{signature}}`,

  // The "Value Stack" pattern
  valueStack: `Subject: {{subject}}

{{firstName}},

Three reasons why {{company}} should talk to us:

1. {{benefit1}} — leads to {{outcome1}}
2. {{benefit2}} — leads to {{outcome2}}
3. {{benefit3}} — leads to {{outcome3}}

Most companies see ROI within {{timeline}}.

Worth a conversation? {{link}}

{{signature}}`,

  // The "Direct Challenge" pattern
  challenge: `Subject: {{subject}}

{{firstName}},

I'm going to be direct: {{company}} could probably {{improvement}}.

And based on {{insight}}, I think we could help.

{{proof}}

Open to a quick chat? {{link}}

{{signature}}`,
};

/**
 * Hook Library - Opens the email HARD
 * These are designed to stop thumb scrolls
 */

const HOOKS = {
  // Curiosity hooks
  curiosity: [
    'One thing caught my eye about {{company}}...',
    'I have a feeling you already know this, but...',
    'Your {{attribute}} caught my attention for a reason.',
    'I probably shouldn\'t send this, but here goes...',
    'Quick question that might sound random...',
  ],

  // Problem recognition
  problem: [
    'I\'ve seen {{company}} deal with {{challenge}} for months now.',
    'Most {{role}} we talk to are frustrated with {{problem}}.',
    'You\'re probably not thinking about {{opportunity}} right now, but you should be.',
    'Here\'s what I\'ve noticed: {{observation}}',
  ],

  // Flattery (subtle)
  flattery: [
    'Your {{achievement}} is actually impressive.',
    'The way {{company}} handles {{attribute}} is smart.',
    'I respect how {{company}} approaches {{area}}.',
  ],

  // Irreverence
  irreverence: [
    'Real talk: {{insight}}',
    'Unpopular opinion, but {{observation}}',
    'This might be spicy, but {{take}}',
  ],

  // Specificity
  specificity: [
    'Your post about {{topic}} got me thinking...',
    'I noticed you\'re connected to {{contact}} on LinkedIn...',
    'Your company recently {{activity}}, which triggered this...',
  ],
};

/**
 * Objection Killers - Preemptively destroy common objections
 */

const OBJECTION_RESPONSES = {
  'no_budget': 'Most don\'t have {{amount}} sitting around. But the companies that do this usually reallocate from {{currentSpend}}. Worth a conversation about whether there\'s a better use?',
  
  'too_expensive': 'Fair. Here\'s what we usually tell people: if you make {{revenue}} annually, losing {{loss}} to {{problem}} costs more than this would. But happy to show you a cheaper version.',
  
  'already_have_solution': 'Totally. How\'s {{currentSolution}} working for you? Most companies we talk to use {{competitor}} but found {{limitation}}. We\'re different because {{difference}}.',
  
  'need_to_think': 'Smart move. Here\'s what I\'d suggest: {{recommendation}}. Then we can actually see if this makes sense. Sound good?',
  
  'talk_to_team': 'Perfect. I\'d recommend we get {{keyPerson}} on a quick call. They usually care about {{metric}}. You cool with that?',

  'email_me_more': 'I could, but honestly? {{reason}}. How about this: 15 min to see if there\'s a fit, then I\'ll know whether to keep going.',
};

/**
 * Generate a cold email using OpenAI
 * This is where the magic happens
 */
async function generateColdEmail({
  firstName = 'John',
  lastName = 'Smith',
  company = 'Acme Corp',
  role = 'VP Marketing',
  industry = 'SaaS',
  painPoint = 'low conversion rates',
  solution = 'our platform',
  framework = 'pas',
  tone = 'professional-casual',
  aggressiveness = 'medium', // low, medium, high
}) {
  try {
    const baseTemplate = EMAIL_FRAMEWORKS[framework];

    const systemPrompt = `You are a world-class sales copywriter. You write cold emails that:
- Get opened (20%+ open rate)
- Get responses (8%+ reply rate)
- Get meetings (50%+ qualification rate)

You're ${aggressiveness === 'high' ? 'BOLD and direct' : aggressiveness === 'low' ? 'subtle and consultative' : 'confident and friendly'}.
Your tone is: ${tone}

Rules:
1. Hook in first 2 lines or it gets deleted
2. Make it about THEM, not us
3. Include specific proof/data
4. Ask for a specific action
5. Keep it SHORT (under 150 words)
6. Use their first name only
7. Create urgency without being pushy
8. Address an objection preemptively`;

    const userPrompt = `Generate a cold email following this template:

${baseTemplate}

Replace the variables:
- firstName: ${firstName}
- company: ${company}
- role: ${role}
- industry: ${industry}
- problem: ${painPoint}
- solution: ${solution}

Make it feel natural, like it's from one human to another who cares about them.
Add specific details that show you know their business.
Include a curiosity hook in the subject line.`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const emailContent = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract subject line and body
    const subjectMatch = emailContent.match(/Subject: (.+?)(?:\n|$)/);
    const subject = subjectMatch ? subjectMatch[1] : 'Quick thought about ' + company;
    const body = emailContent.replace(/Subject: .+?\n\n/, '');

    return {
      subject,
      body,
      framework,
      tokens: response.usage.input_tokens + response.usage.output_tokens,
      generated_at: new Date(),
    };
  } catch (err) {
    console.error('[Cold Call Killer] Email generation error:', err?.message);
    throw err;
  }
}

/**
 * Generate a cold call script - For when email won't cut it
 */
async function generateCallScript({
  firstName = 'John',
  company = 'Acme Corp',
  role = 'VP Marketing',
  painPoint = 'low conversion rates',
  solution = 'our platform',
  aggressiveness = 'medium',
}) {
  try {
    const systemPrompt = `You are a world-class sales trainer. Write a cold call script that:
- Gets past the gatekeeper
- Gets curiosity from the prospect
- Plants a seed of doubt about their current approach
- Ends with a specific ask
- Handles objections smoothly
- Sounds natural, not robotic

The caller is ${aggressiveness === 'high' ? 'BOLD and confident' : aggressiveness === 'low' ? 'consultative' : 'friendly and professional'}.

Script rules:
1. Keep pauses for prospect to respond
2. Use their first name
3. Get permission to continue ("mind if I take 30 seconds?")
4. Plant curiosity, don't sell
5. Handle objections with questions
6. End with one specific action`;

    const userPrompt = `Write a cold call script for:
- Prospect: ${firstName} ${role} at ${company}
- Problem they likely have: ${painPoint}
- Our solution: ${solution}

Make it sound like a real conversation with breathing room for responses.
Include natural objection handling (busy, no budget, wrong person).
Make it memorable, not forgettable.`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const script = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      script,
      aggressiveness,
      tokens: response.usage.input_tokens + response.usage.output_tokens,
      generated_at: new Date(),
    };
  } catch (err) {
    console.error('[Cold Call Killer] Script generation error:', err?.message);
    throw err;
  }
}

/**
 * Generate follow-up sequences - The money is in the follow-up
 */
async function generateFollowupSequence({
  firstName = 'John',
  company = 'Acme Corp',
  initialEmail = 'Check out this deal',
  days = 3,
}) {
  try {
    const systemPrompt = `You are a sales follow-up expert. You know that:
- 80% of deals happen after the 5th touch
- Most people give up after 2 tries
- The follow-up needs to be different each time, not just "following up"
- Each touch should add value or curiosity

Generate a multi-touch sequence that's:
1. Different angles each time
2. Short and punchy
3. Impossible to ignore
4. Gradually more direct`;

    const userPrompt = `Generate a ${days}-day follow-up sequence for:
- Prospect: ${firstName} at ${company}
- Initial email subject: "${initialEmail}"

For each follow-up:
1. Change the angle (new insight, social proof, limited offer, etc.)
2. Make it progressively more direct
3. Include a subject line that's different
4. Reference the previous email subtly

Format as:
Day X Subject: [subject]
[body]

Make each one IMPOSSIBLE to ignore.`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const sequence = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the sequence into individual emails
    const emails = sequence.split(/Day \d+/).filter(e => e.trim());

    return {
      sequence,
      email_count: emails.length,
      days,
      generated_at: new Date(),
    };
  } catch (err) {
    console.error('[Cold Call Killer] Sequence generation error:', err?.message);
    throw err;
  }
}

/**
 * A/B Test Subject Lines - Generate 5 variations
 */
async function generateSubjectLineVariations({
  company = 'Acme Corp',
  painPoint = 'conversion rates',
  solution = 'optimization',
}) {
  try {
    const systemPrompt = `You are a subject line master. You know what gets emails opened.

Generate 5 different subject lines that:
1. Create curiosity (makes reader HAVE to open)
2. Are specific (not generic)
3. Avoid spam triggers
4. Use power words strategically
5. Are all under 50 characters

Each should take a different angle:
1. Curiosity gap
2. Personalization
3. Social proof
4. Urgency/scarcity
5. Benefit/result`;

    const userPrompt = `Generate 5 subject line variations for an email to ${company}:

Problem: ${painPoint}
Solution: ${solution}

Make them click-worthy and test-worthy.
Format as:
1. [subject]
2. [subject]
etc.`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const variants = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      variants: variants.split('\n').filter(line => line.trim()),
      generated_at: new Date(),
    };
  } catch (err) {
    console.error('[Cold Call Killer] Subject line generation error:', err?.message);
    throw err;
  }
}

/**
 * Save email campaign to database for tracking
 */
async function saveCampaign({
  prospect_email,
  prospect_name,
  company,
  subject,
  body,
  framework,
  variant_id = 1,
}) {
  try {
    await pool.query(
      `INSERT INTO cold_email_campaigns 
       (prospect_email, prospect_name, company, subject_line, email_body, framework, variant_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', NOW())`,
      [prospect_email, prospect_name, company, subject, body, framework, variant_id]
    );
  } catch (err) {
    console.error('[Cold Call Killer] Save error:', err?.message);
  }
}

/**
 * Track email performance
 */
async function trackPerformance({
  campaign_id,
  event_type, // 'sent', 'opened', 'clicked', 'replied'
  metadata = {},
}) {
  try {
    await pool.query(
      `INSERT INTO cold_email_metrics 
       (campaign_id, event_type, metadata, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [campaign_id, event_type, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('[Cold Call Killer] Tracking error:', err?.message);
  }
}

module.exports = {
  generateColdEmail,
  generateCallScript,
  generateFollowupSequence,
  generateSubjectLineVariations,
  saveCampaign,
  trackPerformance,
  EMAIL_FRAMEWORKS,
  HOOKS,
  OBJECTION_RESPONSES,
};
