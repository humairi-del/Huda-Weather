const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function card(overrides={},age=0){
 const data={...JSON.parse(fs.readFileSync('public/official-cyclone-snapshot.json','utf8')),issuedAt:Date.now()-age,checkedAt:Date.now(),...overrides};
 class Element{constructor(){this.children=[];this.textContent='';this.dataset={};}appendChild(x){this.children.push(x);return x;}setAttribute(){} get text(){return this.textContent+this.children.map(x=>x.text).join(' ');}}
 const window={addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('public/official-cyclone.js','utf8'),{window,document:{createElement:()=>new Element()},localStorage:{getItem:()=>JSON.stringify(data)},setInterval(){},Intl,URL,Date});
 return window.HadaOfficialCyclone.renderCard().text;
}
test('weak state omits empty name, wind and technical placeholders',()=>{
 const text=card({name:null,wind:null});assert.match(text,/الحالة: استقرار عام \/ نشاط اعتيادي - لا توجد تأثيرات مباشرة على المنطقة/);assert.doesNotMatch(text,/الاسم غير متاح|لم ترد سرعة|عتبة|النقاط الممثلة|تفاصيل تقنية/);
});
test('Yemen-bound low does not claim no direct local effects',()=>{
 assert.doesNotMatch(card({track:{text:'باتجاه اليمن',targets:['اليمن']}}),/لا تشير الوجهة|لا توجد تأثيرات|استقرار عام/);
});
test('stale bulletin does not claim current stability',()=>{
 const text=card({},48*3600000);assert.match(text,/لا تتوفر نشرة حديثة/);assert.doesNotMatch(text,/استقرار عام|نشاط منخفض/);
});
test('strong storm retains classification and available wind',()=>{
 const text=card({stage:3,category:'عاصفة مدارية',name:'اختبار'});assert.match(text,/عاصفة مدارية/);assert.match(text,/الرياح:/);
});
test('live satellite is default with a separate provider accumulation view',()=>{
 const html=fs.readFileSync('public/index.html','utf8');assert.match(html,/overlay=satellite/);assert.match(html,/src="\.\/live-clouds.js"/);assert.doesNotMatch(html,/rainAccumulationMap|window.HadaMapHub=|mapTabRain/);assert.match(html,/id="showRainAccumulation"/);
 assert.doesNotMatch(fs.readFileSync('public/sea-bulletin.js','utf8'),/HadaMapHub|مستجدات بحر العرب والمنطقة/);
});
