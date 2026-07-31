const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const routes = [
  { name: 'Dashboard', path: '/' },
  { name: 'Projects', path: '/projects' },
  { name: 'Project_Ledger', path: '/projects/1' },
  { name: 'Contacts', path: '/contacts' },
  { name: 'Clients', path: '/clients' },
  { name: 'Settings', path: '/settings' }
];

const viewports = [
  // Desktop
  { width: 1920, height: 1080, type: 'desktop' },
  { width: 1600, height: 1080, type: 'desktop' },
  { width: 1440, height: 1080, type: 'desktop' },
  { width: 1366, height: 768, type: 'desktop' },
  { width: 1280, height: 720, type: 'desktop' },
  // Tablet
  { width: 1024, height: 1366, type: 'tablet' },
  { width: 768, height: 1024, type: 'tablet' },
  // Mobile
  { width: 430, height: 932, type: 'mobile' },
  { width: 390, height: 844, type: 'mobile' },
  { width: 375, height: 812, type: 'mobile' },
  { width: 360, height: 800, type: 'mobile' }
];

const outDir = 'C:/Users/ASUS/.gemini/antigravity-ide/brain/1b53e8cc-5d25-47aa-8a7d-fcd2b6ded4bb/screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const results = [];

  for (const route of routes) {
    const url = `http://localhost:3000${route.path}`;
    console.log(`\nNavigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    } catch (e) {
      console.log(`Failed to navigate to ${url}`);
      continue;
    }

    for (const vp of viewports) {
      console.log(`Testing ${route.name} at ${vp.width}x${vp.height} (${vp.type})`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise(r => setTimeout(r, 1000)); // wait for layout/animations

      // Check for horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

      if (overflow) {
        console.error(`❌ Overflow detected on ${route.name} at ${vp.width}px! ScrollWidth: ${scrollWidth}`);
        results.push({ route: route.name, width: vp.width, issue: 'Horizontal Overflow', scrollWidth });
      }

      // Take a screenshot only for 1920 (desktop) and 390 (mobile) to avoid massive artifacts
      if (vp.width === 1920 || vp.width === 390) {
        const screenshotPath = path.join(outDir, `${route.name}_${vp.type}_${vp.width}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Saved screenshot to ${screenshotPath}`);
      }
    }
  }

  await browser.close();
  
  if (results.length > 0) {
    console.log('\n--- ISSUES FOUND ---');
    console.table(results);
  } else {
    console.log('\n✅ No horizontal overflow issues found.');
  }
}

run().catch(console.error);
