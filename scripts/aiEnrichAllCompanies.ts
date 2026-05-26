// @ts-nocheck
/**
 * AI Enrichment Script for All Companies
 *
 * This script:
 * 1. Finds all companies missing enrichment data
 * 2. Uses Claude AI to generate missing fields
 * 3. Marks all AI-generated data with "claude_ai" source
 * 4. Updates field-level tracking for transparency
 *
 * Usage: npx ts-node scripts/aiEnrichAllCompanies.ts
 */

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface EnrichmentStats {
  companiesProcessed: number;
  companiesEnriched: number;
  companiesSkipped: number;
  totalFieldsEnriched: number;
}

async function aiEnrichAllCompanies() {
  console.log('🤖 AI Enrichment for All Companies\n');
  console.log('This will enrich all companies missing data using Claude AI\n');

  const stats: EnrichmentStats = {
    companiesProcessed: 0,
    companiesEnriched: 0,
    companiesSkipped: 0,
    totalFieldsEnriched: 0,
  };

  // Get all companies that need enrichment
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { enriched: false },
        { hiringIntent: null },
        { industry: null },
        { location: null },
      ],
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`📊 Found ${companies.length} companies to enrich\n`);

  if (companies.length === 0) {
    console.log('✅ All companies are already enriched!');
    return;
  }

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    stats.companiesProcessed++;

    console.log(`\n[${ i + 1}/${companies.length}] ${company.name}`);
    console.log('─'.repeat(60));

    try {
      // Check what fields need enrichment
      const needsEnrichment = {
        industry: !company.industry,
        location: !company.location,
        description: !company.description,
        hiringIntent: !company.hiringIntent,
        jobPostings: !company.jobPostings,
        techStack: !company.techStack,
        aiPitch: !company.aiPitch,
      };

      const missingFields = Object.keys(needsEnrichment).filter(
        (key) => needsEnrichment[key]
      );

      if (missingFields.length === 0) {
        console.log('   ✓ Already fully enriched');
        stats.companiesSkipped++;
        continue;
      }

      console.log(`   🔍 Missing ${missingFields.length} fields: ${missingFields.join(', ')}`);
      console.log('   🤖 Enriching with Claude AI...');

      // Call AI to enrich
      const enrichmentData = await enrichCompanyWithAI(company, missingFields);

      // Prepare field sources tracking
      const currentFieldSources = (company.fieldSources as any) || {};
      const updatedFieldSources = { ...currentFieldSources };

      // Build update data
      const updateData: any = {
        enriched: true,
        enrichedAt: new Date(),
        dataSource: company.dataSource || 'ai_enrichment',
        fieldSources: updatedFieldSources,
      };

      let fieldsEnrichedCount = 0;

      // Update each enriched field
      if (enrichmentData.industry && needsEnrichment.industry) {
        updateData.industry = enrichmentData.industry;
        updatedFieldSources['industry'] = 'claude_ai';
        fieldsEnrichedCount++;
        console.log(`   ✓ Industry: ${enrichmentData.industry}`);
      }

      if (enrichmentData.location && needsEnrichment.location) {
        updateData.location = enrichmentData.location;
        updatedFieldSources['location'] = 'claude_ai';
        fieldsEnrichedCount++;
        console.log(`   ✓ Location: ${enrichmentData.location}`);
      }

      if (enrichmentData.description && needsEnrichment.description) {
        updateData.description = enrichmentData.description;
        updatedFieldSources['description'] = 'claude_ai';
        fieldsEnrichedCount++;
        console.log(`   ✓ Description: ${enrichmentData.description.substring(0, 60)}...`);
      }

      if (enrichmentData.hiringIntent && needsEnrichment.hiringIntent) {
        updateData.hiringIntent = enrichmentData.hiringIntent;
        updateData.intent = enrichmentData.hiringIntent;
        updatedFieldSources['hiringIntent'] = 'claude_ai';
        fieldsEnrichedCount++;
        console.log(`   ✓ Hiring Intent: ${enrichmentData.hiringIntent.substring(0, 60)}...`);
      }

      if (enrichmentData.jobPostings && needsEnrichment.jobPostings) {
        updateData.jobPostings = enrichmentData.jobPostings;
        updatedFieldSources['jobPostings'] = 'claude_ai';
        fieldsEnrichedCount++;
        console.log(`   ✓ Job Postings: ${enrichmentData.jobPostings.substring(0, 60)}...`);
      }

      if (enrichmentData.techStack && needsEnrichment.techStack) {
        updateData.techStack = enrichmentData.techStack;
        updatedFieldSources['techStack'] = 'claude_ai';
        fieldsEnrichedCount++;
        console.log(`   ✓ Tech Stack: ${enrichmentData.techStack.substring(0, 60)}...`);
      }

      if (enrichmentData.aiPitch && needsEnrichment.aiPitch) {
        updateData.aiPitch = enrichmentData.aiPitch;
        updatedFieldSources['aiPitch'] = 'claude_ai';
        fieldsEnrichedCount++;
        console.log(`   ✓ AI Pitch: ${enrichmentData.aiPitch.substring(0, 60)}...`);
      }

      // Update the company
      await prisma.company.update({
        where: { id: company.id },
        data: updateData,
      });

      stats.companiesEnriched++;
      stats.totalFieldsEnriched += fieldsEnrichedCount;

      console.log(`\n   🎯 Enriched ${fieldsEnrichedCount} fields - Marked as "AI Researched"`);

      // Rate limiting - wait 2 seconds between API calls
      if (i < companies.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

    } catch (err) {
      console.error(`   ✗ Error enriching: ${err.message}`);
      stats.companiesSkipped++;
    }
  }

  // Print summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('✨ AI Enrichment Completed!\n');
  console.log('📊 Summary:');
  console.log(`   Companies Processed: ${stats.companiesProcessed}`);
  console.log(`   Companies Enriched: ${stats.companiesEnriched}`);
  console.log(`   Companies Skipped: ${stats.companiesSkipped}`);
  console.log(`   Total Fields Enriched by AI: ${stats.totalFieldsEnriched}`);
  console.log('\n   🏷️  All AI-generated data is marked as "claude_ai" in field sources');
  console.log('═'.repeat(60) + '\n');
}

