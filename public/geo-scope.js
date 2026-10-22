(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HadaGeoScope=factory();})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
function ringContains(ring,x,y){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];const cross=(x-xi)*(yj-yi)-(y-yi)*(xj-xi);if(Math.abs(cross)<1e-9&&x>=Math.min(xi,xj)&&x<=Math.max(xi,xj)&&y>=Math.min(yi,yj)&&y<=Math.max(yi,yj))return true;if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
function polygonContains(poly,x,y){return poly.length>0&&ringContains(poly[0],x,y)&&!poly.slice(1).some(r=>ringContains(r,x,y));}
function contains(geo,lon,lat){if(!Number.isFinite(lon)||!Number.isFinite(lat))return false;if(geo.type==='FeatureCollection')return geo.features.some(f=>contains(f,lon,lat));if(geo.type==='Feature')return contains(geo.geometry,lon,lat);if(geo.type==='Polygon')return polygonContains(geo.coordinates,lon,lat);if(geo.type==='MultiPolygon')return geo.coordinates.some(p=>polygonContains(p,lon,lat));return false;}
return {contains};
});
