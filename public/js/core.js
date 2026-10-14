const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',deals:'M4 7h16v14H4z M8 7V3h8v4 M4 12h16 M10 12v3h4v-3',clients:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',tasks:'M9 5h11v16H4V5h3 M8 3h8v4H8z M8 12l2 2 5-5 M8 18h8',chart:'M3 3v18h18 M7 16v-5 M12 16V7 M17 16V4',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',search:'m21 21-5-5 M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16',plus:'M12 5v14 M5 12h14',arrow:'M5 12h14 M14 7l5 5-5 5',chevron:'m9 5 7 7-7 7',download:'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',calendar:'M4 5h16v16H4z M16 3v4 M8 3v4 M4 11h16',close:'m6 6 12 12 M6 18 18 6',check:'m5 12 4 4L19 6',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',up:'m4 16 6-6 4 4 6-9 M15 5h5v5',clock:'M12 8v5l3 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20',more:'M5 12h.01 M12 12h.01 M19 12h.01',menu:'M4 6h16 M4 12h16 M4 18h16',logout:'M9 4H4v16h5 M9 12h12 m-5-5 5 5-5 5',wallet:'M3 5h17v15H3z M3 5V3h14 M15 10h6v5h-6z',target:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10 M12 12h.01',edit:'m15 5 4 4 M4 20l4-1L21 6l-4-4L4 15z',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7'};
const icon=(name,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.grid}"/></svg>`;
const stageNames={new:'Новая',qualified:'Квалификация',proposal:'Предложение',negotiation:'Переговоры',won:'Успешно',lost:'Не реализовано'};
const priorities={high:'Высокий',medium:'Средний',low:'Низкий'};
const statusNames={lead:'Лид',active:'Активный',inactive:'Неактивный'};
const members=['Анна Смирнова','Михаил Ким','Дарья Волкова'];
const nav=[['overview','grid','Обзор'],['deals','deals','Сделки'],['clients','clients','Клиенты'],['tasks','tasks','Задачи'],['analytics','chart','Аналитика']];
let db, page=location.hash.slice(1)||'overview', query='', filter='all', ownerFilter='all', view='board', taskFilter='open', period='month', toastTimer;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const money=(n,compact=false)=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:db?.settings.currency||'KZT',maximumFractionDigits:0,...(compact?{notation:'compact'}:{})}).format(n);
const fmtDate=s=>s?new Date(s.length===10?s+'T12:00:00':s).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}):'—';
const initials=s=>String(s||'?').split(' ').map(s=>s[0]).slice(0,2).join('');
const avatar=(s,small=false)=>`<span class="avatar ${small?'small':''} tone-${String(s||'').length%5}">${esc(initials(s))}</span>`;
const client=id=>db.clients.find(c=>c.id===id);
const openDeals=()=>db.deals.filter(d=>!['won','lost'].includes(d.stage));
const sum=arr=>arr.reduce((s,d)=>s+d.amount,0);
const match=(...values)=>values.join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase());
const empty=(text,action='')=>`<div class="empty">${icon('search',30)}<h3>${text}</h3><p>Добавьте запись или измените условия поиска.</p>${action}</div>`;
const button=(label,action,ico='plus',cls='primary')=>`<button class="btn ${cls}" data-action="${action}">${icon(ico,17)}${label}</button>`;
async function api(url,method='GET',data){const r=await fetch('/api/'+url,{method,headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const value=await r.json();if(!r.ok)throw new Error(value.error||'Ошибка запроса');return value;}
async function refresh(){db=await api('state');render();}
function toast(text,error=false){const el=$('#toast');el.textContent=text;el.className='show'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='',4000);}
function go(next){if(page===next){query='';filter='all';render();}else location.hash=next;}
window.addEventListener('hashchange',()=>{page=location.hash.slice(1)||'overview';query='';filter='all';ownerFilter='all';render();});
