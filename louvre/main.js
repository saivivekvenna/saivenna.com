import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { buildMuseum, rooms, roomById } from './museum.js?v=20261009-vault';
const $=id=>document.getElementById(id),canvas=$('gallery'),touch=matchMedia('(any-pointer: coarse), (max-width: 767px)').matches;
const pixelRatio=Math.min(devicePixelRatio,touch?1:1.35);
let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});}catch(e){$('load-status').textContent='Please enable WebGL to enter the museum.';throw e;}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(pixelRatio);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
const scene=new THREE.Scene();scene.background=new THREE.Color('#332621');
const pmrem=new THREE.PMREMGenerator(renderer),env=new RoomEnvironment();scene.environment=pmrem.fromScene(env,.05).texture;env.dispose();pmrem.dispose();
const camera=new THREE.PerspectiveCamera(63,innerWidth/innerHeight,.075,165),controls=new PointerLockControls(camera,canvas);controls.pointerSpeed=.55;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI-.12;
const keys=new Set(),movePointers=new Map();
if(touch){document.body.classList.add('touch-ui');document.querySelector('.welcome-controls').innerHTML='hold the arrows to walk · drag to look<br>tap a painting or its label for details';document.querySelector('.menu-help').innerHTML='Hold arrows · Walk<br>Drag · Look<br>Tap · Painting details';}
let walking=false,started=false,ready=false,drag=null,dragged=false,museum;
try{museum=await buildMuseum(scene,renderer,(loaded,total)=>{$('load-status').textContent=`Installing the paintings · ${loaded} / ${total}`;},{mobile:touch});}catch(error){console.error(error);$('load-status').textContent=error.message+'. Reload to retry.';throw error;}
const {catalog,targets}=museum;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ssao=new SSAOPass(scene,camera,innerWidth*pixelRatio,innerHeight*pixelRatio,touch?8:16);ssao.kernelRadius=10;ssao.minDistance=.001;ssao.maxDistance=.08;composer.addPass(ssao);composer.addPass(new OutputPass());const fxaa=new ShaderPass(FXAAShader);fxaa.material.uniforms.resolution.value.set(1/(innerWidth*pixelRatio),1/(innerHeight*pixelRatio));composer.addPass(fxaa);
for(const art of catalog){const button=document.createElement('button');button.dataset.artId=art.id;button.setAttribute('aria-label','View '+art.title+' by '+art.artist);const img=document.createElement('img'),title=document.createElement('strong'),artist=document.createElement('small'),location=document.createElement('span');img.src='./assets/art/'+(touch?'mobile/':'')+art.image;img.alt=art.title;img.loading='lazy';title.textContent=art.title;artist.textContent=art.artist;location.className='work-location';location.textContent=art.position?'ROOM '+art.position.room+' · VIEW IN ROOM':'ELSEWHERE IN THE LOUVRE · DETAILS';button.append(img,title,artist,location);button.onclick=()=>walkTo(art);$('collection-grid').append(button);}
$('collection-open').querySelector('span').textContent=String(catalog.length);ready=true;$('enter').disabled=false;$('enter').innerHTML='enter gallery <span>↗</span>';$('load-status').textContent='Four connected rooms. Explore at your own pace.';document.body.dataset.artLoaded=String(museum.artworks.length);document.body.dataset.catalogCount=String(catalog.length);
function resetView(){const s=museum.spawn;camera.position.set(s.x,1.67,s.z);camera.lookAt(s.lookX,2.9,s.lookZ);keys.clear();}resetView();
function anyDialog(){return [...document.querySelectorAll('dialog')].some(d=>d.open);}
function setWalking(value){
 walking=value;keys.clear();movePointers.clear();for(const b of document.querySelectorAll('[data-move]')){b.classList.remove('pressed');b.setAttribute('aria-pressed','false');}document.body.classList.toggle('is-walking',value);
 $('welcome').hidden=value||anyDialog();$('reticle').hidden=!value||!controls.isLocked;$('touch-controls').hidden=!value||!touch;
 if(started){document.body.classList.add('has-started');$('welcome').querySelector('h1').textContent='Paused.';$('enter').textContent='Continue';}
}
function enter(){if(!ready)return;started=true;setWalking(true);if(!touch)controls.lock();}
$('enter').onclick=enter;controls.addEventListener('lock',()=>setWalking(true));controls.addEventListener('unlock',()=>{setWalking(false);if(started&&!anyDialog())openDialog('menu-dialog');});document.addEventListener('pointerlockerror',()=>{if(!anyDialog())setWalking(true);});$('reset').onclick=()=>{resetView();updatePosition();$('menu-dialog').close();enter();};
function openDialog(id){if(id!=='menu-dialog'&&$('menu-dialog').open)$('menu-dialog').close();$(id).showModal();$(id).scrollTop=0;controls.unlock();setWalking(false);$('welcome').hidden=true;}
let zoom=1;
function setZoom(value){zoom=THREE.MathUtils.clamp(value,1,3);$('detail-image').style.transform=`scale(${zoom})`;}
function inspect(art){if(!art)return;$('detail-image').src='./assets/art/'+art.image;$('detail-image').alt=art.title+' by '+art.artist;$('detail-title').textContent=art.title;$('detail-artist').textContent=art.artist;$('detail-year').textContent=art.year;$('detail-description').textContent=art.description;$('detail-location').textContent=art.position?'Room '+art.position.room+' · '+roomById[art.position.room].name:(art.actual_louvre_location||'See museum record');$('detail-size').textContent=`${Math.round(art.width_m*100)} × ${Math.round(art.height_m*100)} cm`;$('detail-credit').textContent=art.credit+'. '+art.rights+' '+(art.display_note||'')+' '+(art.placement?.evidence||'This work is in another Louvre room, outside the reconstructed wing.');$('detail-source').href=art.source_url;setZoom(1);openDialog('art-dialog');}
$('zoom-in').onclick=()=>setZoom(zoom+.3);$('zoom-out').onclick=()=>setZoom(zoom-.3);$('zoom-reset').onclick=()=>setZoom(1);$('art-close').onclick=()=>{$('art-dialog').close();if(started)enter();};$('return-gallery').onclick=()=>{$('art-dialog').close();enter();};
for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{if(!anyDialog()){setWalking(started);if(!started)$('enter').focus();}});
$('menu-open').onclick=()=>{updatePosition();openDialog('menu-dialog');};$('menu-close').onclick=()=>{$('menu-dialog').close();if(started)enter();};

