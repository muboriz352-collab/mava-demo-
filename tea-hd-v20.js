'use strict';
// Native HD views of the existing model. Work stays outside the UI thread.
let wasm,memory,pixels,fields,rows,motion,output,ctx,canvas;
let W,H,SIZE,FLOW,OUT,ROWS,scale,motionIndex=-1;
const N=96,GW=106,GH=141;
const blob=async url=>{const r=await fetch(url);if(!r.ok)throw new Error('Tea HD asset: '+r.status);return r.blob();};
async function init(options){
 scale=options.scale;W=Math.round(292*scale);H=Math.round(452*scale);SIZE=W*H*4;
 const bytes=await (await fetch('./tea-hd-v20.wasm')).arrayBuffer();wasm=(await WebAssembly.instantiate(bytes)).instance.exports;
 FLOW=SIZE*N;OUT=FLOW+SIZE*4;ROWS=OUT+SIZE;
 wasm.memory.grow(Math.ceil((ROWS+H*8)/65536)-1);memory=wasm.memory.buffer;pixels=new Uint8ClampedArray(memory);
 fields=Array.from({length:4},(_,i)=>new Float32Array(memory,FLOW+i*SIZE,W*H));rows=new Uint32Array(memory,ROWS,H*2);
 for(let y=0;y<H;y++){
  const yy=72+y/scale,lo=Math.min(559,Math.floor(yy)),hi=Math.min(559,lo+1),sp=options.spans;
  const start=Math.min(sp[lo*2]||420,sp[hi*2]||420),end=Math.max(sp[lo*2+1],sp[hi*2+1]);
  rows[y*2]=end?Math.max(0,Math.floor((start-64)*scale)-2):0;rows[y*2+1]=end?Math.min(W,Math.ceil((end-64)*scale)+2):0;
 }
 const assets=await Promise.all(Array.from({length:12},(_,i)=>blob('./assets/tea-hd-v20/hd-'+String(i).padStart(2,'0')+'.webp')));
 const scratch=new OffscreenCanvas(W,H),read=scratch.getContext('2d',{willReadFrequently:true});read.imageSmoothingQuality='high';
 // Decode one small sheet at a time, rather than one giant full atlas.
 for(let sheet=0;sheet<12;sheet++){
  const image=await createImageBitmap(assets[sheet]);assets[sheet]=null;
  for(let i=0;i<8;i++){
   read.clearRect(0,0,W,H);read.drawImage(image,(i%4)*584,Math.floor(i/4)*904,584,904,0,0,W,H);
   const frame=read.getImageData(0,0,W,H).data;
   for(let p=0;p<frame.length;p+=4){const a=frame[p+3];if(a>0&&a<255){const v=a/255;frame[p]*=v;frame[p+1]*=v;frame[p+2]*=v;}}
   pixels.set(frame,(sheet*8+i)*SIZE);
  }image.close();
 }
 const vectors=await createImageBitmap(await blob('./assets/tea-motion-v19.png'));
 scratch.width=vectors.width;scratch.height=vectors.height;read.drawImage(vectors,0,0);motion=read.getImageData(0,0,scratch.width,scratch.height).data;vectors.close();scratch.width=scratch.height=1;
 canvas=new OffscreenCanvas(W,H);ctx=canvas.getContext('2d');output=new ImageData(new Uint8ClampedArray(memory,OUT,SIZE),W,H);render(options.position,true);
}
function prepare(index){
 if(index===motionIndex)return;
 const stride=GW*2*16,baseX=index%16*GW*2,baseY=Math.floor(index/16)*GH,step=4*scale;
 for(let y=0;y<H;y++){
  const gy=(72+y/scale)/4,iy=Math.floor(gy),fy=gy-iy;
  for(let x=Math.floor(rows[y*2]/step)*step;x<rows[y*2+1];x+=step){
   const ix=16+x/step,xy=y*W+x;
   for(let direction=0;direction<2;direction++){
    const p=((baseY+iy)*stride+baseX+ix+direction*GW)*4,q=p+stride*4;
    for(let c=0;c<2;c++){
     const left=motion[p+c]+(motion[q+c]-motion[p+c])*fy,right=motion[p+4+c]+(motion[q+4+c]-motion[p+4+c])*fy;
     const first=(left-128)*scale/8,delta=(right-left)/32,field=fields[direction*2+c];
     for(let k=0;k<step;k++)field[xy+k]=first+k*delta;
    }
   }
  }
 }motionIndex=index;
}
function render(position,ready=false){
 const started=performance.now(),base=Math.floor(position),index=((base%N)+N)%N,t=position-base;
 prepare(index);wasm.render(index*SIZE,((index+1)%N)*SIZE,FLOW,OUT,ROWS,W,H,t);ctx.putImageData(output,0,0);
 const image=canvas.transferToImageBitmap();self.postMessage({type:ready?'ready':'frame',image,position,scale,renderMs:performance.now()-started},[image]);
}
self.onmessage=async({data})=>{try{if(data.type==='init')await init(data);else if(data.type==='render'&&wasm)render(data.position);}catch(e){self.postMessage({type:'error',message:String(e?.message||e)});}};
