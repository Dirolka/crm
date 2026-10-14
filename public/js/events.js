document.addEventListener('click',async e=>{const el=e.target.closest('button,a[data-action]');if(!el)return;try{
  if(el.dataset.edit)return edit(el.dataset.edit,el.dataset.id);
  if(el.dataset.client)return showClient(el.dataset.client);
  if(el.dataset.clientDeal)return edit('deals',null,{clientId:el.dataset.clientDeal});
  if(el.dataset.newStage)return edit('deals',null,{stage:el.dataset.newStage});
  if(el.dataset.delete)return askConfirm('Удалить запись?','Это действие нельзя отменить. Связанные записи клиента нужно предварительно удалить или переназначить.',()=>api(`${el.dataset.delete}/${el.dataset.id}`,'DELETE'));
  if(el.dataset.toggle){const t=db.tasks.find(t=>t.id===el.dataset.toggle);el.disabled=true;await api('tasks/'+t.id,'PATCH',{done:!t.done});await refresh();return toast(t.done?'Задача возвращена в работу':'Задача выполнена');}
  if(el.dataset.view){view=el.dataset.view;return render();}
  if(el.dataset.filter){filter=el.dataset.filter;return render();}
  if(el.dataset.taskFilter){taskFilter=el.dataset.taskFilter;return render();}
  if(el.dataset.stage){page='deals';location.hash='deals';setTimeout(()=>{filter=el.dataset.stage;render();},0);return;}
  const action=el.dataset.action;
  if(action?.startsWith('new-'))return edit(action.slice(4));
  if(action==='close')return closeModal();
  if(action==='menu')return $('.sidebar').classList.toggle('mobile-open');
  if(action==='export')return downloadCSV();
  if(action==='notifications')return showModal(`<div class="modal-heading"><div><div class="eyebrow">ИСТОРИЯ ИЗМЕНЕНИЙ</div><h2>Активность</h2></div><button class="icon-btn" data-action="close" aria-label="Закрыть">${icon('close')}</button></div><div class="modal-body activity-list">${db.activities.slice(0,30).map(a=>`<div>${icon('clock',17)}<p>${esc(a.text)}<small>${fmtDate(a.createdAt)} · ${new Date(a.createdAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</small></p></div>`).join('')}</div>`);
  if(['overview','deals','clients','tasks','analytics','settings'].includes(action))go(action);
}catch(err){toast(err.message,true);}});
document.addEventListener('submit',async e=>{if(!['record-form','settings-form'].includes(e.target.id))return;e.preventDefault();const form=e.target;const b=form.querySelector('[type=submit]');b.disabled=true;const data=Object.fromEntries(new FormData(form));try{if(form.id==='settings-form'){data.monthlyGoal=Number(data.monthlyGoal);await api('settings','PATCH',data);}else{const type=form.dataset.type;if(type==='deals')data.amount=Number(data.amount);if(type==='tasks')data.done=form.elements.done.checked;await api(type+(form.dataset.id?'/'+form.dataset.id:''),form.dataset.id?'PATCH':'POST',data);closeModal();}await refresh();toast('Изменения сохранены');}catch(err){form.querySelector('.form-error').textContent=err.message;b.disabled=false;}});
document.addEventListener('input',e=>{if(e.target.id==='search'){const pos=e.target.selectionStart;query=e.target.value;render();const input=$('#search');input.focus();if(input.type==='text')input.setSelectionRange(pos,pos);}});
document.addEventListener('change',async e=>{if(e.target.id==='owner-filter'){ownerFilter=e.target.value;render();}if(e.target.id==='stage-filter'){filter=e.target.value;render();}if(e.target.id==='period'){period=e.target.value;render();}if(e.target.id==='restore-file'){const file=e.target.files[0];if(!file)return;try{if(file.size>2e6)throw new Error('Максимальный размер файла — 2 МБ');const data=JSON.parse(await file.text());askConfirm('Восстановить резервную копию?','Все текущие клиенты, сделки, задачи и настройки будут заменены содержимым файла.',()=>api('restore','POST',data));}catch(err){toast('Не удалось прочитать копию: '+err.message,true);}e.target.value='';}});
document.addEventListener('dragstart',e=>{const card=e.target.closest('[data-drag]');if(card){e.dataTransfer.setData('text/plain',card.dataset.drag);e.dataTransfer.effectAllowed='move';card.classList.add('dragging');}});
document.addEventListener('dragend',()=>document.querySelectorAll('.dragging,.drag-over').forEach(el=>el.classList.remove('dragging','drag-over')));
document.addEventListener('dragover',e=>{const col=e.target.closest('[data-drop]');if(col){e.preventDefault();e.dataTransfer.dropEffect='move';col.classList.add('drag-over');}});
document.addEventListener('dragleave',e=>{const col=e.target.closest('[data-drop]');if(col&&!col.contains(e.relatedTarget))col.classList.remove('drag-over');});
document.addEventListener('drop',async e=>{const col=e.target.closest('[data-drop]');if(!col)return;e.preventDefault();const id=e.dataTransfer.getData('text/plain');col.classList.remove('drag-over');if(!db.deals.some(d=>d.id===id))return;try{await api('deals/'+id,'PATCH',{stage:col.dataset.drop});await refresh();toast('Этап сделки обновлён');}catch(err){toast(err.message,true);}});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
