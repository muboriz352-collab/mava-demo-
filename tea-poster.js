'use strict';
(()=>{
 const stage=document.querySelector('#tea-stage'),picture=document.querySelector('#tea-fallback'),controls=document.querySelector('#tea-controls'),toggle=document.querySelector('#tea-toggle');
 if(!stage)return;
 if(location.protocol==='file:'){stage.dataset.state='fallback';stage.setAttribute('aria-busy','false');picture.hidden=false;return;}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),TAU=Math.PI*2,COUNT=96,W=420,H=560,GW=106,GH=141;
 const canvas=document.createElement('canvas');canvas.id='tea-poster';canvas.hidden=true;canvas.tabIndex=0;canvas.setAttribute('aria-label','Круговой обзор стакана. Вращайте пальцем или стрелками');stage.append(canvas);
 const context=canvas.getContext('2d',{alpha:true});
 let views=null,vectors=null,decoder=null,generation=0;
 let hd=null,hdState='idle',hdBusy=false,hdPending=0,hdTicket=0;
 let blocked=!!document.querySelector('dialog[open]'),active=false,loaded=false,loading=false,frame=0,position=0,target=0,last=0,paused=reduced.matches,visible=true,drag=false,x=0,pointer=null;
 const outputCanvas=document.createElement('canvas');outputCanvas.width=W;outputCanvas.height=H;
 const outputContext=outputCanvas.getContext('2d'),output=outputContext.createImageData(W,H);
 const offsets=[new Float32Array(W*H),new Float32Array(W*H),new Float32Array(W*H),new Float32Array(W*H)];
 const spans=new Uint16Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,196,224,167,253,154,266,145,276,137,283,132,288,128,292,125,295,123,297,121,299,119,301,117,303,115,305,114,306,112,308,111,309,110,310,110,310,109,311,108,312,107,312,107,313,106,313,106,314,106,314,105,315,105,315,104,316,104,316,104,316,104,316,103,317,103,317,103,317,103,317,103,317,103,317,103,317,103,317,103,317,103,317,103,317,103,317,103,317,103,317,103,317,103,317,102,318,100,320,99,321,98,322,97,323,96,324,96,324,96,324,96,324,96,324,96,324,96,324,96,324,96,324,96,324,96,324,96,324,96,324,96,324,96,324,96,324,97,323,97,323,98,322,100,319,104,316,104,316,104,316,104,316,104,316,104,316,104,316,104,316,104,316,104,316,104,316,104,316,104,316,104,316,104,316,104,316,104,316,105,315,105,315,105,315,105,315,105,315,105,315,105,315,105,315,105,315,105,315,105,315,106,314,106,314,106,314,106,314,106,314,106,314,106,314,106,314,106,314,106,314,106,314,107,313,107,313,107,313,107,313,107,313,107,313,107,313,107,313,107,313,107,313,107,313,108,312,108,312,108,312,108,312,108,312,108,312,108,312,108,312,108,312,108,312,108,312,109,311,109,311,109,311,109,311,109,311,109,311,109,311,109,311,109,311,109,311,109,311,109,311,110,310,110,310,110,310,110,310,110,310,110,310,110,310,110,310,110,310,110,310,111,310,111,309,111,309,111,309,111,309,111,309,111,309,111,309,111,309,111,309,111,309,112,308,112,308,112,308,112,308,112,308,112,308,112,308,112,308,112,308,112,308,113,308,113,307,113,307,113,307,113,307,113,307,113,307,113,307,113,307,113,307,113,307,114,306,114,306,114,306,114,306,114,306,114,306,114,306,114,306,114,306,114,306,114,306,115,305,115,305,115,305,115,305,115,305,115,305,115,305,115,305,115,305,115,305,115,305,116,305,116,304,116,304,116,304,116,304,116,304,116,304,116,304,116,304,116,304,116,304,117,303,117,303,117,303,117,303,117,303,117,303,118,302,118,302,118,302,118,302,118,302,118,302,118,302,118,302,118,302,118,302,118,301,119,301,119,301,119,301,119,301,119,301,119,301,119,301,119,301,119,301,119,301,120,300,120,300,120,300,120,300,120,300,120,300,120,300,120,300,120,300,120,300,120,300,120,300,120,300,120,300,120,300,120,300,121,299,121,299,121,299,121,299,121,299,121,299,121,299,121,299,121,299,121,299,122,299,122,298,122,298,122,298,122,298,122,298,122,298,122,298,122,298,122,298,122,298,123,297,123,297,123,297,123,297,123,297,123,297,123,297,123,297,123,297,123,297,123,297,124,296,124,296,124,296,124,296,124,296,124,296,124,296,124,296,124,296,124,296,124,296,125,295,125,295,125,295,125,295,125,295,125,295,125,295,125,295,125,295,126,295,126,294,126,294,126,294,126,294,126,294,126,294,126,294,126,294,126,294,126,294,127,294,127,293,127,293,127,293,127,293,127,293,127,293,127,293,127,293,127,293,127,293,128,292,128,292,128,292,128,292,128,292,128,292,128,292,128,292,128,292,128,292,128,292,129,291,129,291,129,291,129,291,129,291,129,291,129,291,129,291,129,291,129,291,129,291,130,290,130,290,130,290,130,290,130,290,130,290,130,290,130,290,130,290,130,290,131,289,131,289,131,289,132,288,132,288,132,288,129,291,122,298,117,303,111,309,107,313,103,317,99,321,95,325,92,328,89,331,86,334,84,336,81,339,79,341,77,343,76,344,74,346,73,347,72,348,71,349,70,350,69,351,68,352,68,352,68,352,68,352,68,352,68,352,68,352,68,352,68,352,68,352,68,352,68,352,68,352,68,352,68,352,68,352,68,352,69,351,70,350,71,349,72,348,73,347,74,346,76,344,77,343,79,341,81,339,84,336,86,334,89,331,92,328,95,325,99,321,103,317,107,313,111,309,117,303,122,298,129,291,136,284,145,275,155,265,169,251,195,225,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
 let motionIndex=-1;

 function paintHD(data){
  if(!active){data.image.close();return;}
  const w=canvas.width,h=canvas.height,fit=Math.min(w/W,h/H),dx=(w-W*fit)/2,dy=(h-H*fit)/2;
  context.clearRect(0,0,w,h);context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  context.drawImage(data.image,dx+64*fit,dy+72*fit,292*fit,452*fit);data.image.close();stage.teaAngle=data.position*TAU/COUNT;
 }
 function requestHD(){hdPending=position;if(!hdBusy&&hd){hdBusy=true;hd.postMessage({type:'render',position:hdPending});}}
 function startHD(){
  hdState='loading';const ticket=++hdTicket;
  const fail=()=>{if(ticket!==hdTicket)return;hdTicket++;hd?.terminate();hd=null;hdState='failed';hdBusy=false;delete stage.dataset.quality;delete stage.dataset.sourceScale;if(active)window.mavaStartPoster();};
  try{
   hd=new Worker('./tea-hd-v20.js');hd.onerror=fail;
   hd.onmessage=({data})=>{
    if(ticket!==hdTicket){data.image?.close();return;}
    if(data.type==='error'){fail();return;}
    if(data.type==='ready'){hdState='ready';hdBusy=false;hdPending=position;stage.dataset.quality='hd';stage.dataset.sourceScale=String(data.scale);window.mavaStartPoster();paintHD(data);return;}
    if(data.type==='frame'){hdBusy=false;paintHD(data);if(canRun()&&Math.abs(hdPending-data.position)>.000001)requestHD();}
   };
   // Both sizes come from native 2x renders; empty margins are not stored.
   const small=matchMedia('(pointer: coarse)').matches||(navigator.deviceMemory&&navigator.deviceMemory<=4);
   hd.postMessage({type:'init',scale:small?1.5:2,position,spans:Array.from(spans)});
  }catch{fail();}
 }
 async function decodeLocally(){
  const load=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url;});
  const [atlas,motion]=await Promise.all([load('./assets/tea-turntable-v16.webp?v=18'),load('./assets/tea-motion-v19.png')]);
  const scratch=document.createElement('canvas');scratch.width=W;scratch.height=H;
  const ctx=scratch.getContext('2d',{willReadFrequently:true}),frames=new Uint8ClampedArray(W*H*4*COUNT);
  for(let index=0;index<COUNT;index++){
   ctx.clearRect(0,0,W,H);ctx.drawImage(atlas,index%16*W,Math.floor(index/16)*H,W,H,0,0,W,H);
   const data=ctx.getImageData(0,0,W,H).data;
   for(let p=0;p<data.length;p+=4){const opacity=data[p+3];if(opacity>0&&opacity<255){const alpha=opacity/255;data[p]*=alpha;data[p+1]*=alpha;data[p+2]*=alpha;}}
   frames.set(data,index*W*H*4);
   if(index%4===3)await new Promise(resolve=>setTimeout(resolve,0));
  }
  atlas.src='';scratch.width=motion.width;scratch.height=motion.height;ctx.drawImage(motion,0,0);
  const vectors=ctx.getImageData(0,0,scratch.width,scratch.height).data;motion.src='';scratch.width=scratch.height=1;
  return {frames:frames.buffer,vectors:vectors.buffer};
 }
 function decode(){
  if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined')return decodeLocally();
  return new Promise((resolve,reject)=>{
   const worker=new Worker('./tea-decode-v19.js');decoder=worker;
   worker.onmessage=e=>{worker.terminate();if(decoder===worker)decoder=null;e.data.error?reject(new Error(e.data.error)):resolve(e.data);};
   worker.onerror=e=>{worker.terminate();if(decoder===worker)decoder=null;reject(e);};worker.postMessage({});
  }).catch(decodeLocally);
 }
 function prepareMotion(index){
  if(index===motionIndex)return;
  const data=vectors,stride=GW*2*16,baseX=index%16*GW*2,baseY=Math.floor(index/16)*GH;
  for(let y=76;y<517;y++){
   const iy=y>>2,fy=(y%4)/4;
   for(let x=spans[y*2]&~3;x<spans[y*2+1];x+=4){
    const ix=x>>2,xy=y*W+x;
    for(let direction=0;direction<2;direction++){
     const p=((baseY+iy)*stride+baseX+ix+direction*GW)*4,q=p+stride*4;
     for(let c=0;c<2;c++){
      const left=data[p+c]+(data[q+c]-data[p+c])*fy,right=data[p+4+c]+(data[q+4+c]-data[p+4+c])*fy;
      const start=(left-128)/8,step=(right-left)/32,field=offsets[direction*2+c];
      field[xy]=start;field[xy+1]=start+step;field[xy+2]=start+2*step;field[xy+3]=start+3*step;
     }
    }
   }
  }
  motionIndex=index;
 }
 function draw(){
  if(!active)return;
  if(hdState==='ready'){requestHD();return;}
  if(!loaded)return;
  const w=canvas.width,h=canvas.height,scale=Math.min(w/W,h/H),dx=(w-W*scale)/2,dy=(h-H*scale)/2;
  const base=Math.floor(position),index=((base%COUNT)+COUNT)%COUNT,t=position-base,u=1-t;
  const a=views[index],b=views[(index+1)%COUNT];prepareMotion(index);
  const out=output.data,[ax,ay,bx,by]=offsets;
  // Both views are aligned to the SAME angle. The interval endpoints are exact
  // source views; there is no nearest-frame switch in the middle of a turn.
  for(let y=76;y<517;y++)for(let x=spans[y*2];x<spans[y*2+1];x++){
   const xy=y*W+x,dst=xy*4;
   const xa=x-t*ax[xy],ya=y-t*ay[xy],xb=x-u*bx[xy],yb=y-u*by[xy];
   const ia=xa|0,ja=ya|0,ib=xb|0,jb=yb|0,fa=xa-ia,ga=ya-ja,fb=xb-ib,gb=yb-jb;
   const pa=(ja*W+ia)*4,qa=pa+W*4,pb=(jb*W+ib)*4,qb=pb+W*4;
   const aa=(1-fa)*(1-ga)*u,ab=fa*(1-ga)*u,ac=(1-fa)*ga*u,ad=fa*ga*u;
   const ba=(1-fb)*(1-gb)*t,bb=fb*(1-gb)*t,bc=(1-fb)*gb*t,bd=fb*gb*t;
   out[dst]=a[pa]*aa+a[pa+4]*ab+a[qa]*ac+a[qa+4]*ad+b[pb]*ba+b[pb+4]*bb+b[qb]*bc+b[qb+4]*bd;
   out[dst+1]=a[pa+1]*aa+a[pa+5]*ab+a[qa+1]*ac+a[qa+5]*ad+b[pb+1]*ba+b[pb+5]*bb+b[qb+1]*bc+b[qb+5]*bd;
   out[dst+2]=a[pa+2]*aa+a[pa+6]*ab+a[qa+2]*ac+a[qa+6]*ad+b[pb+2]*ba+b[pb+6]*bb+b[qb+2]*bc+b[qb+6]*bd;
   out[dst+3]=a[pa+3]*aa+a[pa+7]*ab+a[qa+3]*ac+a[qa+7]*ad+b[pb+3]*ba+b[pb+7]*bb+b[qb+3]*bc+b[qb+7]*bd;
   const alpha=out[dst+3];if(alpha&&alpha<255){const ratio=255/alpha;out[dst]*=ratio;out[dst+1]*=ratio;out[dst+2]*=ratio;}
  }
  outputContext.putImageData(output,0,0);context.clearRect(0,0,w,h);context.drawImage(outputCanvas,dx,dy,W*scale,H*scale);stage.teaAngle=position*TAU/COUNT;
 }
 function resize(){if(!active)return;const ratio=Math.min(devicePixelRatio||1,2),w=Math.round(stage.clientWidth*ratio),h=Math.round(stage.clientHeight*ratio);if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;}draw();}
 const canRun=()=>active&&!blocked&&visible&&!document.hidden;
 const schedule=()=>{if(!frame&&canRun())frame=requestAnimationFrame(tick);};
 function tick(now){frame=0;if(!canRun())return;const dt=Math.min(last?(now-last)/1000:1/60,.1);last=now;if(!paused&&!drag)target+=dt*COUNT*.15/TAU;position+=(target-position)*(1-Math.exp(-dt/.045));if(Math.abs(target-position)<.00001)position=target;draw();if(!paused||Math.abs(target-position)>.00001)schedule();else last=0;}
 function sync(){cancelAnimationFrame(frame);frame=0;last=0;if(!active)return;toggle.textContent=paused?'▶':'Ⅱ';toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Включить вращение':'Приостановить вращение');stage.dataset.paused=String(paused);schedule();}
 window.mavaStopPoster=()=>{active=false;hdTicket++;hd?.terminate();hd=null;hdState='idle';hdBusy=false;cancelAnimationFrame(frame);frame=0;canvas.hidden=true;generation++;decoder?.terminate();decoder=null;views=null;vectors=null;loaded=false;loading=false;motionIndex=-1;};
 window.mavaStartPoster=(options={})=>{
  if(stage.dataset.ready==='true')return;
  if(Number.isFinite(options.angle))position=target=options.angle*COUNT/TAU;
  if(typeof options.paused==='boolean')paused=options.paused;
  active=true;
  if(hdState==='idle'&&typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined'&&typeof WebAssembly!=='undefined'){startHD();return;}
  if(hdState==='loading')return;
  if(!loaded&&hdState!=='ready'){
   if(!loading){loading=true;const ticket=generation;decode().then(data=>{if(ticket!==generation)return;views=Array.from({length:COUNT},(_,i)=>new Uint8ClampedArray(data.frames,i*W*H*4,W*H*4));vectors=new Uint8ClampedArray(data.vectors);loaded=true;if(active)window.mavaStartPoster();}).catch(()=>{if(ticket!==generation||!active)return;loading=false;picture.hidden=false;controls.hidden=true;stage.dataset.mode='still';});}
   return;
  }
  stage.dataset.mode='turntable';stage.dataset.state='fallback';stage.dataset.build='20';stage.dataset.motion='continuous';stage.querySelector('#tea-canvas').hidden=true;picture.hidden=true;canvas.hidden=false;controls.hidden=false;resize();sync();
 };
 new ResizeObserver(resize).observe(stage);new IntersectionObserver(e=>{visible=e[0].isIntersecting;sync();}).observe(stage);
 document.addEventListener('visibilitychange',sync);document.addEventListener('mava:modal',e=>{blocked=e.detail;sync();});reduced.addEventListener('change',()=>{paused=reduced.matches;if(paused)target=position;sync();});
 toggle.addEventListener('click',()=>{if(active){paused=!paused;if(paused)target=position;sync();}});
 const turn=delta=>{if(active){target+=delta;schedule();}};
 document.querySelector('#tea-left').addEventListener('click',()=>turn(-.32*COUNT/TAU));document.querySelector('#tea-right').addEventListener('click',()=>turn(.32*COUNT/TAU));
 canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;drag=true;target=position;pointer=e.pointerId;x=e.clientX;canvas.setPointerCapture(pointer);schedule();});
 canvas.addEventListener('pointermove',e=>{if(drag&&e.pointerId===pointer){turn((e.clientX-x)*COUNT/Math.max(480,stage.clientWidth*1.6));x=e.clientX;}});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(e.pointerId===pointer){drag=false;pointer=null;schedule();}});
 canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();turn((e.key==='ArrowLeft'?-.2:.2)*COUNT/TAU);}});
})();
