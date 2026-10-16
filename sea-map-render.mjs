import {contours} from 'd3-contour';
import provinces from './sea-map-data/yemen-adm1.geojson' with {type:'json'};
import countries from './sea-map-data/region.geojson' with {type:'json'};
import {GRID,MODELS,validateSnapshot,median} from './sea-map-core.mjs';
const names={'YE-SH':'شبوة'};
// Keep all governorate boundaries, but label only the user's focus area.
const labels=[['YE-SH',47,14.9,47.3,15.25]];
export const thresholds=[0.1,1,2,5,10,20,30,50,75,100,150,200];
const colors=['#c6e5ff','#83c4f4','#308fde','#0758ad','#079b3d','#64d51c','#efe42c','#ff9b21','#ed4727','#bd0929','#a222d1','#efb6fa'];
const x=lon=>32+(lon-GRID.west)/(GRID.east-GRID.west)*1136;
const y=lat=>140+(GRID.north-lat)/(GRID.north-GRID.south)*758;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rings=g=>g.type==='Polygon'?g.coordinates:g.coordinates.flat();
const shape=g=>rings(g).map(r=>r.map(([lon,lat],i)=>(i?'L':'M')+x(lon).toFixed(1)+','+y(lat).toFixed(1)).join('')+'Z').join('');
const text=(a,b,s,size=20,fill='#143449',extra='')=>`<text x="${a}" y="${b}" font-size="${size}" fill="${fill}" text-anchor="middle" ${extra}>${esc(s)}</text>`;
export const formatDate=v=>new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(v));
export function renderMap(input){
 const s=validateSnapshot(input),v=s.cells.map(c=>c.value),cg=contours().size([GRID.nx,GRID.ny]).thresholds(thresholds)(v);
 const contourPath=g=>g.coordinates.flat().map(r=>r.map(([a,b],i)=>(i?'L':'M')+(32+(a-0.5)/(GRID.nx-1)*1136).toFixed(1)+','+(140+(b-0.5)/(GRID.ny-1)*758).toFixed(1)).join('')+'Z').join('');
 const border=countries.features.map(f=>`<path d="${shape(f.geometry)}" fill="${f.properties.name==='Yemen'?'#fffdf4':'#f4f4ef'}" stroke="#6b7f86" stroke-width="1.6"/>`).join('');
 const lines=provinces.features.map(f=>`<path d="${shape(f.geometry)}" fill="none" stroke="#233b42" stroke-width="1.5"/>`).join('');
 const labelSVG=labels.map(([id,lon,lat,lx,ly])=>`${lon!==lx||lat!==ly?`<path d="M${x(lon)},${y(lat)}L${x(lx)},${y(ly)}" stroke="#526c76" stroke-width=".8"/>`:''}${text(x(lx),y(ly),names[id],20,'#172f3d','paint-order="stroke" stroke="#fff" stroke-width="3" stroke-linejoin="round"')}`).join('');
 const uncertainty=s.cells.map((c,i)=>{if(!c.disagreement)return '';const col=i%GRID.nx,row=Math.floor(i/GRID.nx);return `<rect x="${x(GRID.west+(col-.5)*GRID.step)}" y="${y(GRID.north-(row-.5)*GRID.step)}" width="${1136/(GRID.nx-1)}" height="${758/(GRID.ny-1)}" fill="url(#hatch)"/>`;}).join('');
 const locations=[[47.0765,14.3541,'حبان',47.2,14.6],[47.199415,14.230586,'هدى',47.85,14.0]].map(([lon,lat,n,lx,ly])=>`<circle cx="${x(lon)}" cy="${y(lat)}" r="4.5" fill="#082b41" stroke="white" stroke-width="2"/><path d="M${x(lon)},${y(lat)}L${x(lx)},${y(ly)}" stroke="#173e50"/>${text(x(lx),y(ly),n,20,'#082b41','font-weight="bold" paint-order="stroke" stroke="#fff" stroke-width="3"')}`).join('');
 const modelMin=Math.min(...s.cells.map(c=>c.count)),modelMax=Math.max(...s.cells.map(c=>c.count));const modelCount=modelMin===modelMax?String(modelMin):`${modelMin}–${modelMax}`;
 const legend=thresholds.map((t,i)=>`<rect x="${75+i*88}" y="950" width="88" height="23" fill="${colors[i]}"/>${text(75+i*88,994,t,17)}`).join('')+text(1131,994,'200+',17);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1160" viewBox="0 0 1200 1160" role="img"><title>طقس هدى — تجميع توقعات الأمطار لثلاثة أيام</title><desc>خريطة وسيط مجموع الأمطار لأربعة موديلات، بحدود المحافظات. لا تحدد مسار إعصار.</desc><defs><clipPath id="mapclip"><rect x="32" y="140" width="1136" height="758" rx="12"/></clipPath><pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M-2,2L2,-2M0,9L9,0M7,11L11,7" stroke="#27353c" stroke-width="1" opacity=".45"/></pattern></defs><rect width="1200" height="1160" rx="20" fill="#f7fafb"/><g font-family="Tahoma,Arial,sans-serif"><rect width="1200" height="122" fill="#103b4b"/>${text(1040,48,'طقس هدى',32,'#f3d483','font-weight="bold"')}${text(540,40,'تجميع توقعات الأمطار — ٣ أيام',29,'white','font-weight="bold"')}${text(600,83,'من '+formatDate(s.period.startAt)+' إلى '+formatDate(s.period.endAt)+' • بتوقيت اليمن',20,'#e3f0f5')}<g clip-path="url(#mapclip)"><rect x="32" y="140" width="1136" height="758" fill="#e1edf1"/>${border}${cg.map((g,i)=>`<path d="${contourPath(g)}" fill="${colors[i]}" fill-rule="evenodd"/>`).join('')}${uncertainty}${lines}${labelSVG}${locations}${text(x(56.2),y(15.1),'بحر العرب',28,'#294c5a')}${text(x(54.3),y(19.6),'سلطنة عُمان',22)}${text(x(46.1),y(19.5),'المملكة العربية السعودية',21)}${text(x(48.5),y(12.4),'خليج عدن',21,'#294c5a')}</g><rect x="32" y="140" width="1136" height="758" rx="12" fill="none" stroke="#bdced5"/>${text(600,931,'مجموع الأمطار بالمليمتر • دمج القيم الرقمية بوسيط الموديلات',21)}${legend}<rect x="175" y="1011" width="35" height="20" fill="url(#hatch)"/>${text(625,1027,'التهشير: اختلاف كبير بين الموديلات • ليست خريطة لمسار مؤكد',18)}${text(600,1061,`${modelCount} موديلات متاحة: ECMWF IFS • GFS • ICON • GEM | بيانات عبر Open-Meteo`,17)}${text(600,1091,'جمع البيانات: '+formatDate(s.fetchedAt)+' • شبكة تجميع إقليمية نحو ٨٠ كم؛ التفاصيل تقريبية',16)}${text(600,1123,'متابعة وتجميع ورسم: طقس هدى — بمساعدة ChatGPT',20,'#103b4b','font-weight="bold" direction="rtl"')}${text(600,1147,'الحدود: geoBoundaries / © OpenStreetMap (ODbL) • الدول: Natural Earth • البيانات: CC BY 4.0',13)}</g></svg>`;
}
export function localSummary(place){
 const amount=place.value,hi=place.max;
 if(hi<1)return {text:'فرص الأمطار ضعيفة خلال الفترة الموضحة.'};
 if(amount<1)return {text:'غالبية التوقعات تشير إلى أجواء جافة، مع احتمال أمطار في بعض الموديلات.'};
 const strength=amount<10?'خفيفة':amount<30?'متوسطة':'غزيرة';
 return {text:'أمطار '+strength+' محتملة؛ مجموعها التقريبي '+Math.round(amount*10)/10+' ملم خلال ثلاثة أيام.'+(place.disagreement?' الموديلات مختلفة بوضوح، وقد تتغير الكمية.':'')};
}

export function satelliteOutline(){
 const x=lon=>(lon-40)*50,y=lat=>(23-lat)*50;
 const shape=g=>rings(g).map(r=>r.map(([lon,lat],i)=>(i?'L':'M')+x(lon).toFixed(1)+','+y(lat).toFixed(1)).join('')+'Z').join('');
 const path=(g,color,width)=>`<path d="${shape(g)}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
 const labels=[['شبوة',47,15.25],['حبان',47.08,14.35],['هدى',47.2,14.23],['خليج عدن',48.5,12.4],['بحر العرب',56,15.5]];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 750" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${countries.features.map(f=>path(f.geometry,'#f8df86',1.6)).join('')}${provinces.features.map(f=>path(f.geometry,'#f8df86',0.7)).join('')}${labels.map(([name,lon,lat],i)=>`<circle cx="${x(lon)}" cy="${y(lat)}" r="3" fill="#ffdf74"/><text x="${x(lon)+(i===1?-45:i===2?30:0)}" y="${y(lat)+(i===1?-10:i===2?22:-12)}" fill="white" stroke="#142b35" stroke-width="3" paint-order="stroke" font-family="Arial,sans-serif" font-size="20" text-anchor="middle">${name}</text>`).join('')}</svg>`;
}
