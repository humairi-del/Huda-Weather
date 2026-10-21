export const IMD_HOME='https://rsmcnewdelhi.imd.gov.in/';
const CATEGORIES=[
 ['super-cyclonic-storm',/SUPER CYCLONIC STORM/i,'إعصار مداري فائق الشدة',4],
 ['extremely-severe-cyclonic-storm',/EXTREMELY SEVERE CYCLONIC STORM/i,'إعصار مداري بالغ الشدة',4],
 ['very-severe-cyclonic-storm',/VERY SEVERE CYCLONIC STORM/i,'إعصار مداري شديد جدًا',4],
 ['severe-cyclonic-storm',/SEVERE CYCLONIC STORM/i,'عاصفة مدارية شديدة',3],
 ['cyclonic-storm',/CYCLONIC STORM/i,'عاصفة مدارية',3],
 ['deep-depression',/DEEP DEPRESSION/i,'منخفض جوي عميق',2],
 ['depression',/DEPRESSION/i,'منخفض جوي',1],
 ['well-marked-low-pressure-area',/WELL[ -]MARKED LOW[ -]PRESSURE AREA/i,'منطقة ضغط منخفض محددة جيدًا',0],
 ['low-pressure-area',/LOW[ -]PRESSURE AREA/i,'منطقة ضغط منخفض',0]
];
export function discoverBulletins(html){
 html=html.replace(/<!--[\s\S]*?-->/g,'');
 const links=[];for(const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const label=m[2].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  if(!/Tropical Weather Outlook|RSMC Bulletin|National Bulletin/i.test(label))continue;
  let url;try{url=new URL(m[1].replace(/&amp;/g,'&'),IMD_HOME)}catch{continue}
  if(url.origin!==new URL(IMD_HOME).origin||!/^\/uploads\/(?:archive\/)?/i.test(url.pathname)||!/\.pdf$/i.test(url.pathname)||/No(?:%20|[ _-])*Cyclone/i.test(url.pathname))continue;
  links.push({url:url.href,label});
 }
 return [...new Map(links.map(l=>[l.url,l])).values()].sort((a,b)=>{const score=l=>/RSMC Bulletin/i.test(l.label)?100:/National Bulletin/i.test(l.label)?90:20;return score(b)-score(a)}).slice(0,4);
}
function utcDate(d,m,y,h,min){const value=Date.UTC(+y,+m-1,+d,+h,+min),date=new Date(value);return date.getUTCFullYear()===+y&&date.getUTCMonth()===+m-1&&date.getUTCDate()===+d?value:null;}
export function bulletinTime(text){
 let m=text.match(/ISSUED AT\s*(\d{2})(\d{2})\s*UTC\s*(?:OF|ON)\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/i);
 if(m&&+m[1]<24&&+m[2]<60)return utcDate(m[3],m[4],m[5],m[1],m[2]);
 m=text.match(/TIME OF ISSUE\s*:?\s*(\d{2})(\d{2})\s*(?:HOURS|HRS)?\s*IST\s*(?:DATED|ON)?\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/i);
 if(m&&+m[1]<24&&+m[2]<60){const value=utcDate(m[3],m[4],m[5],m[1],m[2]);return value===null?null:value-19800000;}
 m=text.match(/BASED ON\s*(\d{2})(\d{2})\s*UTC\s*(?:OF|ON)\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/i);
 return m&&+m[1]<24&&+m[2]<60?utcDate(m[3],m[4],m[5],m[1],m[2]):null;
}
function category(s){return CATEGORIES.find(c=>c[1].test(s));}
function movement(s){
 const toward=s.match(/\b(?:towards|toward)\s+([^.;]{1,150})/i);
 if(toward){const places=[];if(/SHABWAH?|SHABWA/i.test(toward[1]))places.push('شبوة');if(/YEMEN/i.test(toward[1]))places.push('اليمن');if(/OMAN/i.test(toward[1]))places.push('عُمان');if(/SOMALIA/i.test(toward[1]))places.push('الصومال');if(places.length)return {text:'باتجاه '+places.join(' و')+' وفق نص النشرة الرسمية.',targets:places};}
 const m=s.match(/(?:likely to move|expected to move|will move|would move|movement is)\s+((?:(?:nearly|initially|further|slowly|gradually|predominantly)\s+)*)(north[ -]?northwest|west[ -]?northwest|east[ -]?northeast|north[ -]?northeast|south[ -]?southeast|west[ -]?southwest|east[ -]?southeast|south[ -]?southwest|northwest|northeast|southwest|southeast|west|east|north|south)(?:wards?|ward)?/i);
 if(!m)return {text:'لم يرد مسار متوقع قابل للتحقق في النشرة المقروءة.',targets:[]};
 const dirs={'northnorthwest':'الشمال والشمال الغربي','westnorthwest':'الغرب والشمال الغربي','eastnortheast':'الشرق والشمال الشرقي','northnortheast':'الشمال والشمال الشرقي','southsoutheast':'الجنوب والجنوب الشرقي','westsouthwest':'الغرب والجنوب الغربي','eastsoutheast':'الشرق والجنوب الشرقي','southsouthwest':'الجنوب والجنوب الغربي','northwest':'الشمال الغربي','northeast':'الشمال الشرقي','southwest':'الجنوب الغربي','southeast':'الجنوب الشرقي','west':'الغرب','east':'الشرق','north':'الشمال','south':'الجنوب'};
 return {text:'الاتجاه الأول المتوقع: نحو '+dirs[m[2].toLowerCase().replace(/[ -]/g,'')]+'. لا يحدد هذا وحده ساحل الوصول.',targets:[]};
}
export function isCurrentBulletin(data,now=Date.now()){
 return data?.schema==='hada-imd-cyclone-v1'&&data.basin==='Arabian Sea'&&Number.isFinite(data.issuedAt)&&data.issuedAt>0&&data.issuedAt<=now+15*60000&&Number.isFinite(data.checkedAt)&&data.checkedAt<=now+5*60000&&now-data.checkedAt<=15*60000&&now-data.issuedAt<=(data.state==='active'?12:30)*3600000;
}
// Dated history may be displayed, but isCurrentBulletin still gates alerts.
export function parseImdBulletin(raw,sourceUrl,now=Date.now(),{allowHistorical=false}={}){
 const url=new URL(sourceUrl);if(url.origin!==new URL(IMD_HOME).origin||!url.pathname.startsWith('/uploads/')||!/\.pdf$/i.test(url.pathname))throw new Error('source_not_allowed');
 const text=raw.normalize('NFKC').replace(/[–—−]/g,'-').replace(/\s+/g,' ').trim();
 if(!/REGIONAL SPECIALISED METEOROLOGICAL CENTRE|RSMC.*NEW DELHI|INDIA METEOROLOGICAL DEPARTMENT/i.test(text))throw new Error('authority_not_recognized');
 const issuedAt=bulletinTime(text);if(!issuedAt||issuedAt>now+15*60000||now-issuedAt>(allowHistorical?168:30)*3600000)throw new Error('bulletin_stale_or_undated');
 let sea=text.match(/\bARABIAN SEA\s*:\s*([\s\S]+)/i)?.[1];
 if(sea)sea=sea.split(/\bBAY OF BENGAL\s*:/i)[0];
 else {
  // Special outlooks retain the two-basin boilerplate but identify the
  // actual system in a subject line instead of an ARABIAN SEA: section.
  const subject=text.match(/\bSUB(?:JECT)?\s*:\s*([^.;]{0,180}\bARABIAN SEA\b[\s\S]*)/i)?.[1];
  if(subject)sea=subject.split(/\bBAY OF BENGAL\s*:/i)[0];
  else if(/\bARABIAN SEA\b/i.test(text)&&!/\bBAY OF BENGAL\b/i.test(text))sea=text;
 }
 if(!sea)throw new Error('basin_not_resolved');
 const narrative=sea.split(/\*?PROBABILITY OF CYCLOGENESIS|FORECAST TRACK AND INTENSITY|DATE\/TIME\s*\(/i)[0].trim();
 const forecastCut=narrative.search(/\b(?:it is (?:very )?likely|it would|it will|is expected to|is likely to|would (?:move|intensify)|will (?:move|intensify)|likely to (?:form|develop|intensify))\b/i);
 const observed=forecastCut<0?narrative:narrative.slice(0,forecastCut);
 const base={schema:'hada-imd-cyclone-v1',authority:'IMD / RSMC New Delhi',basin:'Arabian Sea',issuedAt,checkedAt:now,sourceUrl:url.href,name:null,category:null,stage:null,wind:null,track:{text:'لم ينشر المصدر مسارًا مداريًا قابلًا للتحقق لهذه الحالة.',targets:[]},lifecycle:'unclassified'};
 const transition=[...observed.matchAll(/\b(?:weakened|intensified|concentrated)\s+(?:further\s+)?into\s+(?:a\s+)?([^.;]{1,130})/gi)].at(-1);
 const explicit=transition?category(transition[1]):null;
 let current=explicit||category(observed);
 // A forecast of genesis, a "no depression" statement, and upper-air circulation
 // cannot be promoted to a present surface tropical classification.
 if(current&&/\b(?:NO|NOT A|WITHOUT A)\s+(?:DEEP\s+)?(?:DEPRESSION|CYCLONIC STORM|LOW[ -]PRESSURE AREA)\b/i.test(observed))current=null;
 if(/\b(?:system|depression|storm|circulation)\b[^.;]{0,60}\b(?:has dissipated|dissipated|ceased to exist)\b/i.test(observed)){
  return {...base,state:'ended',lifecycle:'ended',summary:'أفادت النشرة بتبدد الحالة. لا توجد مرحلة نشطة معروضة.',category:'انتهت الحالة وفق النشرة'};
 }
 if(current){
  if(now-issuedAt>12*3600000&&!allowHistorical)throw new Error('active_bulletin_stale');
  if(!/\b(?:lay|lies|centred|centered|persists?|weakened into|intensified into|concentrated into|located|observed)\b/i.test(observed))return {...base,state:'unverified',summary:'توجد إشارة إلى حالة مدارية، وتعذر التحقق آليًا من تصنيفها الحالي.'};
  // Observed winds may follow a forecast paragraph. Only accept a
  // present-tense wind sentence, never a forecast intensity estimate.
  const windText=narrative.split(/(?<=[.;])\s+/).filter(s=>!/\b(?:likely|expected|forecast|will|would)\b/i.test(s)).join(' ');
  const wind=windText.match(/(?:MAXIMUM SUSTAINED(?: SURFACE)? WIND(?: SPEED|S)?|MSW)[^.;]{0,65}?\b(\d{1,3})(?:\s*(?:-|TO)\s*(\d{1,3}))?\s*(KMPH|KM\/H|KNOTS|KTS?|KM PH)/i);
  let winds=null;if(wind){const lo=+wind[1],hi=+(wind[2]||wind[1]),kt=/KNOT|^KT/i.test(wind[3]);if(lo>0&&hi>=lo&&hi<500)winds={knotsMin:kt?lo:lo/1.852,knotsMax:kt?hi:hi/1.852,kmhMin:kt?lo*1.852:lo,kmhMax:kt?hi*1.852:hi};}
  const name=observed.match(/(?:CYCLONIC STORM|CYCLONE)\s*["“”‘'(<]\s*([A-Z][A-Z -]{1,35})\s*["“”’')>]/i)?.[1]?.trim()||null;
  const code=observed.match(/\bARB\s*\d{1,2}\b/i)?.[0]?.replace(/\s+/g,'')||null;
  return {...base,state:'active',id:code?`${new Date(issuedAt).getUTCFullYear()}-${code}`:name?`${new Date(issuedAt).getUTCFullYear()}-${name}`:null,name,categoryCode:current[0],category:current[2],stage:current[3],wind:winds,track:movement(narrative),lifecycle:transition&&/^weakened/i.test(transition[0])?'weakening':'active',summary:'تصنيف سطحي منشور في النشرة الرسمية.'};
 }
 if(/upper[ -]air cyclonic circulation|upper[ -]air circulation|cyclonic circulation[^.;]{0,80}(?:km|kilomet|above mean sea level)/i.test(observed))return {...base,state:'upper-air',summary:'ترصد النشرة دورانًا علويًا في بحر العرب؛ لم يرد له تصنيف مداري سطحي في النص المقروء.',category:'دوران علوي؛ غير مصنف كحالة سطحية'};
 const probability=sea.match(/PROBABILITY OF CYCLOGENESIS[\s\S]*/i)?.[0]||'';
 if((probability.match(/\bNIL\b/gi)||[]).length>=7&&!/DEPRESSION|CYCLONIC STORM|LOW[ -]PRESSURE AREA/i.test(observed))return {...base,state:'no-classified-system',category:'لم يرد تصنيف لحالة سطحية في النشرة',summary:'لا تعلن النشرة المقروءة حالة سطحية مصنفة في بحر العرب. هذا ليس ضمانًا لاستقرار جميع الأجواء.'};
 return {...base,state:'unverified',summary:'وصلت النشرة الرسمية، وتعذر التحقق آليًا من تصنيف الحالة الحالية.'};
}
