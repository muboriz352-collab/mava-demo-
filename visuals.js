'use strict';
(()=>{
 // Each half is at least one viewport wide; translation is exactly one complete half.
 const ticker=document.querySelector('.marquee'),track=ticker?.firstElementChild;
 if(track){const source=track.firstElementChild.textContent;let previous=0;const rebuild=()=>{const width=ticker.getBoundingClientRect().width;if(Math.abs(width-previous)<2)return;previous=width;track.replaceChildren();const first=document.createElement('div');first.className='ticker-group';track.append(first);for(let i=0;i<20;i++){const span=document.createElement('span');span.textContent=source;first.append(span);if(first.getBoundingClientRect().width>=width+100)break;}track.append(first.cloneNode(true));track.style.animationDuration=Math.max(24,first.getBoundingClientRect().width/42)+'s';};new ResizeObserver(rebuild).observe(ticker);document.fonts.ready.then(rebuild);rebuild();}
 const stage=document.querySelector('#tea-stage');if(stage){window.mavaTeaFallback=()=>{if(stage.dataset.ready==='true')return;stage.dataset.state='fallback';stage.setAttribute('aria-busy','false');stage.querySelector('#tea-loader')?.setAttribute('hidden','');const img=stage.querySelector('#tea-fallback');if(img){img.hidden=false;img.src='./assets/brown-sugar-render.png?v=14';}document.querySelector('#tea-controls').hidden=true;window.mavaStartPoster?.();};setTimeout(()=>{if(stage.dataset.ready!=='true')window.mavaTeaFallback();},15000);}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(!reduced.matches&&'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}),{threshold:.06});document.querySelectorAll('.section-head,.manifesto').forEach(node=>{node.classList.add('reveal');observer.observe(node);});}
})();

// Freeze expensive background work while a modal occupies the screen.
(()=>{const dialogs=[...document.querySelectorAll('dialog')];const sync=()=>{const blocked=dialogs.some(d=>d.open);document.documentElement.classList.toggle('modal-open',blocked);document.dispatchEvent(new CustomEvent('mava:modal',{detail:blocked}));};for(const d of dialogs)new MutationObserver(sync).observe(d,{attributes:true,attributeFilter:['open']});sync();})();
