export let captureTeaFrame, captureTeaAtlas;
import * as THREE from './vendor/three.module.js';
import {createTea} from './milk-model.mjs?v=18';
import {prepareTeaLighting} from './tea-lighting.mjs?v=18';
import {rotationBounds, frameTea} from './tea-layout.mjs?v=18';

const canvas = document.querySelector('#tea-canvas');
const stage = document.querySelector('#tea-stage');
const fallback = document.querySelector('#tea-fallback');
const controls = document.querySelector('#tea-controls');
const toggle = document.querySelector('#tea-toggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(pointer: coarse)');
let renderer;

function studioEnvironment() {
  const room = new THREE.Scene();
  room.background = new THREE.Color().setRGB(.65, .65, .62);
  const panel = (w, h, x, y, z, rgb) => {
    const material = new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(...rgb), side:THREE.DoubleSide, toneMapped:false});
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,h), material);
    mesh.position.set(x,y,z); mesh.lookAt(0,0,0); room.add(mesh);
  };
  panel(5,7,-4,3,4,[2.3,2.2,2.0]);
  panel(5,7,4,2,3,[2.0,2.1,2.0]);
  panel(6,5,0,4,-4,[1.8,1.8,1.7]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(room,.055,.1,30);
  room.traverse(object => {if(object.isMesh){object.geometry.dispose();object.material.dispose();}});
  pmrem.dispose();
  return target;
}

