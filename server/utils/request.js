const { fail } = require('./errors');

async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) fail('Ожидается JSON', 415);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2e6) fail('Файл слишком большой', 413);
    chunks.push(chunk);
  }
  let input;
  try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { fail('Некорректный JSON'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Ожидается объект JSON');
  return input;
}

module.exports = { readJson };
