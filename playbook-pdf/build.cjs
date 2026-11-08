// Renders playbook.html to The-AI-Character-Playbook.pdf and reports pages whose content overflows.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'playbook.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  const over = await p.evaluate(() => [...document.querySelectorAll('.page')].map((pg, i) => {
    const inn = pg.querySelector('.in'); if (!inn) return null;
    return { page: i + 1, over: Math.round(inn.scrollHeight - inn.clientHeight) };
  }).filter(x => x && x.over > 0));
  console.log('overflowing pages:', JSON.stringify(over));
  await p.pdf({ path: path.join(__dirname, 'The-AI-Character-Playbook.pdf'), preferCSSPageSize: true, printBackground: true });
  await b.close();
})();
