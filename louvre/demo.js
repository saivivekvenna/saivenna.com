import * as THREE from 'three';

// Local demo mode records the actual WebGL scene. The regular museum UI is unchanged.
export function installDemo({camera,canvas,roomById,pause,reset}){
 const output=document.createElement('canvas');output.width=1600;output.height=900;const ctx=output.getContext('2d',{alpha:false});
 const button=document.createElement('button');button.id='demo-record';button.textContent='Record walkthrough';button.style.cssText='position:fixed;z-index:20;right:18px;bottom:18px;background:#fbfaf5;color:#252825;border:0;border-radius:5px;padding:13px 18px;font:12px sans-serif;cursor:pointer';document.body.append(button);
 let recorder=null,chunks=[],started=0,recording=false,finished=false,url=null;
 const daru=roomById['702'],mollien=roomById['700'],states=roomById['711'];
 const coronation=[daru.x-3.5,4.42,daru.z-daru.d/2+.4],mona=[states.x,1.76,states.z-states.d/2+6.18],cana=[states.x,4.75,states.z+states.d/2-.4],liberty=[mollien.x+9.9,2.8,mollien.z-mollien.d/2+.4];
 const shots=[
  {duration:7,from:[daru.x+daru.w/2-4.5,1.67,5.8],to:[daru.x+8,1.67,5.8],lookFrom:[daru.x-10,3,-1],lookTo:[daru.x-10,3,-2]},
  {duration:7,from:[coronation[0]+1.1,1.67,5.3],to:[coronation[0]-.6,1.67,-.1],lookFrom:coronation,lookTo:coronation},
  {duration:10,from:[states.x+2.3,1.67,states.z+5],to:[states.x+.5,1.67,mona[2]+4.2],lookFrom:[mona[0],2.2,mona[2]],lookTo:mona},
  {duration:8,from:[states.x-2.2,1.67,states.z-3],to:[states.x-.5,1.67,states.z+10],lookFrom:[cana[0],3.6,cana[2]],lookTo:cana},
  {duration:7,from:[mollien.x+mollien.w/2-4,1.67,5.8],to:[mollien.x+7,1.67,5.8],lookFrom:[mollien.x-14,3.2,mollien.z],lookTo:[mollien.x-14,3.2,mollien.z]},
  {duration:6,from:[liberty[0]+.5,1.67,2.2],to:[liberty[0]-.2,1.67,-.6],lookFrom:liberty,lookTo:liberty}
 ];
 const total=shots.reduce((sum,s)=>sum+s.duration,0),point=new THREE.Vector3();
 function pose(time){let remaining=time;for(const shot of shots){if(remaining<=shot.duration){const t=THREE.MathUtils.clamp(remaining/shot.duration,0,1),e=t*t*(3-2*t);camera.position.fromArray(shot.from).lerp(new THREE.Vector3(...shot.to),e);point.fromArray(shot.lookFrom).lerp(new THREE.Vector3(...shot.lookTo),e);camera.lookAt(point);return Math.min(1,remaining/.65,(shot.duration-remaining)/.65);}remaining-=shot.duration;}return 0;}
 function download(){const a=document.createElement('a');a.href=url;a.download='louvre-walkthrough.webm';a.click();}
 button.onclick=()=>{
  if(finished){download();return;}if(recording)return;
  pause();document.querySelector('header').hidden=true;document.querySelector('#welcome').hidden=true;document.querySelector('#reticle').hidden=true;document.querySelector('#touch-controls').hidden=true;
  document.body.dataset.demoRecording='true';button.disabled=true;button.textContent='Recording · 45 seconds';
  const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  recorder=new MediaRecorder(output.captureStream(30),{mimeType:type,videoBitsPerSecond:10000000});chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType});url=URL.createObjectURL(blob);finished=true;button.disabled=false;button.textContent='Download walkthrough';document.body.dataset.demoRecording='finished';document.body.dataset.demoVideoBytes=String(blob.size);download();};
  started=performance.now();recording=true;recorder.start(1000);
 };
 let fade=0;
 return {
  update(now){if(!recording)return;const t=(now-started)/1000;if(t<total){fade=pose(t);button.textContent='Recording · '+Math.ceil(total-t)+'s';}else{fade=0;if(t>total+.4){recording=false;recorder.stop();}}},
  capture(){if(!recording)return;ctx.fillStyle='#111411';ctx.fillRect(0,0,output.width,output.height);const aspect=canvas.width/canvas.height,targetAspect=output.width/output.height;let sx=0,sy=0,sw=canvas.width,sh=canvas.height;if(aspect>targetAspect){sw=canvas.height*targetAspect;sx=(canvas.width-sw)/2;}else{sh=canvas.width/targetAspect;sy=(canvas.height-sh)/2;}ctx.drawImage(canvas,sx,sy,sw,sh,0,0,output.width,output.height);if(fade<1){ctx.fillStyle='rgba(13,16,13,'+(1-fade)+')';ctx.fillRect(0,0,output.width,output.height);}}
 };
}
