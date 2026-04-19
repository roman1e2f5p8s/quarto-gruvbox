import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(__dirname, 'template.html');
const outDir = path.join(__dirname, 'images');

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

for (const mode of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: mode,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  // Quarto's theme switch is JS-driven, not a CSS media query. Force the
  // alternate (dark) stylesheet on/off directly and update the Bootstrap
  // theme attribute so components keyed to it pick up the change.
  await page.evaluate((wantDark) => {
    document
      .querySelectorAll('link.quarto-color-scheme.quarto-color-alternate')
      .forEach((link) => { link.disabled = !wantDark; });
    document.documentElement.setAttribute(
      'data-bs-theme',
      wantDark ? 'dark' : 'light',
    );
  }, mode === 'dark');

  // Give MathJax and any transition a moment to settle
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(outDir, `${mode}.png`),
    fullPage: true,
  });
  await context.close();
  console.log(`wrote images/${mode}.png`);
}

await browser.close();
