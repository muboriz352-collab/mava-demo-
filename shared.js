'use strict';
const Mava = (() => {
  const rootUrl = new URL('./', document.currentScript.src);
  function url(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return value;
    let path = value.slice(1);
    if (!path) path = 'index.html';
    path = path.replace(/^(menu|admin|about)\/?(?=[?#]|$)/, (_, page) => (page === 'about' ? 'index' : page) + '.html');
    return new URL(path, rootUrl).href;
  }
  const categories = {'milk':'Молочный чай','bubble':'Баббл-ти','matcha':'Матча','fruit':'Фруктовый чай','coconut':'Кокос','yakult':'Якульт','smoothie':'Смузи','coffee':'Кофе','extra':'Добавки'};
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else if (value !== null && value !== undefined) node.setAttribute(key, ['src','href','poster'].includes(key) ? url(value) : key === 'srcset' ? value.split(',').map(item => item.trim().split(/\s+/).map((part, i) => i === 0 ? url(part) : part).join(' ')).join(', ') : value);
    }
    for (const child of children.flat()) if (child !== null && child !== undefined) node.append(child);
    return node;
  }
  const money = n => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
  const price = n => n===null?el('span',{class:'price'},'Цена уточняется'):el('span',{class:'price'},money(n),' ',el('small',{},'TJS'));
  function imageSource(src){return url(src);}
  function photo(src,name,attrs={}) {
    const stock=/^\/assets\/menu-branded\/item-(\d{2})\.svg$/.exec(src||'');
    const fast=stock?'/assets/menu-fast/item-'+stock[1]:null;
    const img=el('img',{src:fast?fast+'-384.webp':src,alt:name,loading:'lazy',decoding:'async',...(fast?{srcset:fast+'-384.webp 384w, '+fast+'-768.webp 768w',sizes:'(max-width:700px) 44vw, (max-width:1100px) 28vw, 300px'}:{}),...attrs});
    if(src?.startsWith('/assets/menu-clean/')||src?.startsWith('/assets/menu-branded/'))img.dataset.origin='enhanced';
    else if(src?.startsWith('/assets/menu-source-v11/'))img.dataset.origin='reference';
    img.addEventListener('error',()=>{img.classList.add('photo-unavailable');img.alt=name+' — фото временно недоступно';},{once:true});
    return img;
  }
  let timer;
  function toast(message) { const t=document.querySelector('#toast');t.textContent=message;t.hidden=false;clearTimeout(timer);timer=setTimeout(()=>t.hidden=true,4500); }
  async function api(path, options={}) {
    let response;
    try { response = await fetch(path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}}); }
    catch { throw new Error('Нет связи с сервером. Проверь подключение и попробуй ещё раз.'); }
    const data = await response.json().catch(()=>({error:'Не удалось получить ответ сервера.'}));
    if (!response.ok) { const error=new Error(data.error||'Не удалось выполнить действие.');error.status=response.status;throw error; }
    return data;
  }
  function setupDialog(dialog) {
    dialog.querySelector('.close-button')?.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  }
  return {categories,el,money,price,photo,imageSource,toast,api,setupDialog,url};
})();