async function enrichCompanyWithAI(company: any, missingFields: string[]): Promise<any> {
  const prompt = `You are a business intelligence researcher. I need you to provide realistic, professional enrichment data for this company based on industry standards and what's publicly known about companies in this space.

Company Information:
- Name: ${company.name}
- Website: ${company.website || 'Not provided'}
- LinkedIn: ${company.linkedin || 'Not provided'}
- Industry: ${company.industry || 'Unknown'}
- Employee Count: ${company.employeeCount || 'Unknown'}
- Location: ${company.location || 'Unknown'}

Missing Fields to Enrich: ${missingFields.join(', ')}

Please provide ONLY a JSON object with the following fields. Make the data realistic and professional:

{
  "industry": "The industry/sector this company operates in (e.g., Technology, Healthcare, Retail, Manufacturing)",
  "location": "City, State/Country where the company is headquartered",
  "description": "A 2-3 sentence professional description of what this company does",
  "hiringIntent": "A 2-3 sentence analysis of typical hiring needs for a company like this (focus on roles like software engineers, sales, operations based on the industry)",
  "jobPostings": "List 3-5 typical job roles this type of company would hire for (e.g., 'Software Engineer, Product Manager, Sales Director, Customer Success Manager, DevOps Engineer')",
  "techStack": "List 5-8 technologies/tools companies in this industry typically use (e.g., 'NetSuite ERP, Salesforce CRM, AWS, PostgreSQL, React, Node.js, Docker, Kubernetes')",
  "aiPitch": "A professional 3-4 sentence pitch for how Agentic AI solutions could benefit this company, specifically mentioning: 1) workflow automation, 2) data analytics/insights, 3) customer service automation, 4) integration with their existing systems like NetSuite. Make it compelling and specific to their industry."
}

IMPORTANT:
- Use ONLY information that can be reasonably inferred from the company name and industry
- Make it professional and realistic
- If a field truly cannot be determined, use a generic but professional placeholder
- Return ONLY valid JSON, no other text`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error('Failed to parse AI response');
}

// Main execution
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

aiEnrichAllCompanies()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