$('map-open').onclick=()=>{updatePosition();openDialog('map-dialog');};$('map-close').onclick=()=>{$('map-dialog').close();if(started)enter();};
for(const room of rooms){
 const ns='http://www.w3.org/2000/svg',rect=document.createElementNS(ns,'rect'),text=document.createElementNS(ns,'text');rect.setAttribute('x',room.x-room.w/2);rect.setAttribute('y',room.z-room.d/2);rect.setAttribute('width',room.w);rect.setAttribute('height',room.d);rect.dataset.room=room.id;text.setAttribute('x',room.x);text.setAttribute('y',room.z+1);text.textContent=room.id;$('map-rooms').append(rect,text);
 const button=document.createElement('button');button.innerHTML='<strong>'+room.id+'</strong>'+room.name;button.onclick=()=>{let x=room.x,z=room.z;if(room.id==='711'){z=room.z+5;x=0;}else if(room.id==='702'||room.id==='700'){x=room.x+room.w/2-4;z=room.z+1.5;}camera.position.set(x,1.67,z);if(room.id==='711')camera.lookAt(room.x,2,room.z-room.d/2+5.7);else camera.lookAt(room.x-10,2.7,room.z);$('map-dialog').close();updatePosition();enter();};$('room-shortcuts').append(button);
}
$('collection-open').onclick=()=>openDialog('collection-dialog');$('collection-close').onclick=()=>{$('collection-dialog').close();if(started)enter();};$('about-open').onclick=()=>openDialog('about-dialog');$('about-close').onclick=()=>{$('about-dialog').close();if(started)enter();};
function walkTo(art){
 if(!art.position){$('collection-dialog').close();inspect(art);return;}
 const p=art.position;camera.position.set(p.viewX??p.x+p.normal.x*p.distance,1.67,p.viewZ??p.z+p.normal.z*p.distance);camera.lookAt(p.x,p.lookY??Math.min(p.y,3.4),p.z);$('collection-dialog').close();updatePosition();enter();
}
const raycaster=new THREE.Raycaster();raycaster.far=14;
function pick(pointer=new THREE.Vector2()){raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(targets,false)[0]?.object.userData.art||null;}
canvas.addEventListener('click',e=>{if(!walking||dragged)return;const a=controls.isLocked?pick():pick(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2));if(a)inspect(a);});
canvas.addEventListener('pointerdown',e=>{dragged=false;if(walking&&!controls.isLocked&&!drag){drag={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);}});canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>2)dragged=true;const angles=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');angles.y-=dx*.0035;angles.x=THREE.MathUtils.clamp(angles.x-dy*.0035,-1.4,1.4);camera.quaternion.setFromEuler(angles);drag.x=e.clientX;drag.y=e.clientY;});for(const evt of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(evt,e=>{if(drag?.id===e.pointerId)drag=null;});
addEventListener('keydown',e=>{if(anyDialog())return;if(e.code==='KeyM'){e.preventDefault();$('map-open').click();return;}if(e.code==='KeyG'){e.preventDefault();$('collection-open').click();return;}if(e.code==='Escape'&&walking&&!controls.isLocked){e.preventDefault();openDialog('menu-dialog');return;}if(!walking)return;if(['KeyW','KeyA','KeyS','KeyD','KeyE','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyE')inspect(pick());});addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();if(walking){controls.unlock();setWalking(false);}});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();controls.unlock();setWalking(false);}});
for(const b of document.querySelectorAll('[data-move]')){
 b.setAttribute('aria-pressed','false');
 b.addEventListener('contextmenu',e=>e.preventDefault());
 b.addEventListener('pointerdown',e=>{if(!walking)return;e.preventDefault();e.stopPropagation();movePointers.set(e.pointerId,b.dataset.move);keys.add(b.dataset.move);b.classList.add('pressed');b.setAttribute('aria-pressed','true');b.setPointerCapture(e.pointerId);});
 for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,e=>{movePointers.delete(e.pointerId);if(![...movePointers.values()].includes(b.dataset.move)){keys.delete(b.dataset.move);b.classList.remove('pressed');b.setAttribute('aria-pressed','false');}});
}
canvas.addEventListener('contextmenu',e=>{if(touch)e.preventDefault();});
function canStand(x,z){return museum.canStand(x,z);}
function updatePosition(){
 const room=museum.currentRoom(camera.position.x,camera.position.z);
 document.body.dataset.visitorPosition=JSON.stringify([camera.position.x,camera.position.z].map(v=>Number(v.toFixed(2))));document.body.dataset.currentRoom=room?.id||'between-rooms';
 if(room)$('room-location').innerHTML='LEVEL 1 · ROOM '+room.id+' <span>'+room.name+'</span>';
 const dot=$('map-visitor');if(dot){dot.setAttribute('cx',camera.position.x);dot.setAttribute('cy',camera.position.z);}
}
const forward=new THREE.Vector3(),right=new THREE.Vector3(),move=new THREE.Vector3();let previous=performance.now(),frame=0,statsTime=performance.now(),statsFrames=0,demo=null,needsRender=true;
renderer.setAnimationLoop(now=>{const dt=Math.min((now-previous)/1000,.05);previous=now;if(walking){const angles=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');if(keys.has('ArrowLeft'))angles.y+=dt*1.2;if(keys.has('ArrowRight'))angles.y-=dt*1.2;if(keys.has('ArrowUp'))angles.x+=dt;if(keys.has('ArrowDown'))angles.x-=dt;angles.x=THREE.MathUtils.clamp(angles.x,-1.4,1.4);camera.quaternion.setFromEuler(angles);camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,camera.up).normalize();move.set(0,0,0);if(keys.has('KeyW'))move.add(forward);if(keys.has('KeyS'))move.sub(forward);if(keys.has('KeyD'))move.add(right);if(keys.has('KeyA'))move.sub(right);if(move.lengthSq()){move.normalize().multiplyScalar(dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?3.8:2.35));if(canStand(camera.position.x+move.x,camera.position.z))camera.position.x+=move.x;if(canStand(camera.position.x,camera.position.z+move.z))camera.position.z+=move.z;}if(frame%8===0)updatePosition();}
 frame++;demo?.update(now);if(walking||demo||needsRender){composer.render();demo?.capture();statsFrames++;needsRender=false;}if(now-statsTime>1500){document.body.dataset.renderFps=String(Math.round(statsFrames*1000/(now-statsTime)));document.body.dataset.drawCalls=String(renderer.info.render.calls);statsTime=now;statsFrames=0;}});
addEventListener('resize',()=>{needsRender=true;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);fxaa.material.uniforms.resolution.value.set(1/(innerWidth*pixelRatio),1/(innerHeight*pixelRatio));});updatePosition();document.body.dataset.galleryReady='true';

if(new URLSearchParams(location.search).has('demo')){const {installDemo}=await import('./demo.js');demo=installDemo({camera,canvas,roomById,pause:()=>{controls.unlock();setWalking(false);for(const d of document.querySelectorAll('dialog'))if(d.open)d.close();},reset:resetView});}
