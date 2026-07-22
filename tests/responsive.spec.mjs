import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, 'test-results', 'responsive-native');
const viewports = [
  { width:390, height:844 },
  { width:1024, height:768 },
  { width:1280, height:800 },
  { width:1440, height:900 },
  { width:1920, height:1080 }
];
const mime = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png'
};

const server = createServer(async (request, response) => {
  try {
    const clean = normalize(decodeURIComponent((request.url || '/').split('?')[0])).replace(/^([.][.][/\\])+/, '');
    const path = resolve(root, clean === '/' ? 'index.html' : clean.replace(/^[/\\]/, ''));
    if (!path.startsWith(root)) throw new Error('Caminho inválido');
    response.writeHead(200, { 'content-type':mime[extname(path)] || 'application/octet-stream' });
    response.end(await readFile(path));
  } catch {
    response.writeHead(404, { 'content-type':'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

await new Promise(done => server.listen(0, '127.0.0.1', done));
await mkdir(outputDir, { recursive:true });
const port = server.address().port;
const browser = await chromium.launch({
  headless:true,
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
});
const results = [];
let failed = false;
const check = (width, name, ok, detail = '') => {
  results.push({ width, name, ok, detail });
  if (!ok) failed = true;
};

const unauthenticatedSupabase = () => {
  window.supabase = {
    createClient() {
      return {
        auth:{
          getSession:async()=>({ data:{ session:null }, error:null }),
          signInWithPassword:async()=>({ data:null, error:{ message:'Credenciais inválidas' } }),
          resetPasswordForEmail:async()=>({ error:null }),
          signOut:async()=>({ error:null })
        },
        rpc:async()=>({ data:null, error:null })
      };
    }
  };
};

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion:'reduce' });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.addInitScript(unauthenticatedSupabase);
    await page.route('**/*', route => route.request().url().startsWith(`http://127.0.0.1:${port}/`) ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil:'domcontentloaded' });
    await page.waitForSelector('#loginView:not(.hidden)');

    const audit = await page.evaluate(() => {
      const hero = document.querySelector('.login-hero');
      const panel = document.querySelector('.login-panel');
      const email = document.querySelector('#loginEmail');
      const password = document.querySelector('#loginPassword');
      const styles = [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href'));
      return {
        overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        bodyScrollWidth:document.body.scrollWidth,
        heroDisplay:getComputedStyle(hero).display,
        heroWidth:hero.getBoundingClientRect().width,
        panelWidth:panel.getBoundingClientRect().width,
        background:getComputedStyle(hero).backgroundImage,
        controls:Boolean(email && password && document.querySelector('#togglePasswordBtn') && document.querySelector('#rememberLogin') && document.querySelector('#forgotPasswordBtn')),
        labels:Boolean(document.querySelector('label[for="loginEmail"]') && document.querySelector('label[for="loginPassword"]')),
        reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches && parseFloat(getComputedStyle(document.querySelector('.login-submit')).transitionDuration) <= 0.001,
        styles
      };
    });

    const desktop = viewport.width > 820;
    check(viewport.width, 'login sem overflow global', !audit.overflow, audit.overflow ? `${audit.scrollWidth}/${audit.clientWidth} (body ${audit.bodyScrollWidth})` : '');
    check(viewport.width, 'stylesheet nativo único', audit.styles.length === 1 && audit.styles[0].startsWith('opscontrol-native.css'), audit.styles.join(', '));
    check(viewport.width, 'controles reais de autenticação', audit.controls && audit.labels);
    check(viewport.width, 'referência offshore oficial', audit.background.includes('login-reference.png'));
    check(viewport.width, 'layout responsivo do Figma', desktop ? audit.heroDisplay !== 'none' && Math.abs(audit.heroWidth / (audit.heroWidth + audit.panelWidth) - .58) < .03 : audit.heroDisplay === 'none');
    check(viewport.width, 'prefers-reduced-motion respeitado', audit.reducedMotion);

    await page.click('#togglePasswordBtn');
    check(viewport.width, 'mostrar e ocultar senha funcional', await page.$eval('#loginPassword', input => input.type === 'text'));
    await page.click('#loginBtn');
    await page.waitForTimeout(20);
    check(viewport.width, 'estado de erro do login funcional', await page.$eval('#loginMessage', message => !message.classList.contains('hidden') && message.textContent.includes('Preencha')));
    check(viewport.width, 'sem erros JavaScript', pageErrors.length === 0, pageErrors.join(' | '));

    await page.screenshot({ path:resolve(outputDir, `login-${viewport.width}.png`), fullPage:true });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}

await writeFile(resolve(outputDir, 'report.json'), JSON.stringify(results, null, 2));
for (const item of results) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.width}px — ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
if (failed) process.exit(1);
