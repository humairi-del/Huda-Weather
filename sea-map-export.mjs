// Render our own SVG as a real PNG; no external images/fonts and no screenshot UI.
export async function mapPNG(svg,env={document,Image,URL,Blob}){
 if(typeof svg!=='string'||!svg.startsWith('<svg')||svg.includes('<script')||svg.length>2000000)throw Error('invalid_map');
 const url=env.URL.createObjectURL(new env.Blob([svg],{type:'image/svg+xml'}));
 try{
  const img=new env.Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('image_decode'));img.src=url;});
  if(img.naturalWidth!==1200||img.naturalHeight!==1160)throw Error('image_size');
  const canvas=env.document.createElement('canvas');canvas.width=2400;canvas.height=2320;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('canvas_unavailable');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob||blob.type!=='image/png')throw Error('png_unavailable');return blob;
 }finally{env.URL.revokeObjectURL(url);}
}
