const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { seed } = require('../server/data/seed');

test('Split scripts load in HTML order and render all pages and record forms', async () => {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      innerHTML: '', addEventListener() {}, showModal() { this.open = true; }, close() { this.open = false; }
    });
    return elements.get(selector);
  };
  const context = vm.createContext({
    document: { querySelector: element, addEventListener() {} },
    window: { addEventListener() {} }, location: { hash: '' },
    fetch: async () => ({ ok: true, json: async () => seed() }),
    console, setTimeout, clearTimeout, URL, Blob
  });
  const root = path.join(__dirname, '../public');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^\"]+)" defer><\/script>/g)].map(match => match[1]);
  for (const script of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, script), 'utf8'), context, { filename: script });
  }
  await new Promise(resolve => setImmediate(resolve));
  assert.match(element('#app').innerHTML, /Хорошего дня/);
  for (const page of ['overview', 'deals', 'clients', 'tasks', 'analytics', 'settings']) {
    vm.runInContext(`page = '${page}'; render();`, context);
    assert.match(element('#app').innerHTML, /<main id="main">/, page);
    assert.ok(element('#app').innerHTML.length > 5000, page);
  }
  for (const type of ['clients', 'deals', 'tasks']) {
    vm.runInContext(`edit('${type}');`, context);
    assert.match(element('#modal').innerHTML, /id="record-form"/);
    vm.runInContext(`edit('${type}', db.${type}[0].id);`, context);
    assert.match(element('#modal').innerHTML, /Редактировать/);
  }
  vm.runInContext('showClient(db.clients[0].id)', context);
  assert.match(element('#modal').innerHTML, /Сделки клиента/);
  vm.runInContext("db.clients[0].company = '<img src=x onerror=alert(1)>'; page='clients'; render()", context);
  assert.ok(!element('#app').innerHTML.includes('<img src=x'));
  vm.runInContext("db.clients=[]; db.deals=[]; db.tasks=[];", context);
  for (const page of ['overview', 'deals', 'clients', 'tasks', 'analytics']) {
    vm.runInContext(`page = '${page}'; render();`, context);
    assert.ok(!element('#app').innerHTML.includes('NaN'), page);
  }
});
