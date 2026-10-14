const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { createServer } = require('../server/app');

async function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-test-'));
  const dataFile = path.join(dir, 'crm.json');
  const server = createServer({ dataFile });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const request = async (route, method = 'GET', body, headers = {}) => {
    const res = await fetch(base + route, {
      method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: res.status, data: await res.json() };
  };
  return { base, request, dataFile };
}

test('CRM lifecycle: client, deal, task, relationships, persistence and deletion', async t => {
  const { request, dataFile } = await setup(t);
  const created = await request('/api/clients', 'POST', { name: 'Тестовый клиент', company: 'Компания', owner: 'Анна', status: 'active', email: 'test@example.com' });
  assert.equal(created.status, 201);
  const c = created.data;
  const deal = await request('/api/deals', 'POST', { title: 'Проект', clientId: c.id, owner: 'Анна', amount: 100000, stage: 'new', dueDate: '2026-12-01' });
  assert.equal(deal.status, 201);
  assert.equal((await request('/api/clients/' + c.id, 'DELETE')).status, 409);
  const won = await request('/api/deals/' + deal.data.id, 'PATCH', { stage: 'won' });
  assert.ok(won.data.closedAt);
  const reopened = await request('/api/deals/' + deal.data.id, 'PATCH', { stage: 'qualified' });
  assert.equal(reopened.data.closedAt, null);
  const task = await request('/api/tasks', 'POST', { title: 'Позвонить', clientId: c.id, owner: 'Анна', priority: 'high', dueDate: '2026-12-01', done: false });
  assert.equal(task.status, 201);
  assert.equal((await request('/api/tasks/' + task.data.id, 'PATCH', { done: true })).data.done, true);
  const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.equal(saved.tasks.find(item => item.id === task.data.id).done, true);
  const restarted = createServer({ dataFile });
  restarted.listen(0, '127.0.0.1');
  await once(restarted, 'listening');
  try {
    const state = await (await fetch('http://127.0.0.1:' + restarted.address().port + '/api/state')).json();
    assert.ok(state.clients.some(item => item.id === c.id));
  } finally { await new Promise(resolve => restarted.close(resolve)); }
  await request('/api/deals/' + deal.data.id, 'DELETE');
  assert.equal((await request('/api/clients/' + c.id, 'DELETE')).status, 409);
  await request('/api/tasks/' + task.data.id, 'DELETE');
  assert.equal((await request('/api/clients/' + c.id, 'DELETE')).status, 200);
});

test('Validation and backup restore are atomic', async t => {
  const { request } = await setup(t);
  const initial = (await request('/api/state')).data;
  assert.equal((await request('/api/deals', 'POST', { ...initial.deals[0], amount: -1 })).status, 400);
  assert.equal((await request('/api/deals', 'POST', { ...initial.deals[0], dueDate: '2026-02-30' })).status, 400);
  assert.equal((await request('/api/deals', 'POST', { ...initial.deals[0], clientId: 'missing' })).status, 400);
  assert.equal((await request('/api/clients', 'POST', null)).status, 400);
  const bad = structuredClone(initial);
  bad.clients[0].id = '" onclick="alert(1)';
  assert.equal((await request('/api/restore', 'POST', bad)).status, 400);
  assert.deepEqual((await request('/api/state')).data, initial);
  const orphan = structuredClone(initial);
  orphan.clients = [];
  assert.equal((await request('/api/restore', 'POST', orphan)).status, 400);
  assert.deepEqual((await request('/api/state')).data, initial);
  await request('/api/settings', 'PATCH', { company: 'Обновлено' });
  assert.equal((await request('/api/settings', 'PATCH', { monthlyGoal: -10 })).status, 400);
  const backup = (await request('/api/backup')).data;
  await request('/api/settings', 'PATCH', { company: 'Другое' });
  assert.equal((await request('/api/restore', 'POST', backup)).status, 200);
  assert.equal((await request('/api/state')).data.settings.company, 'Обновлено');
});

test('All frontend assets are served, source and data stay private', async t => {
  const { base, request } = await setup(t);
  const res = await fetch(base);
  assert.equal(res.status, 200);
  const html = await res.text();
  const assets = [...html.matchAll(/(?:src|href)="(\/(?:js|css)\/[^" ]+)"/g)].map(match => match[1]);
  assert.ok(assets.length > 10);
  for (const asset of [...assets, '/css/layout.css', '/css/components.css', '/css/pages.css', '/css/responsive.css']) {
    assert.equal((await fetch(base + asset)).status, 200, asset);
  }
  for (const route of ['/server/app.js', '/data/crm.json', '/package.json', '/%2e%2e%5cserver%5capp.js']) {
    assert.equal((await fetch(base + route)).status, 404, route);
  }
  assert.equal((await request('/api/state', 'GET', undefined, { Origin: 'https://example.com' })).status, 403);
});
