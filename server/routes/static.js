const fs = require('node:fs');
const path = require('node:path');
const { fail } = require('../utils/errors');
const root = path.resolve(__dirname, '../../public');

function serveStatic(req, res, url) {
  if (!['GET', 'HEAD'].includes(req.method)) fail('Метод не поддерживается', 405);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { fail('Некорректный адрес'); }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) fail('Страница не найдена', 404);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  const type = types[path.extname(file)];
  if (!type || !fs.existsSync(file) || !fs.statSync(file).isFile()) fail('Страница не найдена', 404);
  res.writeHead(200, {
    'Content-Type': type + '; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  });
  res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file));
}

module.exports = { serveStatic };
