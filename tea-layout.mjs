import * as THREE from './vendor/three.module.js';

export function rotationBounds(root) {
  const bounds=new THREE.Box3(),original=root.rotation.y;
  for(let i=0;i<48;i++) {
    root.rotation.y=i/48*Math.PI*2;root.updateMatrixWorld(true);
    bounds.union(new THREE.Box3().setFromObject(root));
  }
  root.rotation.y=original;root.updateMatrixWorld(true);
  bounds.expandByScalar(.04);
  return bounds;
}

// Fit every corner of the full rotation envelope, rather than using a fixed zoom.
export function frameTea(camera,bounds,aspect) {
  camera.aspect=aspect;camera.updateProjectionMatrix();
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  let distance=Math.max(size.y/(2*tangent),size.x/(2*tangent*aspect));
  const corners=[];
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z));
  for(let i=0;i<80;i++) {
    camera.position.set(center.x,center.y+distance*.075,center.z+distance);
    camera.lookAt(center);camera.updateMatrixWorld(true);
    if(corners.every(corner=>{const p=corner.clone().project(camera);return Math.abs(p.x)<=.90&&Math.abs(p.y)<=.91;}))return;
    distance*=1.025;
  }
}
