import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

// Footprints and adjacency follow the Louvre's public first-floor SVG.
// Scale is estimated from the museum's published 698 m² for room 711.
const scale=.67;
function room(id,x,z,w,d,name,color){return {id,x:(x+w/2-533.25)*scale,z:(z+d/2-350)*scale,w:w*scale,d:d*scale,name,color};}
export const rooms=[
 room('700',442.02,342.81,77.28,22.92,'Salle Mollien','#78372f'),
 room('701',519.19,333.92,28.14,30.67,'Salon Denon','#756257'),
 room('702',547.22,341.24,72.70,24.85,'Salle Daru','#813b32'),
 room('711',518.87,364.29,28.35,56.27,'Salle des États','#273e4e')
];
export const roomById=Object.fromEntries(rooms.map(r=>[r.id,r]));
export const placements={
 'coronation':{room:'702',wall:'north',u:-3.5,y:4.42,evidence:'Photographed wall arrangement, 2016; current room confirmed'},
 'sabines':{room:'702',wall:'north',u:10.8,y:3.25,evidence:'Photographed wall arrangement, 2016; current room confirmed'},
 'oath-horatii':{room:'702',wall:'south',u:10.8,y:2.94,evidence:'Opposite long wall in 2016 photograph; current room confirmed'},
 'grande-odalisque':{room:'702',wall:'south',u:-6.5,y:1.94,evidence:'Room confirmed; wall position approximate'},
 'recamier':{room:'702',wall:'south',u:18.2,y:2.10,evidence:'Room confirmed; wall position approximate'},
 'atala':{room:'702',wall:'south',u:-13.3,y:2.2,evidence:'Room confirmed; wall position approximate'},
 'raft-medusa':{room:'700',wall:'south',u:10.7,y:3.65,evidence:'Room confirmed; position informed by gallery photographs'},
 'liberty':{room:'700',wall:'north',u:9.9,y:2.8,evidence:'Room confirmed; wall position approximate'},
 'sardanapalus':{room:'700',wall:'north',u:-1.6,y:3.23,evidence:'Room confirmed; wall position approximate'},
 'jaffa':{room:'700',wall:'north',u:-15.4,y:3.85,evidence:'Room confirmed; position informed by gallery photographs'},
 'charging-chasseur':{room:'700',wall:'south',u:-9,y:2.99,evidence:'Room confirmed; wall position approximate'},
 'wounded-cuirassier':{room:'700',wall:'south',u:-15.5,y:3.03,evidence:'Room confirmed; wall position approximate'},
 'mona-lisa':{room:'711',wall:'partition',u:0,y:1.76,evidence:'Documented central display partition, facing The Wedding at Cana'},
 'wedding-cana':{room:'711',wall:'south',u:0,y:4.75,evidence:'Documented opposite the Mona Lisa on the south end wall'},
 'man-with-glove':{room:'711',wall:'east',u:-3,y:1.84,evidence:'Room confirmed; wall position approximate'},
 'emmaus-veronese':{room:'711',wall:'west',u:3,y:2.50,evidence:'Current room confirmed; wall position approximate'},
 'paradise':{room:'711',wall:'west',u:-11,y:4.65,evidence:'Current room confirmed; wall position approximate'},
 'esther':{room:'711',wall:'west',u:-5,y:2.35,evidence:'Current room confirmed; wall position approximate'},
 'crucifixion':{room:'711',wall:'west',u:11.3,y:1.90,evidence:'Current room confirmed; wall position approximate'},
 'susannah':{room:'711',wall:'east',u:4.5,y:2.26,evidence:'Current room confirmed; wall position approximate'},
 'venus-pardo':{room:'711',wall:'partition-back',u:0,y:2.50,evidence:'Current record specifies room 711 vestibule; exact wall approximate'},
 'entombment':{room:'711',wall:'north',u:-4,y:2.15,evidence:'Current record specifies room 711 vestibule; exact wall approximate'},
 'madonna-rabbit':{room:'711',wall:'north',u:4,y:1.80,evidence:'Current record specifies room 711 vestibule; exact wall approximate'},
 'woman-mirror':{room:'711',wall:'east',u:-10,y:1.84,evidence:'Room confirmed; wall position approximate'}
};
export async function buildMuseum(scene,renderer,onProgress){
 const blockers=[],targets=[],floorMeshes=[],roomGroups={},artworks=[];
 const loader=new THREE.TextureLoader();loader.setCrossOrigin(undefined);
 async function loadTexture(url){for(let attempt=0;attempt<3;attempt++){try{return await loader.loadAsync(url);}catch(error){if(attempt===2)throw new Error('Could not load '+url);await new Promise(r=>setTimeout(r,300*(attempt+1)));}}}
 const maps=await Promise.all(['parquet-color','parquet-normal','parquet-rough','marble-color'].map(n=>loadTexture('./assets/materials/'+n+'.jpg')));
 maps.forEach(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());});maps[0].colorSpace=maps[3].colorSpace=THREE.SRGBColorSpace;
 const material=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const gold=material('#ad8450',.3,.72),goldLight=material('#d0af70',.27,.65),goldDark=material('#59401e',.45,.52),ivory=material('#d1c6ab',.8),charcoal=material('#252c29',.54),wood=material('#583922',.54),navy=material('#182632',.86),brass=material('#a8a59a',.29,.78);
 const oak=new THREE.MeshStandardMaterial({map:maps[0],normalMap:maps[1],normalScale:new THREE.Vector2(.19,.19),roughnessMap:maps[2],roughness:1,color:'#c7a780',metalness:0});
 oak.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(roughnessFactor,0.66);');};
 let randomSeed=1412;const random=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
 const grain=document.createElement('canvas');grain.width=grain.height=256;const gctx=grain.getContext('2d'),pixels=gctx.createImageData(256,256);for(let i=0;i<pixels.data.length;i+=4){const n=170+random()*25;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}gctx.putImageData(pixels,0,0);const grainMap=new THREE.CanvasTexture(grain);grainMap.wrapS=grainMap.wrapT=THREE.RepeatWrapping;grainMap.repeat.set(6,3);
 const wallMat=color=>new THREE.MeshStandardMaterial({color,roughness:.95,bumpMap:grainMap,bumpScale:.006});
 function box(w,h,d,mat,x,y,z,parent=scene,collision=false){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);if(collision)blockers.push({x,z,w,d});return mesh;}
 function cylinder(r,h,mat,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function tube(points,r,mat,parent=scene){const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(24,points.length*4),r,7,false),mat);m.castShadow=true;parent.add(m);return m;}
 function floor(room){const geo=new THREE.PlaneGeometry(room.w,room.d);const uv=geo.attributes.uv,p=geo.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)/3.4,p.getY(i)/3.4);const m=new THREE.Mesh(geo,oak);m.rotation.x=-Math.PI/2;m.position.set(room.x,0,room.z);m.receiveShadow=true;scene.add(m);floorMeshes.push(m);
  // Dark parquet border and an inset oak band follow the room perimeter.
  const edge=new THREE.MeshStandardMaterial({map:maps[0],color:'#60462d',roughness:.8});for(const side of [-1,1]){box(room.w,.015,.12,edge,room.x,.008,room.z+side*(room.d/2-.14));box(.12,.015,room.d,edge,room.x+side*(room.w/2-.14),.008,room.z);}
 }
 function flatShadow(w,d,x,z,alpha=.23){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),gr=ctx.createRadialGradient(64,64,4,64,64,63);gr.addColorStop(0,'rgba(12,9,6,'+alpha+')');gr.addColorStop(1,'rgba(12,9,6,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,128,128);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.024,z);scene.add(m);}
 function bench(x,z,rotation=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;scene.add(g);box(2.6,.18,1.05,wood,0,.35,0,g);box(2.64,.16,1.1,navy,0,.51,0,g);for(const x of [-.94,.94])for(const z of [-.34,.34])box(.11,.3,.11,charcoal,x,.15,z,g);for(const x of [-.88,0,.88])box(.012,.009,1.09,charcoal,x,.596,0,g);blockers.push({x,z,w:rotation?1.2:2.7,d:rotation?2.7:1.2});flatShadow(rotation?2.7:4.2,rotation?4.2:2.7,x,z,.35);}
 function label(lines,w=.55,h=.23,bg='#e5dfcf',fg='#282820'){const c=document.createElement('canvas');c.width=1024;c.height=384;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=fg;ctx.font='600 32px Georgia';ctx.fillText(lines[0],45,88);ctx.font='29px Arial';ctx.fillText(lines[1],45,157);ctx.font='24px Arial';ctx.fillText(lines[2]||'',45,236);return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));}
 function moulding(group,length,y,z){for(const [height,depth,offset,mat] of [[.11,.2,0,charcoal],[.08,.3,.10,goldDark],[.055,.35,.175,goldLight],[.13,.25,.25,gold],[.09,.36,.36,goldLight],[.055,.4,.44,ivory]])box(length,height,depth,mat,0,y+offset,z,group);}
 function paintingLabel(art){
  const c=document.createElement('canvas');c.width=1200;c.height=480;
  const ctx=c.getContext('2d');ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,1200,480);ctx.fillStyle='#191b1a';ctx.textBaseline='top';ctx.font='600 62px Arial';
  const words=art.title.split(' '),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>1090&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
  let fontSize=62;if(lines.length>2){fontSize=48;ctx.font='600 48px Arial';lines.length=0;line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>1090&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);}
  lines.slice(0,3).forEach((line,i)=>ctx.fillText(line,55,45+i*(fontSize+11)));const bottom=45+Math.min(lines.length,3)*(fontSize+11)+23;
  ctx.font='44px Arial';ctx.fillStyle='#353936';ctx.fillText(art.artist,55,bottom);ctx.font='38px Arial';ctx.fillStyle='#626661';ctx.fillText(art.year,55,bottom+68);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=16;
  const tag=new THREE.Mesh(new THREE.PlaneGeometry(.78,.312),new THREE.MeshBasicMaterial({map}));tag.userData.art=art;targets.push(tag);return tag;
 }
 // Split a wall around its actual plan openings; these solids also drive collision.
 function wall(room,side,openings=[]){const horizontal=side==='north'||side==='south',length=horizontal?room.w:room.d,height=room.id==='711'?9.1:room.id==='701'?8.8:8.55;const g=new THREE.Group();g.position.set(room.x,0,room.z);const zSign=side==='north'?-1:1;if(horizontal)g.position.z+=zSign*(room.d/2-.20);else{g.position.x+=(side==='west'?-1:1)*(room.w/2-.20);g.rotation.y=-Math.PI/2;}scene.add(g);const wm=wallMat(room.color),cuts=[-length/2,...openings.flatMap(o=>[o.u-o.w/2,o.u+o.w/2]),length/2];
  function solid(a,b,h,y){if(b-a<.01)return;const m=box(b-a,h,.36,wm,(a+b)/2,y,0,g);g.updateMatrixWorld(true);const pos=m.getWorldPosition(new THREE.Vector3());blockers.push({x:pos.x,z:pos.z,w:horizontal?b-a:.36,d:horizontal?.36:b-a});}
  for(let i=0;i<cuts.length-1;i+=2)solid(cuts[i],cuts[i+1],height,height/2);
  for(const o of openings){box(o.w,height-4.3,.36,wm,o.u,(height+4.3)/2,0,g);for(const s of [-1,1]){box(.17,4.4,.54,charcoal,o.u+s*(o.w/2+.09),2.2,0,g);box(.028,4.39,.58,gold,o.u+s*(o.w/2+.045),2.2,0,g);}box(o.w+.35,.2,.54,charcoal,o.u,4.39,0,g);box(o.w+.43,.055,.58,gold,o.u,4.52,0,g);const threshold=box(o.w,.013,.63,ivory,o.u,.012,0,g);}
  // Skirting and picture rail continue only on solid wall sections.
  for(let i=0;i<cuts.length-1;i+=2){const a=cuts[i],b=cuts[i+1],x=(a+b)/2,w=b-a;box(w,.42,.43,charcoal,x,.21,0,g);box(w,.034,.47,goldDark,x,.46,0,g);box(w,.035,.46,charcoal,x,.51,0,g);}
  if(room.id==='711'){box(length,.24,.65,ivory,0,height-.05,0,g);box(length,.055,.76,charcoal,0,height+.1,0,g);for(let x=-length/2+.5;x<length/2;x+=.72){const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.03,10),charcoal);lamp.position.set(x,height-.18,side==='north'||side==='west'?.32:-.32);g.add(lamp);}}else moulding(g,length,height-.2,0);
  // Fine hanging rails, with their warm cast edge.
  box(length,.035,.42,goldDark,0,height-1.0,0,g);
  return g;
 }
 function ceilingDecoration(){const c=document.createElement('canvas');c.width=2048;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#87483e';ctx.fillRect(0,0,2048,512);const grad=ctx.createLinearGradient(0,0,0,512);grad.addColorStop(0,'#aa8d63');grad.addColorStop(.42,'#8c724e');grad.addColorStop(.6,'#c8a975');grad.addColorStop(1,'#957349');ctx.strokeStyle=grad;ctx.fillStyle=grad;ctx.lineWidth=5;
  // Symmetrical acanthus scrolls and wreath medallions, modeled after the red-room frieze.
  for(const center of [256,768,1280,1792]){for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(center,440);ctx.bezierCurveTo(center+s*260,410,center+s*225,130,center+s*60,130);ctx.bezierCurveTo(center+s*10,130,center+s*15,240,center+s*80,205);ctx.stroke();for(let j=0;j<9;j++){const t=j/8,a=t*Math.PI*.98,xx=center+s*(70+120*Math.sin(a)),yy=420-t*260;ctx.save();ctx.translate(xx,yy);ctx.rotate(s*(-.8+t));ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-34,-14,-34,-45,0,-62);ctx.bezierCurveTo(24,-38,26,-13,0,0);ctx.fill();ctx.restore();}}ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(center,270,72,103,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(center,270,59,87,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2;for(let k=0;k<8;k++){ctx.beginPath();ctx.ellipse(center,270,15,60,k*Math.PI/8,0,Math.PI*2);ctx.stroke();}for(let a=0;a<Math.PI*2;a+=Math.PI/12){ctx.beginPath();ctx.ellipse(center+Math.cos(a)*90,270+Math.sin(a)*123,7,17,a,0,Math.PI*2);ctx.fill();}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=12;return t;}
 const friezeMap=ceilingDecoration();
 function redCeiling(r){const y=8.8,top=11.3,inset=2.65,glassW=r.w-inset*2,glassD=r.d-inset*2;
  const frieze=new THREE.MeshStandardMaterial({map:friezeMap,color:'#f5e6d5',roughness:.63,metalness:.18,side:THREE.DoubleSide});
  function slope(a,b,c,d,repeat){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...d],3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,repeat,0,repeat,1,0,1],2));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();const m=new THREE.Mesh(geo,frieze);scene.add(m);}
  for(const s of [-1,1]){const z=r.z+s*r.d/2,zz=r.z+s*glassD/2;slope([r.x-r.w/2,y,z],[r.x+r.w/2,y,z],[r.x+glassW/2,top,zz],[r.x-glassW/2,top,zz],r.w/12);const x=r.x+s*r.w/2,xx=r.x+s*glassW/2;slope([x,y,r.z-r.d/2],[x,y,r.z+r.d/2],[xx,top,r.z+glassD/2],[xx,top,r.z-glassD/2],r.d/12);}
  skylight(r.x,r.z,glassW,glassD,top,.9);
  // Thick gilded cornices, dentils and transverse roof trusses.
  for(const s of [-1,1]){for(const [off,size,m] of [[0,.12,goldLight],[.16,.1,goldDark],[.29,.14,gold],[.43,.06,goldLight]]){box(glassW+1,.12,size,m,r.x,top-.05-off*.25,r.z+s*(glassD/2+off));box(size,.12,glassD+1,m,r.x+s*(glassW/2+off),top-.05-off*.25,r.z);}
   for(let x=r.x-glassW/2;x<r.x+glassW/2;x+=.26)box(.09,.16,.2,gold,x,top-.16,r.z+s*(glassD/2+.15));}
  for(let x=r.x-glassW/2;x<=r.x+glassW/2+.1;x+=5.8){box(.14,.21,glassD+.5,gold,x,top-.07,r.z);for(const s of [-1,1]){for(let k=0;k<3;k++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.24+k*.055,.026,6,20),goldLight);ring.rotation.x=.72*s;ring.position.set(x,top-.3-k*.06,r.z+s*(glassD/2+.16+k*.07));scene.add(ring);}}}
 }
 function skylight(x,z,w,d,y,strength=1){const glass=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color:'#dfe7e6',side:THREE.DoubleSide}));glass.rotation.x=Math.PI/2;glass.position.set(x,y,z);scene.add(glass);for(let xx=-w/2;xx<=w/2+.01;xx+=1.15)box(.035,.075,d,charcoal,x+xx,y-.045,z);for(let zz=-d/2;zz<=d/2+.01;zz+=1.15)box(w,.075,.035,charcoal,x,y-.045,z+zz);const l=new THREE.RectAreaLight('#fff4e0',strength,w,d);l.position.set(x,y-.18,z);l.lookAt(x,0,z);scene.add(l);}
 RectAreaLightUniformsLib.init();
 for(const r of rooms){floor(r);roomGroups[r.id]=new THREE.Group();scene.add(roomGroups[r.id]);if(r.id==='700'||r.id==='702'){
   wall(r,'north');wall(r,'south');const side=r.id==='700'?'east':'west';wall(r,side,[{u:-1-r.z,w:2.1},{u:6-r.z,w:2.1}]);wall(r,side==='east'?'west':'east');redCeiling(r);
   for(let x=r.x-r.w/2+7;x<r.x+r.w/2-3;x+=8)bench(x,r.z,Math.PI/2);
   for(const s of [-1,1]){let last=null;for(let x=r.x-r.w/2+1.5;x<r.x+r.w/2-1;x+=4.4){const z=r.z+s*(r.d/2-1.05);cylinder(.025,.75,brass,x,.375,z);cylinder(.115,.025,brass,x,.012,z);if(last!==null)tube([[last,.74,z],[(last+x)/2,.705,z],[x,.74,z]],.008,charcoal);last=x;}}
  }else if(r.id==='701'){
   wall(r,'north');wall(r,'south',[{u:0,w:2.7}]);wall(r,'west',[{u:-1-r.z,w:2.1},{u:6-r.z,w:2.1}]);wall(r,'east',[{u:-1-r.z,w:2.1},{u:6-r.z,w:2.1}]);
   // The salon is an architectural junction, with a restrained coffered interpretation.
   box(r.w,1,r.d,wallMat('#c2b394'),r.x,11.8,r.z);for(let x=-7.4;x<=7.5;x+=3.7)for(let z=-7.4;z<=7.5;z+=3.7){box(3.3,.14,3.3,goldDark,r.x+x,11.18,r.z+z);box(3.1,.15,3.1,ivory,r.x+x,11.10,r.z+z);box(2.85,.12,2.85,wallMat('#927a5b'),r.x+x,11.0,r.z+z);}
   const glow=new THREE.PointLight('#fff0d5',220,24,2);glow.position.set(r.x,8.8,r.z);scene.add(glow);for(const x of [-7.8,7.8])for(const z of [-7.7,7.7]){box(.9,.2,.9,ivory,r.x+x,.1,r.z+z);cylinder(.3,8.5,ivory,r.x+x,4.45,r.z+z);box(1,.24,1,gold,r.x+x,8.7,r.z+z);blockers.push({x:r.x+x,z:r.z+z,w:.9,d:.9});}
   for(const [txt,xx,zz,rot] of [['700 · SALLE MOLLIEN',-8.9,0,Math.PI/2],['702 · SALLE DARU',8.9,0,-Math.PI/2],['711 · LA JOCONDE',0,9.5,Math.PI]]){const s=label([txt,'DENON · NIVEAU 1',''],1.5,.54,'#383730','#e6dcc5');s.position.set(r.x+xx,3,r.z+zz);s.rotation.y=rot;scene.add(s);}
  }else{
   wall(r,'north',[{u:0,w:2.7}]);wall(r,'south',[{u:-7.1,w:2.1},{u:7.1,w:2.1}]);wall(r,'east');wall(r,'west');for(const x of [-7.1,7.1]){box(2.1,4.3,.25,charcoal,r.x+x,2.15,r.z+r.d/2+.7,scene,true);const sign=label(['712 · GRANDE GALERIE','Outside this reconstruction',''],.8,.3);sign.position.set(r.x+x,2.1,r.z+r.d/2+.55);sign.rotation.y=Math.PI;scene.add(sign);}
   // Plain white coved roof and luminous glass, as remodeled in the 19th/20th centuries.
   const ceiling=wallMat('#e4e0d6');ceiling.side=THREE.DoubleSide;box(r.w,.3,r.d,ceiling,r.x,11.6,r.z);
   function roofQuad(a,b,c,d){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...d],3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();scene.add(new THREE.Mesh(geo,ceiling));}
   for(const side of [-1,1]){const x=r.x+side*r.w/2,ix=r.x+side*(r.w/2-2.15),z=r.z+side*r.d/2,iz=r.z+side*(r.d/2-2.7);roofQuad([x,9.3,r.z-r.d/2],[x,9.3,r.z+r.d/2],[ix,11.25,r.z+r.d/2-2.7],[ix,11.25,r.z-r.d/2+2.7]);roofQuad([r.x-r.w/2,9.3,z],[r.x+r.w/2,9.3,z],[r.x+r.w/2-2.15,11.25,iz],[r.x-r.w/2+2.15,11.25,iz]);const chamfer=box(Math.sqrt(18),9.1,.3,wallMat(r.color),r.x+side*(r.w/2-1.5),4.55,r.z-r.d/2+1.5);chamfer.rotation.y=-side*Math.PI/4;}
   skylight(r.x,r.z,r.w-4.3,r.d-5.4,11.25,.75);
   const partitionZ=r.z-r.d/2+5.7;box(8.3,8.15,.65,wallMat('#203442'),r.x,4.075,partitionZ,scene,true);box(8.7,.24,.82,ivory,r.x,.12,partitionZ);for(const side of [-1,1])box(.25,8.4,.86,ivory,r.x+side*4.3,4.2,partitionZ);box(8.85,.27,.86,ivory,r.x,8.45,partitionZ);
   // Climate-controlled display case, brass reveal, oak ledge and curved visitor rail.
   box(2.4,3.8,.14,material('#10191f',1),r.x,2.72,partitionZ+.38);for(const s of [-1,1])box(.045,3.83,.1,brass,r.x+s*1.23,2.73,partitionZ+.49);box(2.5,.05,.12,brass,r.x,4.64,partitionZ+.49);box(2.6,.23,.65,wood,r.x,.93,partitionZ+.58);
   const glass=new THREE.Mesh(new THREE.PlaneGeometry(2.39,3.7),new THREE.MeshPhysicalMaterial({color:'#d3e3e5',transparent:true,opacity:.022,roughness:.3,metalness:.2,depthWrite:false}));glass.position.set(r.x,2.76,partitionZ+.64);scene.add(glass);
   const rail=[];for(let i=0;i<=40;i++){const a=Math.PI*i/40;rail.push([r.x+Math.cos(a)*3.55,.87,partitionZ+.6+Math.sin(a)*2.05]);}tube(rail,.085,wood);for(let i=1;i<40;i+=8){const p=rail[i];cylinder(.027,.81,brass,p[0],.4,p[2]);}blockers.push({x:r.x,z:partitionZ+1.2,w:6.9,d:2.35});flatShadow(9,4,r.x,partitionZ+.6,.2);
   for(const x of [-5.3,5.3])bench(r.x+x,r.z+5,0);
  }
 }
 scene.add(new THREE.HemisphereLight('#e8eff5','#6e4832',.5));scene.environmentIntensity=.42;
 // The diffuse area lights do most of the work; this restrained sun adds directional relief.
 const sunlight=new THREE.DirectionalLight('#fff2d8',.8);sunlight.position.set(-10,45,15);sunlight.target.position.set(0,0,12);scene.add(sunlight,sunlight.target);sunlight.castShadow=true;sunlight.shadow.mapSize.set(4096,4096);Object.assign(sunlight.shadow.camera,{left:-75,right:75,top:55,bottom:-40,near:1,far:120});sunlight.shadow.normalBias=.025;sunlight.shadow.bias=-.0001;sunlight.shadow.autoUpdate=false;sunlight.shadow.needsUpdate=true;
 function artwork(art,t,placement){const r=roomById[placement.room],w=art.width_m,h=art.height_m,g=new THREE.Group();const side=placement.wall;let x=r.x,z=r.z,rot=0;
  if(side==='north'){x+=placement.u;z-=r.d/2-.24;rot=0;}if(side==='south'){x+=placement.u;z+=r.d/2-.24;rot=Math.PI;}if(side==='west'){x-=r.w/2-.24;z+=placement.u;rot=Math.PI/2;}if(side==='east'){x+=r.w/2-.24;z+=placement.u;rot=-Math.PI/2;}if(side==='partition'){z=r.z-r.d/2+5.7+.48;rot=0;}if(side==='partition-back'){z=r.z-r.d/2+5.7-.48;rot=Math.PI;}
  g.position.set(x,placement.y,z);g.rotation.y=rot;scene.add(g);const frameWidth=art.id==='mona-lisa'?.11:Math.min(.26,.1+Math.max(w,h)*.025);
  // Deep mitred gilded profiles, shadowed rebate and continuous carved beads.
  const levels=[[frameWidth,.04,goldDark],[frameWidth*.94,.075,gold],[frameWidth*.76,.11,goldLight],[frameWidth*.58,.125,gold],[frameWidth*.3,.13,goldDark],[frameWidth*.17,.15,goldLight]];
  for(const [out,depth,m] of levels){const fw=w+out*2,fh=h+out*2,thick=Math.max(.018,out*.24);for(const s of [-1,1]){box(fw,thick,.09,m,0,s*(fh/2-thick/2),depth,g);box(thick,fh,.09,m,s*(fw/2-thick/2),0,depth,g);}}
  const ornamentRadius=Math.min(.026,frameWidth*.15),spacing=ornamentRadius*2.5,nx=Math.max(2,Math.ceil((w+frameWidth)/spacing)),ny=Math.max(2,Math.ceil((h+frameWidth)/spacing));const bead=new THREE.InstancedMesh(new THREE.SphereGeometry(ornamentRadius,6,5),goldLight,(nx+ny)*2);const ob=new THREE.Object3D();let n=0;for(const s of [-1,1]){for(let i=0;i<nx;i++){ob.position.set(-w/2-frameWidth*.55+(w+frameWidth*1.1)*i/(nx-1),s*(h/2+frameWidth*.55),.17);ob.updateMatrix();bead.setMatrixAt(n++,ob.matrix);}for(let i=0;i<ny;i++){ob.position.set(s*(w/2+frameWidth*.55),-h/2-frameWidth*.55+(h+frameWidth*1.1)*i/(ny-1),.17);ob.updateMatrix();bead.setMatrixAt(n++,ob.matrix);}}g.add(bead);
  box(w+.025,h+.025,.07,charcoal,0,0,.04,g);const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,color:'#ded7ca'}));panel.position.z=.16;g.add(panel);
  if(side!=='partition'){for(const sx of [-1,1]){const wireLength=Math.max(.05,7.5-(placement.y+h/2+frameWidth));box(.004,wireLength,.004,charcoal,sx*w*.35,h/2+frameWidth+wireLength/2,-.03,g);}const tag=paintingLabel(art);tag.position.set(w/2+.70,-placement.y+1.15,.20);g.add(tag);}
  const pick=new THREE.Mesh(new THREE.BoxGeometry(w+frameWidth*2,h+frameWidth*2,.35),new THREE.MeshBasicMaterial());pick.visible=false;pick.userData.art=art;g.add(pick);targets.push(pick);
  const normal=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),rot);art.position={x,z,y:placement.y,room:r.id,normal:{x:normal.x,z:normal.z},distance:Math.max(2.2,Math.min(7,w*.65))};art.placement=placement;art.displayScale=1;artworks.push(art);
 }
 const response=await fetch('./assets/art/catalog.json');if(!response.ok)throw Error('Catalogue unavailable');const catalog=await response.json();let done=0;
 const placed=catalog.filter(a=>placements[a.id]);await Promise.all(placed.map(async art=>{const t=await loadTexture('./assets/art/'+art.image);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=16;artwork(art,t,placements[art.id]);onProgress(++done,placed.length);}));
 // Batch static opaque meshes by material; retain interactive hit targets separately.
 scene.updateMatrixWorld(true);const batches=new Map();scene.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||!m.visible||!m.material?.isMeshStandardMaterial||m.material.transparent)return;const k=m.material.uuid;let b=batches.get(k);if(!b){b={mat:m.material,meshes:[],geo:[]};batches.set(k,b);}let geo=m.geometry.clone().applyMatrix4(m.matrixWorld);if(geo.index){const flat=geo.toNonIndexed();geo.dispose();geo=flat;}b.geo.push(geo);b.meshes.push(m);});for(const b of batches.values()){const merged=mergeGeometries(b.geo);if(merged){const m=new THREE.Mesh(merged,b.mat);m.receiveShadow=m.castShadow=true;scene.add(m);b.meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});}b.geo.forEach(g=>g.dispose());}
 sunlight.shadow.needsUpdate=true;
 function currentRoom(x,z){return rooms.find(r=>Math.abs(x-r.x)<=r.w/2+.2&&Math.abs(z-r.z)<=r.d/2+.2)||null;}
 function canStand(x,z){const radius=.26,room=currentRoom(x,z);if(!room)return false;if(room.id==='711'&&z<room.z-room.d/2+3&&Math.abs(x-room.x)>room.w/2-3+(z-room.z+room.d/2)-radius)return false;return !blockers.some(b=>Math.abs(x-b.x)<b.w/2+radius&&Math.abs(z-b.z)<b.d/2+radius);}
 return {catalog,artworks,targets,rooms,canStand,currentRoom,spawn:{x:roomById['702'].x+roomById['702'].w/2-4.5,z:roomById['702'].z+1.3,lookX:roomById['702'].x-8,lookZ:roomById['702'].z-.8}};
}
