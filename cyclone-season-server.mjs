const HOME='https://rsmcnewdelhi.imd.gov.in/';
const ALLOWED=new Set(['rsmcnewdelhi.imd.gov.in','dss.imd.gov.in']);
const SOURCES=[['outlook','Tropical Weather Outlook','النشرة المدارية الرسمية'],['genesis','Graphical Tropical Weather Outlook','خريطة احتمالات التشكل'],['extended','Extended Range Outlook','توقعات الأسبوعين'],['track','Observed & Forecast Track','المسار المرصود والمتوقع'],['interactive','Interactive Track','خريطة المسار التفاعلية']];
function clean(s){return s.replace(/<[^>]*>/g,' ').replace(/&amp;/gi,'&').replace(/&#0*38;/g,'&').replace(/\s+/g,' ').trim();}
export function sourceDate(text){
 let m=text.match(/(?:of[_\s]*)(\d{2})[.\-](\d{2})[.\-](20\d{2})/i),date;
 if(m)date=m[3]+'-'+m[2]+'-'+m[1];
 else{m=text.match(/(?:Outlook[_\s]*)(\d{2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(20\d{2})/i);if(m){const mon=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase())+1;date=m[3]+'-'+String(mon).padStart(2,'0')+'-'+m[1];}}
 if(!date||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return null;
 const utc=text.match(/(?:on[_\s]*)(\d{2})(\d{2})[_\s]*UTC/i);
 return{date,issuedAt:utc&&Number(utc[1])<24&&Number(utc[2])<60?date+'T'+utc[1]+':'+utc[2]+':00Z':null};
}
export function parseSources(html,now=new Date()){
 const safe=html.replace(/<!--[\s\S]*?-->/g,''),anchors=[];
 for(const m of safe.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)){
  try{const url=new URL(clean(m[2]),HOME);if(url.protocol==='https:'&&ALLOWED.has(url.hostname)&&!url.username&&!url.password)anchors.push({url:url.href,title:clean(m[3])});}catch{}
 }
 const reports=SOURCES.flatMap(([id,title,label])=>{const a=anchors.find(a=>a.title.toLowerCase()===title.toLowerCase());if(!a)return[];const stamp=sourceDate(a.url+' '+a.title);const at=stamp?Date.parse(stamp.issuedAt||stamp.date+'T00:00:00Z'):NaN;const age=now.getTime()-at;return[{id,label,url:a.url,date:stamp?.date||null,issuedAt:stamp?.issuedAt||null,dateUncertain:!stamp||age<0,stale:stamp?age>(id==='extended'?8*86400000:36*3600000):false,noTrackFile:id==='track'&&/No[_\s-]*Cyclone/i.test(a.url)}];});
 if(!reports.some(r=>r.id==='outlook'))throw new Error('official_links_unavailable');
 return{source:'IMD / RSMC New Delhi',home:HOME,checkedAt:now.toISOString(),reports};
}
export async function officialSources(io=fetch,now=new Date()){
 const response=await io(HOME,{signal:AbortSignal.timeout(12000),headers:{Accept:'text/html'}});
 if(!response.ok)throw new Error('official_source_unavailable');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>524288)throw new Error('source_too_large');chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
 return parseSources(new TextDecoder().decode(bytes),now);
}
