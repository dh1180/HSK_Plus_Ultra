const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

// Runs against a production export, without exposing a preview on the network.
const root = path.resolve('dist');
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await fs.readFile(file);
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
const wait = (fn) => new Promise((resolve,reject) => {
  const started = Date.now();
  const tick = async () => { try { if(await fn()) return resolve(); if(Date.now()-started > 10_000) throw new Error('Condition timed out'); setTimeout(tick,50); } catch(e) { reject(e); } }; tick();
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE, args:['--no-sandbox','--disable-dev-shm-usage']} : {})});
  const context = await browser.newContext({viewport:{width:390,height:844}});
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const button = (name) => page.getByRole('button', {name, exact:true});
  const checkVisible = async (text) => { await page.getByText(text,{exact:true}).waitFor({state:'visible'}); };
  try {
    await page.goto(url);
    await button('HSK 2 바로가기').click();
    await page.getByRole('textbox', {name:'단어 검색'}).fill('zuobian');
    await button('左边, zuǒbian, 왼쪽, 학습하기').click();
    assert.equal(await page.getByRole('button', {name:/알고 있음/}).isDisabled(), true);
    await button('左边, 뜻 보기').click();
    await checkVisible('서점은 왼쪽에 있다.');
    await page.getByRole('button', {name:/다시 학습 다음/}).click();
    await button('左边, 뜻 보기').waitFor();
    assert.equal(await page.getByRole('button', {name:/알고 있음/}).isDisabled(), true);
    await button('左边, 뜻 보기').click();
    await page.getByRole('button', {name:/알고 있음/}).click();
    await checkVisible('이번 학습 완료');
    const summary = await page.locator('body').innerText();
    assert.match(summary, /학습한 단어\s*1/);
    assert.match(summary, /다시 학습 응답\s*1/);
    await wait(async () => Boolean(await page.evaluate(() => localStorage.getItem('hsk-plus-ultra:progress:v1'))));
    let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hsk-plus-ultra:progress:v1')));
    assert.equal(stored['hsk2-0500'].stage, 'DAY_3');
    assert.equal(stored['hsk2-0500'].seenCount, 2);
    await page.reload();
    await button('HSK 2 바로가기').click();
    await page.getByRole('tab',{name:'학습 1',exact:true}).click();
    await checkVisible('左边');
    await page.getByRole('tab',{name:'전체 200',exact:true}).click();
    await button('더 보기 (50 / 200)').click();
    await button('더 보기 (100 / 200)').waitFor();
    await page.getByRole('textbox',{name:'단어 검색'}).fill('no-results-123');
    await checkVisible('검색 결과가 없습니다.');
    await button('급수 선택으로 돌아가기').click();
    await button('HSK 6 바로가기').click();
    // A known unreviewed entry is picked from the runtime's original metadata below.
    await page.getByRole('textbox',{name:'단어 검색'}).fill('拜访');
    const draft = page.getByRole('button',{name:/拜访,.*참고 열람/});
    await draft.click(); await button('拜访, 뜻 보기').click();
    await checkVisible('자동 매핑 뜻 · 의미와 품사 검토 필요');
    assert.equal(await page.getByRole('button',{name:/알고 있음/}).isDisabled(), true);
    await button('학습 닫기').click();
    await button('급수 선택으로 돌아가기').click();

    // Baseline responsive views and horizontal overflow at narrow/tablet widths.
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:width===320?568:900});
      await button('HSK 2 바로가기').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.getByRole('textbox',{name:'단어 검색'}).fill('爱好');
      await page.getByRole('button',{name:/^爱好,.*학습하기/}).click();
      await button('爱好, 뜻 보기').click();
      await checkVisible('내 취미는 수영이다.');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      if(process.env.SCREENSHOT_DIR) {
        await fs.mkdir(process.env.SCREENSHOT_DIR,{recursive:true});
        await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`study-${width}.png`)});
      }
      await button('학습 닫기').click(); await button('급수 선택으로 돌아가기').click();
    }
    // A storage read failure must not become an empty writable progress map.
    await page.evaluate(() => localStorage.setItem('hsk-plus-ultra:progress:v1', 'null'));
    await page.reload(); await checkVisible('학습 기록을 불러오지 못했습니다. 기존 기록은 보존됩니다.');
    assert.equal(await page.evaluate(() => localStorage.getItem('hsk-plus-ultra:progress:v1')), 'null');
    await page.evaluate(() => localStorage.removeItem('hsk-plus-ultra:progress:v1'));
    await button('다시 불러오기').click(); await button('HSK 2 바로가기').click();

    // A write failure must be visible and recoverable without losing the in-memory answer.
    await page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(){ throw new Error('Simulated storage failure'); };
    });
    await page.getByRole('textbox',{name:'단어 검색'}).fill('爱好');
    await page.getByRole('button',{name:/^爱好,.*학습하기/}).click(); await button('爱好, 뜻 보기').click();
    await page.getByRole('button',{name:/알고 있음/}).click();
    await button('다시 저장').waitFor();
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await button('다시 저장').click();
    await button('다시 저장').waitFor({state:'hidden'});
    stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hsk-plus-ultra:progress:v1')));
    assert.equal(stored['hsk2-0302'].stage, 'LONG_TERM');
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: whole-list search, single-word retry concealment, unique summary, persistence/reload, pagination, empty search, draft preview, 4 viewport widths, corrupt storage, write failure/recovery, no uncaught page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
