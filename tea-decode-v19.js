'use strict';
// Prepare pixels once, away from the UI thread. No model or texture changes.
self.onmessage=async()=>{
 try{
  const load=async url=>{const response=await fetch(url);if(!response.ok)throw new Error('Tea asset: '+response.status);return createImageBitmap(await response.blob());};
  const [atlas,motion]=await Promise.all([load('./assets/tea-turntable-v16.webp?v=18'),load('./assets/tea-motion-v19.png')]);
  const W=420,H=560,N=96,canvas=new OffscreenCanvas(W,H),context=canvas.getContext('2d',{willReadFrequently:true});
  const frames=new Uint8ClampedArray(W*H*4*N);
  for(let index=0;index<N;index++){
   context.clearRect(0,0,W,H);context.drawImage(atlas,index%16*W,Math.floor(index/16)*H,W,H,0,0,W,H);
   const pixels=context.getImageData(0,0,W,H).data;
   for(let p=0;p<pixels.length;p+=4){const opacity=pixels[p+3];if(opacity>0&&opacity<255){const alpha=opacity/255;pixels[p]*=alpha;pixels[p+1]*=alpha;pixels[p+2]*=alpha;}}
   frames.set(pixels,index*W*H*4);
  }
  atlas.close();canvas.width=motion.width;canvas.height=motion.height;context.drawImage(motion,0,0);
  const vectors=context.getImageData(0,0,canvas.width,canvas.height).data;motion.close();canvas.width=canvas.height=1;
  self.postMessage({frames:frames.buffer,vectors:vectors.buffer},[frames.buffer,vectors.buffer]);self.close();
 }catch(error){self.postMessage({error:String(error?.message||error)});self.close();}
};
