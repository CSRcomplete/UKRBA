import puppeteer from 'puppeteer';
import { execSync } from 'child_process';

let cachedChromiumPath = null;
function getChromiumPath() {
    if (process.platform === 'win32') {
        return undefined; // Let Puppeteer use its bundled Chrome on Windows
    }
    if (cachedChromiumPath !== null) {
        return cachedChromiumPath;
    }
    try {
        const path = execSync('which chromium').toString().trim();
        if (path) {
            console.log(`Found Chromium via 'which': ${path}`);
            cachedChromiumPath = path;
            return path;
        }
    } catch (e) {
        console.warn("Could not find chromium via 'which chromium', letting Puppeteer use default.");
    }
    cachedChromiumPath = "";
    return undefined;
}

export async function scrapeWebsite(url) {
    if (!url || !url.startsWith('http')) {
        return "No valid URL provided.";
    }

    const launchOptions = {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    const chromiumPath = getChromiumPath();
    if (chromiumPath) {
        launchOptions.executablePath = chromiumPath;
    }
    
    let browser;
    try {
        console.log(`Scraping website: ${url}`);
        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();
        
        // Don't load images/css to save memory and time
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Timeout after 10 seconds to keep the webhook fast
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        
        // Extract visible text
        const text = await page.evaluate(() => {
            // Remove scripts, styles, noscript
            document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            return document.body.innerText.replace(/\s+/g, ' ').trim().substring(0, 3000); // 3000 chars is plenty for Claude to understand the business
        });
        
        return text;
    } catch (e) {
        console.error("Scraping failed for:", url, e.message);
        return "Website could not be scraped. Provide generic industry advice.";
    } finally {
        if (browser) await browser.close();
    }
}
