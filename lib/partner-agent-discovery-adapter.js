const pool = require('../db/index');

async function discoverCandidates({ kind, limit = 25 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 50);
  const result = await pool.query(`
    SELECT id, name, category, partner_type, website_url, application_url, source_url,
           region, fit_score, commission_notes, contact_notes, status, verification_status, metadata
    FROM partner_prospects
    WHERE fit_score >= 60
      AND verification_status IN ('verified_source','needs_review','unverified')
      AND ($1 = 'affiliate' AND partner_type = 'affiliate'
           OR $1 = 'sponsorship' AND partner_type IN ('direct','partner'))
    ORDER BY fit_score DESC, updated_at DESC
    LIMIT $2
  `, [kind, safeLimit]);

  return result.rows.map(row => {
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const contactEmail = metadata.contactEmail || null;
    const hasApplicationPath = Boolean(row.application_url);
    return {
      name: row.name,
      category: row.category,
      programUrl: row.website_url,
      applicationUrl: row.application_url,
      sourceUrl: row.source_url || row.website_url,
      sourceName: 'OzarkRoost partner discovery',
      geographicRelevance: Math.min(1, (Number(row.fit_score) || 0) / 100),
      travelerIntent: ['lodging','experiences','camping','rv','tourism'].includes(row.category) ? 1 : 0.75,
      commercialValue: Math.min(1, (Number(row.fit_score) || 0) / 100),
      integrationEffort: hasApplicationPath ? 0.3 : 0.6,
      approvalLikelihood: hasApplicationPath ? 0.75 : 0.5,
      audienceFit: Math.min(1, (Number(row.fit_score) || 0) / 100),
      geographicFit: Math.min(1, (Number(row.fit_score) || 0) / 100),
      businessRelevance: 0.9,
      responseLikelihood: 0.65,
      sponsorshipValue: 0.7,
      policyCompatible: true,
      automationPermitted: kind === 'sponsorship' ? Boolean(contactEmail) : Boolean(metadata.automationPermitted && hasApplicationPath),
      requiredFieldsAvailable: kind === 'sponsorship' ? Boolean(contactEmail) : hasApplicationPath,
      contactMethodAvailable: Boolean(contactEmail || metadata.contactUrl || row.website_url),
      contactEmail,
      contactUrl: metadata.contactUrl || row.website_url || null,
      metadata: { discoveryId: row.id, region: row.region, verificationStatus: row.verification_status },
    };
  });
}

module.exports = { discoverCandidates };
