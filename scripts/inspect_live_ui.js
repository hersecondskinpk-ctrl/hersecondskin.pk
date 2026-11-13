'use strict';
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function checkLive() {
  const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9288',
    '--user-data-dir=' + path.resolve(__dirname, '../scratch_debug_shot'),
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 1500));
  
  const list = await fetch('http://127.0.0.1:9288/json/list').then(r => r.json());
  const wsUrl = list.find(t => t.type === 'page').webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);
  
  let id = 1;
  function send(method, params={}) {
    return new Promise(resolve => {
      const cur = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === cur) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  const consoleLogs = [];
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleLogs.push(msg.params.args.map(a => a.value || a.description).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleLogs.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails));
    }
  });

  console.log('Navigating to https://her-second-skin-pk.fly.dev/ ...');
  await send('Page.navigate', { url: 'https://her-second-skin-pk.fly.dev/' });
  await new Promise(r => setTimeout(r, 3500));

  const info = await send('Runtime.evaluate', {
    expression: `(() => {
      const sheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => ({ href: l.href, loaded: !!l.sheet }));
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
      const catGrid = document.querySelector('.category-grid');
      const catCols = catGrid ? getComputedStyle(catGrid).gridTemplateColumns : 'none';
      const prodGrid = document.querySelector('#product-grid');
      const prodCols = prodGrid ? getComputedStyle(prodGrid).gridTemplateColumns : 'none';
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const headerDisplay = document.querySelector('header') ? getComputedStyle(document.querySelector('header')).display : 'none';
      const heroDisplay = document.querySelector('.hero-section') ? getComputedStyle(document.querySelector('.hero-section')).display : 'none';
      return {
        sheets,
        scripts,
        catCols,
        prodCols,
        bodyBg,
        headerDisplay,
        heroDisplay,
        title: document.title,
        bodyHtmlSnippet: document.body.innerHTML.slice(0, 500)
      };
    })()`,
    returnByValue: true
  });

  console.log('Live page evaluation:');
  console.log(JSON.stringify(info.result.value, null, 2));
  console.log('Console Logs / Errors:', consoleLogs);

  // Desktop shot (1280)
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 500));
  const shotDesktop = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = 'C:/Users/talal/.gemini/antigravity/brain/07c97595-1ad6-4370-90ba-4aae47323d1a/live_structure_desktop.png';
  fs.writeFileSync(shotPath, Buffer.from(shotDesktop.data, 'base64'));
  console.log('Saved Desktop screenshot:', shotPath);

  // Mobile shot (375)
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await new Promise(r => setTimeout(r, 500));
  const shotMobile = await send('Page.captureScreenshot', { format: 'png' });
  const shotMobilePath = 'C:/Users/talal/.gemini/antigravity/brain/07c97595-1ad6-4370-90ba-4aae47323d1a/live_structure_mobile.png';
  fs.writeFileSync(shotMobilePath, Buffer.from(shotMobile.data, 'base64'));
  console.log('Saved Mobile screenshot:', shotMobilePath);

  ws.close();
  edge.kill();
}

checkLive().catch(console.error);
