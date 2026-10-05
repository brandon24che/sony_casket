const puppeteer = require('puppeteer-core');

const OUT = __dirname;
const VIEW = { width: 1600, height: 900 };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-first-run', '--disable-gpu-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEW);
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));

  await page.goto('http://localhost:4173', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('.preloader--done', { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));

  const storyH = await page.evaluate(() => {
    const s = document.getElementById('story');
    return { top: s.offsetTop, total: s.offsetHeight - innerHeight, docH: document.body.scrollHeight };
  });
  console.log('story:', JSON.stringify(storyH));

  const stops = [
    ['01-hero', 0.0],
    ['02-engineering', 0.28],
    ['03-noise', 0.515],
    ['04-sound', 0.74],
    ['05-cta', 0.97],
  ];
  for (const [name, frac] of stops) {
    await page.evaluate(({ top, total, frac }) => {
      window.scrollTo(0, top + frac * total);
    }, { ...storyH, frac });
    await new Promise((r) => setTimeout(r, 1600));
    await page.screenshot({ path: `${OUT}/shot-${name}.png` });
    console.log('captured', name);
  }

  // specs + buy sections
  for (const id of ['specs', 'buy']) {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id);
    await new Promise((r) => setTimeout(r, 1400));
    await page.screenshot({ path: `${OUT}/shot-${id}.png` });
    console.log('captured', id);
  }

  await browser.close();
  console.log('OK');
})();
