#!/usr/bin/env node

import { spotifyAuth } from './auth.js';
import { dataFetcher } from './fetch-data.js';
import { statisticsAnalyzer } from './analyze.js';
import { ReportGenerator } from './generate-report.js';

/**
 * Main CLI - Run all steps automatically
 */

async function main() {
  console.log('\n🎵 Spotify Statistics Generator\n');

  try {
    // Step 1: Check authentication
    console.log('Step 1: Checking authentication...');
    const token = await spotifyAuth.getValidToken();
    
    if (!token) {
      console.log('\n⚠️  Not authenticated. Please run: npm run auth\n');
      process.exit(1);
    }
    console.log('✓ Authenticated\n');

    // Step 2: Fetch data
    console.log('Step 2: Fetching data from Spotify...');
    await dataFetcher.fetchAll();

    // Step 3: Analyze
    console.log('Step 3: Analyzing statistics...');
    const report = await statisticsAnalyzer.generateFullReport();

    // Step 4: Display report
    console.log('\nStep 4: Generating report...\n');
    const generator = new ReportGenerator(report);
    generator.printFullReport();

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
