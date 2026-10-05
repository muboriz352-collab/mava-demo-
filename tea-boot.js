if(location.protocol!=='file:'){
import('./tea-engine-v20.js').catch(error=>{const stage=document.querySelector('#tea-stage');if(stage)stage.dataset.error=String(error.message||error);console.error('MAVA 3D module:',error);window.mavaTeaFallback?.();});

}
