import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outputDir = resolve(root, 'test-results');
const widths = [390, 768, 1024, 1366];
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function safePath(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([.][.][/\\])+/, '');
  return resolve(root, clean === '/' ? 'index.html' : clean.replace(/^[/\\]/, ''));
}

const server = createServer(async (request, response) => {
  try {
    const path = safePath(request.url || '/');
    if (!path.startsWith(root)) throw new Error('Caminho inválido');
    const content = await readFile(path);
    response.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

await new Promise(resolveStart => server.listen(0, '127.0.0.1', resolveStart));
const port = server.address().port;
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];
let failed = false;

function record(width, check, ok, detail = '') {
  results.push({ width, check, ok, detail });
  if (!ok) failed = true;
}

try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: width <= 768 ? 900 : 820 } });
    const page = await context.newPage();

    await page.route('**/*', async route => {
      const url = route.request().url();
      if (url.startsWith(`http://127.0.0.1:${port}/`)) await route.continue();
      else await route.abort();
    });

    await page.goto(`http://127.0.0.1:${port}/tests/fixtures/responsive.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);

    const audit = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      const allowed = '.table-wrap,.page-header .actions,.ui-tab-scroller,.operation-stepper-head,.mobile-bottom-nav,.sidebar nav';
      const overflow = [...document.querySelectorAll('body *')].filter(element => {
        if (element.closest(allowed)) return false;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.right > viewport + 2;
      }).map(element => ({
        tag: element.tagName,
        className: element.className,
        right: Math.round(element.getBoundingClientRect().right),
        viewport
      })).slice(0, 10);

      const rgb = value => {
        const match = String(value).match(/[\d.]+/g);
        return match ? match.slice(0, 3).map(Number) : [0, 0, 0];
      };
      const luminance = color => {
        const channels = rgb(color).map(value => {
          const normalized = value / 255;
          return normalized <= .03928 ? normalized / 12.92 : Math.pow((normalized + .055) / 1.055, 2.4);
        });
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
      };
      const effectiveBackground = element => {
        let current = element;
        while (current) {
          const color = getComputedStyle(current).backgroundColor;
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
          current = current.parentElement;
        }
        return 'rgb(255, 255, 255)';
      };
      const contrast = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const foreground = getComputedStyle(element).color;
        const background = effectiveBackground(element);
        const a = luminance(foreground);
        const b = luminance(background);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      };

      const primaryGrid = document.querySelector('.dashboard-primary-kpis');
      const moreMetrics = document.querySelector('.dashboard-more-metrics');
      const stepper = document.querySelector('.operation-stepper-head');
      const actionBar = document.querySelector('.page-header .actions');

      return {
        documentOverflow: document.documentElement.scrollWidth > viewport + 2,
        overflow,
        primaryCount: primaryGrid ? primaryGrid.children.length : 0,
        hasMoreMetrics: Boolean(moreMetrics),
        moreMetricCount: moreMetrics?.querySelectorAll('.stat-card').length || 0,
        actionScrollable: actionBar ? actionBar.scrollWidth >= actionBar.clientWidth : false,
        stepperVisible: stepper ? stepper.getBoundingClientRect().width > 0 : false,
        labelFontSize: parseFloat(getComputedStyle(document.querySelector('label')).fontSize),
        contrast: {
          label: contrast('label'),
          navActive: contrast('.nav-item.active'),
          secondaryButton: contrast('.btn.secondary'),
          tableCell: contrast('.data-table td')
        }
      };
    });

    record(width, 'sem overflow global', !audit.documentOverflow, JSON.stringify(audit.overflow));
    record(width, 'sem elementos fora da tela', audit.overflow.length === 0, JSON.stringify(audit.overflow));
    record(width, 'dashboard mostra quatro indicadores principais', audit.primaryCount === 4, `encontrados: ${audit.primaryCount}`);
    record(width, 'dashboard agrupa dois indicadores adicionais', audit.hasMoreMetrics && audit.moreMetricCount === 2, `encontrados: ${audit.moreMetricCount}`);
    record(width, 'stepper visível', audit.stepperVisible);
    record(width, 'labels legíveis', audit.labelFontSize >= 12, `font-size: ${audit.labelFontSize}px`);

    for (const [name, ratio] of Object.entries(audit.contrast)) {
      record(width, `contraste ${name}`, ratio !== null && ratio >= 4, `razão: ${ratio?.toFixed(2)}`);
    }

    await page.screenshot({ path: resolve(outputDir, `responsive-${width}.png`), fullPage: true });

    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
    const loginOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    record(width, 'login sem overflow global', !loginOverflow);
    await page.screenshot({ path: resolve(outputDir, `login-${width}.png`), fullPage: true });

    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

await writeFile(resolve(outputDir, 'responsive-report.json'), JSON.stringify(results, null, 2));

for (const item of results) {
  const icon = item.ok ? 'PASS' : 'FAIL';
  console.log(`${icon} ${item.width}px — ${item.check}${item.detail ? ` — ${item.detail}` : ''}`);
}

if (failed) process.exit(1);
