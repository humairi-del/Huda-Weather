// Isolated release compiler. Produces a proposal only; never writes GitHub or the public site.
export const BASELINE_INDEX_SHA='39206620492782c51313fdee7802b697dad536cc';
const TITLE_TAG=/<title>([^<>]*)<\/title>/g;
export function escapeTitle(value){
 if(typeof value!=='string')throw new TypeError('Title must be text');
 const normalized=value.trim();
 if(!normalized||normalized.length>120||/[\u0000-\u001f\u007f]/.test(normalized))throw new Error('Invalid title');
 return normalized.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
export function compileTitleProposal({source,sourceSha,revision,title}){
 if(typeof source!=='string'||sourceSha!==BASELINE_INDEX_SHA)throw new Error('Public baseline changed; review again');
 if(!Number.isSafeInteger(revision)||revision<1)throw new Error('Invalid draft revision');
 const matches=[...source.matchAll(TITLE_TAG)];
 if(matches.length!==1)throw new Error('Expected exactly one title element');
 const before=matches[0][0],after='<title>'+escapeTitle(title)+'</title>';
 const updated=source.replace(before,after);
 const changed=updated!==source;
 return Object.freeze({
  section:'site',draftRevision:revision,sourceSha,changed,
  before,after,updatedSource:updated,
  rollbackSource:source,
  publishAuthorized:false,
  requiresOwnerApproval:true,
  requiresFreshShaCheck:true
 });
}