async function boot() {
  renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'default'});
  canvas.style.contain='strict';canvas.style.transform='translateZ(0)';
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  const scene = new THREE.Scene();
  let environment;
  // Studio lookup removes per-frame physical-lighting work; original materials are a safe load-error fallback.
  scene.add(new THREE.HemisphereLight('#fffcf4','#d4cebd',.8));
  scene.add(new THREE.AmbientLight('#ffffff',.12));
  const light = (color,intensity,x,y,z) => {
    const source = new THREE.DirectionalLight(color,intensity);
    source.position.set(x,y,z); scene.add(source);
  };
  light('#fff7e9',1.2,-3,5,5);
  light('#ffffff',.65,4,3,4);
  light('#ffffff',.65,0,2,-5);
  const {root,sleeveMaterial,updateIce} = await createTea();
  try { await prepareTeaLighting(root);stage.dataset.lighting='cached'; }
  catch {environment=studioEnvironment();scene.environment=environment.texture;stage.dataset.lighting='physical';}
  const bounds = rotationBounds(root);
  scene.add(root);
  root.traverse(o=>{if(o!==root){o.updateMatrix();o.matrixAutoUpdate=false;}});
  root.rotation.y = -.10;
  const camera = new THREE.PerspectiveCamera(32,1,.1,40);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8,2.2), new THREE.ShaderMaterial({
    transparent:true, depthWrite:false,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 vUv; void main(){float a=1.0-smoothstep(0.02,0.5,length(vUv-0.5));gl_FragColor=vec4(0.01,0.04,0.025,a*a*0.40);}'
  }));
  shadow.rotation.x = -Math.PI/2; shadow.position.y = -1.64;
  scene.add(shadow);

  let blocked=!!document.querySelector('dialog[open]');
  let frame=0,visible=true,paused=reduced.matches,dragging=false,lost=false,last=0;
  let turn=-.10,target=turn,lastX=0,pointer=null,sizeReady=false,iceTime=reduced.matches?10:0;
  let sampleTime=0,sampleFrames=0,pendingResize=true,width=0,height=0;
  let qualityCap=2,refreshInterval=Infinity,badWindows=0,goodWindows=0,warmup=performance.now()+2500;
  updateIce(iceTime);
  const canDraw=()=>visible&&!blocked&&!document.hidden&&!lost&&sizeReady;
  function draw(){if(!lost&&sizeReady)renderer.render(scene,camera);}
  function schedule(){if(!frame&&canDraw())frame=requestAnimationFrame(tick);}
  function tick(now){
    frame=0;if(!canDraw())return;
    if(pendingResize)applySize();
    const elapsed=last?now-last:16.67,dt=Math.min(elapsed,100)/1000;last=now;
    if(!paused&&!dragging)target+=dt*.15;
    const difference=target-turn;
    // One display-driven loop owns rotation; pointer events only update a target.
    turn+=difference*(1-Math.exp(-dt/0.045));
    if(Math.abs(target-turn)<.00001)turn=target;
    root.rotation.y=turn;
    if(!paused){iceTime+=dt;updateIce(iceTime);}
    stage.teaAngle=turn;draw();
    if(!paused||Math.abs(target-turn)>.00001){
      // Do not mistake loading, dragging or a 30 Hz display for a slow GPU.
      if(now>warmup&&!dragging&&elapsed>4&&elapsed<100){
        refreshInterval=Math.min(refreshInterval,elapsed);sampleTime+=elapsed;sampleFrames++;
        if(sampleTime>=1500){
          const average=sampleTime/sampleFrames,ratio=renderer.getPixelRatio();
          const budget=Math.max(16.67,Math.min(33.34,refreshInterval));
          badWindows=average>budget*1.4?badWindows+1:0;
          goodWindows=average<budget*1.10?goodWindows+1:0;
          if(badWindows>=2&&ratio>.8){renderer.setPixelRatio(Math.max(.8,ratio*.85));badWindows=goodWindows=0;}
          else if(goodWindows>=5&&ratio<qualityCap-.02){renderer.setPixelRatio(Math.min(qualityCap,ratio*1.1));goodWindows=0;}
          stage.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);sampleTime=0;sampleFrames=0;
        }
      }
      schedule();
    }else last=0;
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;last=0;sampleTime=0;sampleFrames=0;
    toggle.textContent=paused?'▶':'Ⅱ';stage.dataset.paused=String(paused);
    toggle.setAttribute('aria-pressed',String(paused));
    toggle.setAttribute('aria-label',paused?'Включить вращение':'Приостановить вращение');
    schedule();
  }
  captureTeaFrame=()=>{draw();return canvas.toDataURL('image/png');};
  // Offline export helper; never runs in the interactive animation loop.
  captureTeaAtlas=(options={})=>{
    const {width:w=420,height:h=560,columns=16,count=96,start=0,crop=[0,0,w,h],format='image/webp',quality=.96}=options;
    const prev=paused,saved=turn,savedRatio=renderer.getPixelRatio();paused=true;cancelAnimationFrame(frame);frame=0;
    const [sx,sy,cw,ch]=crop,out=document.createElement('canvas');out.width=cw*columns;out.height=ch*Math.ceil(count/columns);
    const ctx=out.getContext('2d');renderer.setPixelRatio(1);renderer.setSize(w,h,false);frameTea(camera,bounds,w/h);
    for(let i=0;i<count;i++){root.rotation.y=(start+i)/96*Math.PI*2;draw();ctx.drawImage(canvas,sx,sy,cw,ch,(i%columns)*cw,Math.floor(i/columns)*ch,cw,ch);}
    turn=saved;target=turn;root.rotation.y=turn;renderer.setPixelRatio(savedRatio);pendingResize=true;applySize();paused=prev;sync();
    return out.toDataURL(format,quality);
  };
  function applySize(){
    if(lost)return;
    width=stage.clientWidth;height=stage.clientHeight;if(!width||!height)return;
    qualityCap=Math.min(devicePixelRatio||1,2,Math.sqrt((mobile.matches?650000:1250000)/(width*height)));
    renderer.setPixelRatio(qualityCap);warmup=performance.now()+2500;badWindows=goodWindows=0;refreshInterval=Infinity;
    renderer.setSize(width,height,false);stage.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);
    frameTea(camera,bounds,width/height);pendingResize=false;sizeReady=true;
  }
  function resize(){
    if(lost)return;
    if(stage.clientWidth===width&&stage.clientHeight===height&&!pendingResize)return;
    pendingResize=true;applySize();schedule();
  }
  // Do not reveal an untextured cup. Decode branding before the first visible frame.
  try {
    const logo = new Image();
    await new Promise((resolve,reject)=>{logo.onload=resolve;logo.onerror=reject;logo.src='./assets/cup-label.svg?v=18';});
    const label=document.createElement('canvas');label.width=1024;label.height=1024;
    const context=label.getContext('2d');
    context.drawImage(logo,0,0,1024,1024);
    const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    sleeveMaterial.map=texture;sleeveMaterial.opacity=1;sleeveMaterial.needsUpdate=true;
  } catch { sleeveMaterial.opacity=0; }

  // Milk has a seamless procedural albedo; lighting belongs to the 3D scene.
  resize();
  const observer=new ResizeObserver(resize);observer.observe(stage);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.02});intersection.observe(stage);
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('mava:modal',e=>{blocked=e.detail;sync();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;if(paused)target=turn;sync();});
  mobile.addEventListener('change',()=>{renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));resize();sync();});
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();lost=true;cancelAnimationFrame(frame);
    canvas.hidden=true;controls.hidden=true;stage.dataset.ready='false';window.mavaTeaFallback?.();
  });
  canvas.addEventListener('webglcontextrestored',()=>{
    try {
      if(environment){environment.dispose();environment=studioEnvironment();scene.environment=environment.texture;}
      lost=false;window.mavaStopPoster?.();resize();fallback.hidden=true;canvas.hidden=false;controls.hidden=false;stage.dataset.ready='true';sync();
    } catch {lost=true;}
  });
  toggle.addEventListener('click',()=>{if(lost)return;paused=!paused;if(paused)target=turn;sync();});
  function rotate(amount){if(lost)return;target+=amount;schedule();}
  document.querySelector('#tea-left').addEventListener('click',()=>rotate(-.32));
  document.querySelector('#tea-right').addEventListener('click',()=>rotate(.32));
  canvas.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();rotate(event.key==='ArrowLeft'?-.2:.2);}
  });
  canvas.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    dragging=true;target=turn;pointer=event.pointerId;lastX=event.clientX;canvas.setPointerCapture(pointer);schedule();
  });
  canvas.addEventListener('pointermove',event=>{
    if(dragging&&event.pointerId===pointer){rotate((event.clientX-lastX)*(Math.PI*2/Math.max(480,width*1.6)));lastX=event.clientX;}
  });
  const end=()=>{dragging=false;pointer=null;schedule();};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
  // Show the canvas only after the first successful render; retain the photo otherwise.
  draw();window.mavaStopPoster?.();canvas.hidden=false;fallback.hidden=true;controls.hidden=false;stage.dataset.ready='true';stage.dataset.state='ready';stage.dataset.mode='webgl';stage.dataset.build='20';stage.setAttribute('aria-busy','false');document.querySelector('#tea-loader').hidden=true;sync();
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);});
  window.addEventListener('pageshow',sync);
}

if(canvas&&stage&&fallback&&controls&&toggle)boot().catch(error=>{
  stage.dataset.error=String(error?.message||error);console.error('MAVA 3D:',error);
  if(renderer)renderer.dispose();canvas.hidden=true;controls.hidden=true;window.mavaTeaFallback?.();
});
