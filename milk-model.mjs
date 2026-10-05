import * as THREE from './vendor/three.module.js';

// Reference proportions. The syrup is pigment only, never baked-in lighting.
const TAU = Math.PI * 2;
const bottom = -1.50, shoulder = 1.28, liquidLevel = 1.245;
export const cupRadius = y => .613 + THREE.MathUtils.clamp((y - bottom) / (shoulder - bottom), 0, 1) * .239;
const smooth = (a,b,n) => {const t=THREE.MathUtils.clamp((n-a)/(b-a),0,1);return t*t*(3-2*t);};
function noise(x,y,period) {
 const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy;
 const hash=(a,b)=>{a=((a%period)+period)%period;let n=Math.imul(a+71,374761393)^Math.imul(b+127,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 const sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),sx),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);
}
async function brownSugarTexture() {
 const tex=await new THREE.TextureLoader().loadAsync('./assets/tea-albedo-v14.webp?v=14');
 tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=true;tex.wrapS=THREE.RepeatWrapping;
 return tex;
}
export async function createTea() {
 const root=new THREE.Group(),cup=new THREE.Group();root.add(cup);cup.rotation.z=0;
 const mesh=(name,g,m,y=0,parent=cup)=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.y=y;parent.add(o);return o;};
 const lathe=(points,segments=112)=>new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),segments);
 const ring=(name,r,t,y,m,parent=cup)=>{const o=mesh(name,new THREE.TorusGeometry(r,t,10,112),m,y,parent);o.rotation.x=Math.PI/2;return o;};
 const glass=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.095,metalness:0,transparent:true,opacity:.16,side:THREE.FrontSide,depthWrite:false,clearcoat:1,clearcoatRoughness:.09,envMapIntensity:.72});
 const rim=new THREE.MeshPhysicalMaterial({color:'#f1efdf',roughness:.12,metalness:0,transparent:true,opacity:.26,clearcoat:1,clearcoatRoughness:.12,depthWrite:false,envMapIntensity:.55});
 const syrup=new THREE.MeshPhysicalMaterial({color:'#180b05',roughness:.42,clearcoat:.28,clearcoatRoughness:.3,envMapIntensity:.18});
 // The closed liquid envelope carries the syrup; no second overlapping shell.
 const dummy=new THREE.Object3D();
 const milk=new THREE.MeshPhysicalMaterial({color:'#ffffff',map:await brownSugarTexture(),roughness:.30,clearcoat:.30,clearcoatRoughness:.28,envMapIntensity:.24,transparent:false,depthWrite:true});
 const milkGeometry=lathe([[0,bottom+.035],[cupRadius(bottom+.035)-.012,bottom+.035],[cupRadius(bottom+.10)-.012,bottom+.10],[cupRadius(-1.15)-.023,-1.15],[cupRadius(.2)-.020,.2],[cupRadius(liquidLevel)-.016,liquidLevel]]);
 const position=milkGeometry.attributes.position,uv=milkGeometry.attributes.uv;
 for(let i=0;i<position.count;i++)uv.setY(i,(position.getY(i)-bottom)/(liquidLevel-bottom));
 const body=mesh('Creamy tea with caramel marbling',milkGeometry,milk);body.renderOrder=1;
 const milkTop=new THREE.MeshStandardMaterial({color:'#ead2ab',roughness:.45,envMapIntensity:.4});
 const surface=mesh('Liquid surface',new THREE.CircleGeometry(cupRadius(liquidLevel)-.016,112),milkTop,liquidLevel);surface.rotation.x=-Math.PI/2;
 const wall=mesh('Transparent tapered PET cup',lathe([[.582,bottom],[.613,bottom+.04],[.852,shoulder],[.858,shoulder+.025]]),glass);wall.renderOrder=5;
 ring('Clear cup base',.606,.013,bottom+.035,rim).renderOrder=6;
 ring('Cup base inner molding',.586,.005,bottom+.008,rim).renderOrder=6;
 // Ice remains under the lid and intersects the liquid, even while rising.
 const iceMaterial=new THREE.MeshPhysicalMaterial({color:'#e9f2ed',transparent:true,opacity:.46,transmission:0,thickness:.10,ior:1.31,roughness:.12,metalness:0,clearcoat:1,clearcoatRoughness:.08,depthWrite:false,envMapIntensity:.6});
 const shape=new THREE.Shape();shape.moveTo(-.115,-.105);shape.lineTo(.095,-.12);shape.lineTo(.14,.06);shape.lineTo(.075,.115);shape.lineTo(-.105,.11);shape.lineTo(-.13,-.03);shape.closePath();
 const iceGeometry=new THREE.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.022,bevelThickness:.025,curveSegments:2});iceGeometry.center();
 const ice=new THREE.InstancedMesh(iceGeometry,iceMaterial,10);ice.name='Ice within the tea';ice.frustumCulled=false;ice.renderOrder=2;ice.instanceMatrix.setUsage(THREE.DynamicDrawUsage);cup.add(ice);
 const iceStates=[];
 function updateIce(seconds) {
  const rise=-.022*Math.exp(-Math.max(0,seconds)*1.4);
  for(let i=0;i<ice.count;i++) {
   const a=i*2.399,r=i<3?.23:.55,p=seconds*.65+i*1.73;
   dummy.position.set(Math.cos(a)*r,liquidLevel-.105+rise+Math.sin(p)*.003,Math.sin(a)*r);
   dummy.rotation.set(i*.27+Math.sin(p)*.012,i*.78,i*.41+Math.cos(p)*.014);dummy.scale.set(1+(i%3)*.04,.9,1);dummy.updateMatrix();ice.setMatrixAt(i,dummy.matrix);iceStates[i]={y:dummy.position.y,r};
  }
  ice.instanceMatrix.needsUpdate=true;
 }
 updateIce(10);
 // Clean, shallow molded lid with a sealed spout and attached flexible tether.
 const lid=new THREE.Group();lid.name='Clean clear sip lid';cup.add(lid);
 const lidMaterial=new THREE.MeshPhysicalMaterial({color:'#f4f5eb',roughness:.095,metalness:0,transparent:true,opacity:.18,side:THREE.FrontSide,depthWrite:false,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:.55});
 const dome=mesh('Smooth shallow lid',lathe([[.874,1.335],[.837,1.345],[.815,1.38],[.802,1.48],[.785,1.51],[.69,1.52],[.50,1.49],[.27,1.475],[0,1.475]]),lidMaterial,0,lid);dome.renderOrder=7;
 const flange=mesh('Molded snap-on flange',lathe([[.848,1.263],[.889,1.263],[.911,1.279],[.912,1.310],[.894,1.335],[.868,1.34]]),rim,0,lid);flange.renderOrder=7;
 for(const [y,r,t] of [[1.268,.899,.009],[1.313,.897,.013],[1.345,.862,.008]])ring('Fine lid seam',r,t,y,rim,lid).renderOrder=8;
 const port=new THREE.Group();port.name='Closed drinking spout';port.position.set(.41,0,-.37);lid.add(port);
 const spout=mesh('Raised sipping collar',lathe([[.162,1.493],[.17,1.515],[.172,1.625],[.161,1.646],[.139,1.646],[.139,1.51]]),lidMaterial,0,port);spout.scale.z=.70;spout.renderOrder=8;
 const plug=mesh('Clean transparent stopper',new THREE.CylinderGeometry(.17,.17,.016,64),rim,1.647,port);plug.scale.z=.70;plug.renderOrder=8;
 const lip=ring('Stopper rim',.164,.008,1.66,rim,port);lip.scale.y=.7;lip.renderOrder=8;
 const tetherCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(.14,1.65,0),new THREE.Vector3(.27,1.61,0),new THREE.Vector3(.34,1.49,0),new THREE.Vector3(.33,1.365,0),new THREE.Vector3(.20,1.32,0)]);
 const tether=mesh('Attached flexible stopper tether',new THREE.TubeGeometry(tetherCurve,28,.014,8,false),rim,0,port);tether.scale.z=.6;tether.renderOrder=8;
 const dropMaterial=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.12,metalness:0,transparent:true,opacity:.14,clearcoat:1,envMapIntensity:.6,depthWrite:false});
 const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),dropMaterial,54);drops.name='Fine surface condensation';drops.renderOrder=6;
 for(let i=0;i<54;i++){const a=i*2.39996,y=-1.28+((i*37)%53)/53*2.43,r=cupRadius(y)+.006,size=.004+(i%5)*.0012;dummy.position.set(Math.sin(a)*r,y,Math.cos(a)*r);dummy.scale.set(size,size*1.5,size*.55);dummy.rotation.set(0,a,0);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);}cup.add(drops);
 const sleeveMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,side:THREE.FrontSide,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});
 const labelHeight=1.30,labelY=-.10;
 const labelGeometry=new THREE.CylinderGeometry(cupRadius(labelY+labelHeight/2)+.004,cupRadius(labelY-labelHeight/2)+.004,labelHeight,80,1,true,-.88,1.76);
 const label=mesh('MAVA printed front branding',labelGeometry,sleeveMaterial,labelY);label.renderOrder=9;
 return {root,sleeveMaterial,milkMaterial:milk,updateIce,liquidLevel,iceStates};
}
