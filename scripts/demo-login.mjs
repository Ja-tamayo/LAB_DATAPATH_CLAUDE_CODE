import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '..', 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const browser = await chromium.launch({ headless: false, slowMo: 700 });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

// 1. Login
console.log('Navigating to login...');
await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');
await page.fill('input[type="email"]', 'demo@test1234.com');
await page.fill('input[type="password"]', 'Demos54321');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 20000 });
await page.waitForLoadState('networkidle');
console.log('Logged in!');

// 2. Open "Nueva Tarea" dialog
await page.click('button:has-text("Nueva Tarea")');
await page.waitForTimeout(1000);

// Take screenshot with dialog open (before filling)
await page.screenshot({ path: path.join(screenshotsDir, 'dialog-open.png') });
console.log('Dialog screenshot saved.');

// 3. Fill title
const titleInput = page.locator('[data-slot="dialog-content"] input[type="text"]').first();
await titleInput.waitFor({ state: 'visible', timeout: 10000 });
await titleInput.fill('Demo MCP en vivo');
console.log('Title filled.');

// 4. Set priority to "high" — value in our Select
// The SelectTrigger has role="combobox", we click it then pick the item
const selectTrigger = page.locator('[data-slot="select-trigger"]').first();
await selectTrigger.click();
await page.waitForTimeout(600);

// Click the "ALTA" option (high priority)
const altaOption = page.locator('[data-slot="select-item"]:has-text("ALTA")').first();
await altaOption.waitFor({ state: 'visible', timeout: 5000 });
await altaOption.click();
console.log('Priority set to ALTA (high).');

await page.waitForTimeout(400);

// Screenshot with filled form
await page.screenshot({ path: path.join(screenshotsDir, 'form-filled.png') });
console.log('Form filled screenshot saved.');

// 5. Submit
const submitBtn = page.locator('button:has-text("Crear tarea")').first();
await submitBtn.click();
console.log('Form submitted.');

// 6. Wait for dialog to close and dashboard to update
await page.waitForTimeout(3000);

const currentUrl = page.url();
console.log('URL after submit:', currentUrl);

// 7. Reload page to show fresh server-rendered data
await page.reload();
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);

// 8. Final screenshot of dashboard with new task
await page.screenshot({ path: path.join(screenshotsDir, 'task-created.png'), fullPage: true });
console.log('Final screenshot saved: screenshots/task-created.png');

await browser.close();
console.log('Done!');
