const { randomUUID } = require('node:crypto');
const { STAGES } = require('../config');
const { fail } = require('../utils/errors');

function clean(type,input,db,existing={}) {
  if(!input || typeof input !== 'object' || Array.isArray(input)) fail('Некорректные данные');
  const v = {...existing,...input};
  const str=(key,required=false,max=500)=>{ const s=String(v[key]??'').trim(); if(required&&!s) fail(`Заполните поле ${key}`); if(s.length>max) fail(`Поле ${key} слишком длинное`); return s; };
  const choice=(key,values)=>{ if(!values.includes(v[key])) fail(`Недопустимое значение ${key}`); return v[key]; };
  if(type==='settings') return {company:str('company',true,100),name:str('name',true,100),currency:choice('currency',['KZT','RUB','USD','EUR']),monthlyGoal:number(v.monthlyGoal)};
  const result={id:existing.id||randomUUID(),createdAt:existing.createdAt||new Date().toISOString(),owner:str('owner',true,100),notes:str('notes',false,5000)};
  if(type==='clients') {
    Object.assign(result,{name:str('name',true,100),company:str('company',true,150),email:str('email',false,150),phone:str('phone',false,50),industry:str('industry',false,100),status:choice('status',['lead','active','inactive'])});
    if(result.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) fail('Некорректный email');
  } else {
    Object.assign(result,{title:str('title',true,200),clientId:str('clientId'),dueDate:str('dueDate',true,10)});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(result.dueDate)||!Number.isFinite(Date.parse(result.dueDate))||new Date(result.dueDate).toISOString().slice(0,10)!==result.dueDate) fail('Некорректная дата');
    if(result.clientId&&!db.clients.some(c=>c.id===result.clientId)) fail('Клиент не найден');
    if(type==='deals') {
      if(!result.clientId) fail('Выберите клиента');
      Object.assign(result,{amount:number(v.amount),stage:choice('stage',STAGES)});
      result.closedAt=['won','lost'].includes(result.stage)?existing.closedAt||new Date().toISOString():null;
    } else { if(typeof v.done!=='boolean') fail('Некорректный статус задачи'); Object.assign(result,{priority:choice('priority',['low','medium','high']),done:v.done}); }
  }
  return result;
}
function number(v){ if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e12) fail('Сумма должна быть числом от 0 до 1 трлн'); return Math.round(v*100)/100; }

module.exports = { clean };
