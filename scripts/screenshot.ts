/**
 * screenshot.ts — Take screenshots of Wander Admin pages
 *
 * Usage:
 *   npx tsx scripts/screenshot.ts                  # all pages
 *   npx tsx scripts/screenshot.ts dashboard        # specific page
 *   npx tsx scripts/screenshot.ts venues dashboard # multiple pages
 *
 * Screenshots are saved to: screenshots/{page}.png
 * Requires the dev server to be running: npm run dev
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.SCREENSHOT_URL ?? 'http://localhost:3000';

const PAGES: Record<string, string> = {
  login:     '/login',
  dashboard: '/dashboard',
  venues:    '/venues',
  'venue-new': '/venues/new',
  preview:   '/preview',
};

async function takeScreenshot(
  page: Awaited<ReturnType<InstanceType<typeof import('puppeteer').Browser>['newPage']>>,
  name: string,
  urlPath: string,
  outputDir: string,
) {
  const url = `${BASE_URL}${urlPath}`;
  console.log(`→ ${name}: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 15_000 });

  // Wait a bit for any client-side rendering
  await new Promise(r => setTimeout(r, 800));

  const filePath = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  ✓ saved ${filePath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const requestedPages = args.length > 0 ? args : Object.keys(PAGES);

  const outputDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    for (const name of requestedPages) {
      const urlPath = PAGES[name];
      if (!urlPath) {
        console.warn(`  ✗ Unknown page: "${name}". Available: ${Object.keys(PAGES).join(', ')}`);
        continue;
      }
      await takeScreenshot(page, name, urlPath, outputDir);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone — screenshots in: ${outputDir}/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
