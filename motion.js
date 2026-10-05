'use strict';
(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function reveal(node){if(!reduced.matches&&node.animate)node.animate([{opacity:.35,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:330,easing:'cubic-bezier(.2,.7,.2,1)'});}
  // Native anchors retain browser history and never re-trigger a completed scroll.
  // Animate incoming content without hiding it or blocking navigation.
  if(!('CSSViewTransitionRule' in window))document.querySelectorAll('main').forEach(reveal);
  const targets=['#drink-grid','#drink-detail','#menu-panel','#branches-panel','#settings-panel'];
  for(const selector of targets){const node=document.querySelector(selector);if(!node)continue;new MutationObserver(records=>{if(node.hidden)return;if(records.some(r=>r.type==='childList'||r.attributeName==='hidden'))reveal(node);}).observe(node,{childList:true,attributes:true,attributeFilter:['hidden']});}
})();
