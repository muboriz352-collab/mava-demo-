import * as THREE from './vendor/three.module.js';

// The original geometry and albedo stay intact. Fixed studio lighting is sampled
// from a small lookup instead of evaluating the full physical shader every frame.
export async function prepareTeaLighting(root) {
 const atlas=await new THREE.TextureLoader().loadAsync('./assets/tea-lighting-v17.png');
 atlas.colorSpace=THREE.NoColorSpace;atlas.generateMipmaps=false;
 atlas.minFilter=THREE.LinearFilter;atlas.magFilter=THREE.LinearFilter;
 const materials=[];
 root.traverse(o=>{if(o.isMesh&&(o.material.isMeshPhysicalMaterial||o.material.isMeshStandardMaterial)&&!materials.includes(o.material))materials.push(o.material);});
 const count=materials.length,replacements=new Map();
 for(let row=0;row<count;row++){
  const source=materials[row];
  const material=new THREE.MeshMatcapMaterial({color:source.color.clone(),map:source.map,matcap:atlas,transparent:source.transparent,opacity:source.opacity,side:source.side,depthWrite:source.depthWrite,depthTest:source.depthTest});
  material.onBeforeCompile=shader=>{
   shader.uniforms.teaRow={value:row};shader.uniforms.teaRows={value:count};
   const varyings='varying vec3 teaDiffuse;\nvarying vec3 teaSpecular;\n';
   shader.vertexShader=varyings+'uniform float teaRow;\nuniform float teaRows;\nuniform sampler2D matcap;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('vViewPosition = - mvPosition.xyz;',`
    vViewPosition=-mvPosition.xyz;
    vec3 viewDir=normalize(vViewPosition);
    vec3 axisX=normalize(vec3(viewDir.z,0.,-viewDir.x));
    vec3 axisY=cross(viewDir,axisX);
    vec3 surfaceNormal=normalize(transformedNormal);
    vec2 lightUv=vec2(dot(axisX,surfaceNormal),dot(axisY,surfaceNormal))*.495+.5;
    vec2 safeUv=clamp(lightUv,vec2(.5/256.),vec2(1.-.5/256.));
    float rowY=(teaRows-1.-teaRow+safeUv.y)/teaRows;
    teaDiffuse=texture2D(matcap,vec2(safeUv.x*.5,rowY)).rgb*4.;
    teaSpecular=texture2D(matcap,vec2(.5+safeUv.x*.5,rowY)).rgb*4.;`);
   shader.fragmentShader=varyings+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;', 'vec3 outgoingLight=diffuseColor.rgb*teaDiffuse+teaSpecular;');
  };
  material.customProgramCacheKey=()=> 'mava-lighting-v17';
  replacements.set(source,material);
 }
 root.traverse(o=>{if(o.isMesh&&replacements.has(o.material))o.material=replacements.get(o.material);});
 return ()=>{for(const m of replacements.values())m.dispose();atlas.dispose();};
}
