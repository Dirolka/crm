const http = require('node:http');
const path = require('node:path');
const { createStore } = require('./data/store');
const { handleApi } = require('./routes/api');
const { serveStatic } = require('./routes/static');
const { fail } = require('./utils/errors');

function createServer({ dataFile = process.env.CRM_DATA_FILE || path.join(__dirname, '../data/crm.json') } = {}) {
  const store = createStore(dataFile);
  return http.createServer(async (req, res) => {
    const json = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(value));
    };
    try {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      const host = req.headers.host || '';
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) fail('Доступ разрешён только с этого компьютера', 403);
      if (req.headers.origin && req.headers.origin !== 'http://' + host) fail('Недопустимый источник запроса', 403);
      const url = new URL(req.url, 'http://' + host);
      if (url.pathname.startsWith('/api/')) await handleApi(req, res, url, store, json);
      else serveStatic(req, res, url);
    } catch (error) {
      json(error.status || 500, { error: error.status ? error.message : 'Ошибка сервера. Проверьте доступ к файлу данных.' });
      if (!error.status) console.error(error);
    }
  });
}

module.exports = { createServer };
