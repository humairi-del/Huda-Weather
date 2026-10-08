// Pure, staging-only validation and release preparation. No network or public writes.
export const BASELINE={index:'39206620492782c51313fdee7802b697dad536cc'};
export const SECTION_RULES=Object.freeze({
 site:{mode:'title-only',file:'index.html'},
 prayers:{mode:'manual-adapter-required',file:'prayer-7day.js'},
 alerts:{mode:'automatic-weather-engine',file:'patch-2.2.js'},
 modules:{mode:'structured-module-keys-required',file:'base-2.1.1.html'}
});
const escapeHtml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function prepareRelease(section,entry,source,{sourceSha}={}){
 if(!Object.hasOwn(SECTION_RULES,section))throw Error('Unsupported section');
 if(!entry||!Number.isSafeInteger(entry.revision)||entry.revision<1||!entry.payload||typeof entry.payload.title!=='string'||typeof entry.payload.body!=='string')throw Error('Invalid draft');
 const rule=SECTION_RULES[section];
 if(section!=='site')return {ready:false,section,revision:entry.revision,reason:rule.mode,file:rule.file};
 if(sourceSha!==BASELINE.index)throw Error('Baseline changed: refresh public source before review');
 if(typeof source!=='string'||!source.startsWith('<!DOCTYPE html>'))throw Error('Invalid public source');
 const matches=[...source.matchAll(/<title>[^<]*<\/title>/gi)];
 if(matches.length!==1)throw Error('Expected exactly one title element');
 const title=entry.payload.title.trim();
 if(!title||title.length>120)throw Error('Invalid title');
 const before=matches[0][0],after='<title>'+escapeHtml(title)+'</title>';
 const patched=source.replace(before,after);
 if(patched.replace(after,before)!==source)throw Error('Patch verification failed');
 return {ready:true,section,revision:entry.revision,file:rule.file,sourceSha,before,after,changed:before!==after,patched,rollback:source};
}
export function verifyRelease(plan,{section,revision,sourceSha}){
 if(!plan?.ready||plan.section!==section||plan.revision!==revision||plan.sourceSha!==sourceSha)throw Error('Review is stale');
 return {reviewOnly:true,requiresExplicitApproval:true,changed:plan.changed};
}
