/**
 * browserManager — singleton Puppeteer browser for PDF rendering.
 *
 * Lazily launches one Chromium instance; each PDF render opens a new page (tab).
 * Call closeBrowser() on server shutdown via Fastify's onClose hook.
 */

import puppeteer, { type Browser } from 'puppeteer';
import { config } from '../../lib/config.js';

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser;

  browser = await puppeteer.launch({
    headless: true,
    executablePath: config.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}
