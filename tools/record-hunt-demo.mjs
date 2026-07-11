import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(__dirname, 'hunt-capture.html');
const outDir = path.join(root, 'assets', 'hunt');
const framesDir = path.join(outDir, '_frames');
const webmOut = path.join(outDir, 'hunt-demo.webm');
const posterOut = path.join(outDir, 'hunt-poster.png');

fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const DURATION_SEC = 14;
const FPS = 24;
const W = 1040;
const H = 256;
const FRAME_COUNT = DURATION_SEC * FPS;

const chromeCandidates = [
  process.env.CHROME,
  path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const executablePath = chromeCandidates.find(p => fs.existsSync(p));
if (!executablePath) throw new Error('No Chrome executable found');
console.log('Using', executablePath);

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--disable-web-security'],
});
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__huntReady === true, null, { timeout: 20000 });
await page.waitForTimeout(300);

const frameIntervalMs = 1000 / FPS;
let t0 = Date.now();
for (let i = 0; i < FRAME_COUNT; i++) {
  const target = t0 + i * frameIntervalMs;
  const wait = target - Date.now();
  if (wait > 0) await page.waitForTimeout(wait);
  const buf = await page.screenshot({ type: 'png' });
  const name = String(i).padStart(5, '0') + '.png';
  fs.writeFileSync(path.join(framesDir, name), buf);
  if (i === Math.floor(FPS * 2.5)) fs.copyFileSync(path.join(framesDir, name), posterOut);
  if (i % 40 === 0) console.log(`frame ${i}/${FRAME_COUNT}`);
}

await context.close();
await browser.close();

const enc = spawnSync('ffmpeg', [
  '-y',
  '-framerate', String(FPS),
  '-i', path.join(framesDir, '%05d.png'),
  '-an',
  '-c:v', 'libvpx-vp9',
  '-b:v', '0',
  '-crf', '34',
  '-row-mt', '1',
  '-deadline', 'good',
  '-cpu-used', '2',
  '-pix_fmt', 'yuv420p',
  '-vf', `scale=${W}:${H}:flags=neighbor`,
  webmOut,
], { encoding: 'utf8' });

if (enc.status !== 0) {
  console.error(enc.stderr?.slice(-1500));
  throw new Error('ffmpeg encode failed');
}

fs.rmSync(framesDir, { recursive: true, force: true });

const st = fs.statSync(webmOut);
const probe = spawnSync('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', webmOut,
], { encoding: 'utf8' });

console.log(JSON.stringify({
  webm: webmOut,
  poster: posterOut,
  kb: Math.round(st.size / 1024),
  durationSec: Number(Number(probe.stdout.trim()).toFixed(2)),
}, null, 2));
