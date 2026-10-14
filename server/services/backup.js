const { randomUUID } = require('node:crypto');
const { clean } = require('../validation/records');
const { fail } = require('../utils/errors');

function restoreBackup(input) {
  const collections = ['clients', 'deals', 'tasks'];
  if (input.schemaVersion !== 1 || !collections.every(key => Array.isArray(input[key]) && input[key].length <= 10000)) {
    fail('Неверный формат резервной копии');
  }
  const restored = {
    schemaVersion: 1,
    clients: [], deals: [], tasks: [], activities: [],
    settings: clean('settings', input.settings, {})
  };
  for (const type of collections) {
    const ids = new Set();
    restored[type] = input[type].map(item => {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id)) {
        fail('Неверные или повторяющиеся ID');
      }
      ids.add(item.id);
      if (typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt))) fail('Некорректная дата создания');
      if (item.closedAt && (typeof item.closedAt !== 'string' || !Number.isFinite(Date.parse(item.closedAt)))) fail('Некорректная дата закрытия');
      return clean(type, item, restored, item);
    });
  }
  restored.activities = [{
    id: randomUUID(),
    text: 'Данные восстановлены из резервной копии',
    createdAt: new Date().toISOString()
  }];
  return restored;
}

module.exports = { restoreBackup };
