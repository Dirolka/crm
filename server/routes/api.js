const { randomUUID } = require('node:crypto');
const { fail } = require('../utils/errors');
const { clean } = require('../validation/records');
const { restoreBackup } = require('../services/backup');
const { readJson } = require('../utils/request');

async function handleApi(req, res, url, store, json) {
  let db = store.read();
  const { save } = store;
      if(url.pathname==='/api/state'&&req.method==='GET') return json(200,db);
      if(url.pathname==='/api/backup'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="orbit-backup.json"');return json(200,db);}
      if(url.pathname.startsWith('/api/')) {
        if(!['POST','PATCH','DELETE'].includes(req.method)) fail('Метод не поддерживается',405);
        let input={};
        if(req.method!=='DELETE') {
          input = await readJson(req);
        }
        db = store.read();
        const next=structuredClone(db);
        if(url.pathname==='/api/restore'&&req.method==='POST'){
          save(restoreBackup(input));
          return json(200,{ok:true});
        }
        const [, ,type,id]=url.pathname.split('/');
        if (url.pathname.split('/').length > 4) fail('Не найдено',404);
        if(type==='settings'&&req.method==='PATCH'&&!id){next.settings=clean('settings',input,db,db.settings);save(next);return json(200,next.settings);}
        if(!['clients','deals','tasks'].includes(type)) fail('Не найдено',404);
        const index=next[type].findIndex(x=>x.id===id);
        if(id&&index<0) fail('Запись не найдена',404);
        let result,text;
        if(req.method==='POST'&&!id){result=clean(type,input,next);next[type].unshift(result);text=`Создано: ${result.title||result.name}`;}
        else if(req.method==='PATCH'&&id){result=clean(type,input,next,next[type][index]);next[type][index]=result;text=`Обновлено: ${result.title||result.name}`;}
        else if(req.method==='DELETE'&&id){result=next[type][index];if(type==='clients'&&(next.deals.some(d=>d.clientId===id)||next.tasks.some(t=>t.clientId===id)))fail('У клиента есть сделки или задачи. Сначала удалите или переназначьте их.',409);next[type].splice(index,1);text=`Удалено: ${result.title||result.name}`;}
        else fail('Неверный запрос',400);
        next.activities.unshift({id:randomUUID(),text,createdAt:new Date().toISOString()});next.activities=next.activities.slice(0,100);save(next);return json(req.method==='POST'?201:200,result);
      }

}

module.exports = { handleApi };
