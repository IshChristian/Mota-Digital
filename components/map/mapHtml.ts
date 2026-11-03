// The live map page, shared by the native WebView and the web iframe.
//
// React sends {type:"update", data} messages (see mapData in ./types). The page
// keeps one marker per id and glides it to each new position, so drivers and
// passengers are seen moving instead of jumping. It only re-frames the view when
// `fitKey` changes, so the user can pan and zoom freely in between.
//
// The page answers with {type:"ready"}, {type:"coordinate", latitude, longitude}
// (tap on the map), {type:"marker", id} (tap on a request marker) and {type:"error"}.
//
// Markers are plain HTML so Leaflet (OpenStreetMap) and Google draw them identically.

const HEAD = `<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>`;

const CSS = `html,body,#map{height:100%;margin:0;background:#e5e7eb;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
.mk{background:none!important;border:none!important;width:0!important;height:0!important;overflow:visible}
.c,.b{position:absolute;left:0;top:0}.c{transform:translate(-50%,-50%)}.b{transform:translate(-50%,-100%)}
.me{position:relative;width:20px;height:20px}
.me i{position:absolute;inset:-14px;border-radius:50%;background:rgba(37,99,235,.22);animation:pulse 2s ease-out infinite}
.me b{position:absolute;inset:0;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)}
@keyframes pulse{0%{transform:scale(.5);opacity:1}100%{transform:scale(1.6);opacity:0}}
.drv{width:30px;height:30px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.drv.hl{width:38px;height:38px;box-shadow:0 0 0 7px rgba(132,204,22,.35),0 2px 8px rgba(0,0,0,.35)}
.drv svg{display:block;transition:transform .8s linear}
.tag{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:4px;background:#111827;color:#fff;font-size:11px;font-weight:600;padding:2px 7px;border-radius:7px;white-space:nowrap}
.pin{display:flex;flex-direction:column;align-items:center}
.pin .h{width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.pin .s{width:3px;height:10px;background:#111827;border-radius:2px}
.pin .lbl{margin-bottom:4px;background:#fff;color:#111827;font-size:11px;font-weight:700;padding:3px 8px;border-radius:8px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.25);max-width:180px;overflow:hidden;text-overflow:ellipsis}
.req{display:flex;flex-direction:column;align-items:center;cursor:pointer}
.req .h{background:#E63946;color:#fff;font-size:12px;font-weight:700;padding:6px 10px;border-radius:16px;border:2px solid #fff;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;gap:5px}
.req .t{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #E63946;margin-top:-1px}
.req.sel .h{background:#111827;transform:scale(1.15)}.req.sel .t{border-top-color:#111827}
.leaflet-control-attribution{font-size:9px}`;

const ICONS = {
  arrow: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2l7 18-7-4-7 4z" fill="#fff"/></svg>`,
  person: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg>`,
  dot: `<svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="8" fill="#fff"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" width="15" height="15" fill="#fff"><path d="M5 3h2v18H5zM8 4h11l-3 4 3 4H8z"/></svg>`,
};

// Provider-independent part. Expects an adapter A = {marker, route, fit, controls}.
const ENGINE = `var ICON=${JSON.stringify(ICONS)};
var M={},ready=false,last=null,lastSent='',fitted=false,lastFitKey=null;
function send(v){try{window.ReactNativeWebView.postMessage(JSON.stringify(v));}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function num(v){v=Number(v);return isFinite(v)?v:null;}
function ok(p){return p&&num(p.latitude)!==null&&num(p.longitude)!==null;}
function html(kind,o){
 if(kind==='me')return '<div class="c"><div class="me"><i></i><b></b></div></div>';
 if(kind==='driver'){var h=num(o.heading);return '<div class="c"><div class="drv'+(o.highlight?' hl':'')+'" style="background:'+esc(o.color||'#111827')+'">'+(h===null?ICON.dot:'<div style="transform:rotate('+h+'deg)">'+ICON.arrow+'</div>')+'</div>'+(o.label?'<div class="tag">'+esc(o.label)+'</div>':'')+'</div>';}
 if(kind==='pickup'||kind==='dest')return '<div class="b"><div class="pin">'+(o.label?'<div class="lbl">'+esc(o.label)+'</div>':'')+'<div class="h" style="background:'+(kind==='pickup'?'#16a34a':'#E63946')+'">'+(kind==='pickup'?ICON.person:ICON.flag)+'</div><div class="s"></div></div></div>';
 return '<div class="b"><div class="req'+(o.selected?' sel':'')+'"><div class="h">'+ICON.person+esc(o.label||'')+'</div><div class="t"></div></div></div>';
}
function glide(h,lat,lng){
 var from=h.cur||[lat,lng];h.to=[lat,lng];
 var d=Math.abs(from[0]-lat)+Math.abs(from[1]-lng);
 if(h.anim)cancelAnimationFrame(h.anim);
 if(d<1e-7)return;
 if(d>0.05){h.set(lat,lng);h.cur=[lat,lng];return;}
 var t0=performance.now(),dur=1200;
 function step(now){var k=Math.min(1,(now-t0)/dur);k=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;var a=from[0]+(lat-from[0])*k,b=from[1]+(lng-from[1])*k;h.set(a,b);h.cur=[a,b];if(k<1)h.anim=requestAnimationFrame(step);}
 h.anim=requestAnimationFrame(step);
}
function sync(list){
 var seen={};
 list.forEach(function(it){
  seen[it.key]=1;var h=M[it.key];
  if(!h){h=M[it.key]=A.marker(it.lat,it.lng,it.html,it.z,it.id!=null?function(){send({type:'marker',id:String(it.id)});}:null);h.cur=[it.lat,it.lng];h.html=it.html;return;}
  if(h.html!==it.html){h.setHtml(it.html,it.z);h.html=it.html;}
  glide(h,it.lat,it.lng);
 });
 Object.keys(M).forEach(function(k){if(!seen[k]){if(M[k].anim)cancelAnimationFrame(M[k].anim);M[k].remove();delete M[k];}});
}
function render(d){
 var list=[];
 (d.points||[]).forEach(function(p,i){if(ok(p))list.push({key:'p:'+(p.id||i),id:p.id||String(i),lat:+p.latitude,lng:+p.longitude,html:html('point',p),z:p.selected?900:650});});
 if(ok(d.pickup))list.push({key:'pickup',lat:+d.pickup.latitude,lng:+d.pickup.longitude,html:html('pickup',d.pickup),z:600});
 if(ok(d.destination))list.push({key:'dest',lat:+d.destination.latitude,lng:+d.destination.longitude,html:html('dest',d.destination),z:600});
 (d.drivers||[]).forEach(function(p,i){if(ok(p))list.push({key:'d:'+(p.id||i),lat:+p.latitude,lng:+p.longitude,html:html('driver',p),z:p.highlight?800:700});});
 if(ok(d.me))list.push({key:'me',lat:+d.me.latitude,lng:+d.me.longitude,html:html('me',d.me),z:1000});
 sync(list);
 A.route((d.route||[]).filter(ok).map(function(p){return[+p.latitude,+p.longitude];}),d.routeColor||'#84cc16');
 A.controls(!!d.zoomControls);
 var key=d.fitKey==null?'':String(d.fitKey);
 if(!fitted||key!==lastFitKey){fitted=true;lastFitKey=key;fit(d);}
}
function fit(d){
 var pts=[];
 [d.me,d.pickup,d.destination].forEach(function(p){if(ok(p))pts.push(p);});
 (d.drivers||[]).forEach(function(p){if((p.highlight||d.fitDrivers)&&ok(p))pts.push(p);});
 (d.points||[]).forEach(function(p){if(ok(p))pts.push(p);});
 (d.route||[]).forEach(function(p){if(ok(p))pts.push(p);});
 if(!pts.length&&ok(d.center))pts.push(d.center);
 if(!pts.length)return;
 A.fit(pts.map(function(p){return[+p.latitude,+p.longitude];}),d.padding||{},d.zoom||16);
}
function update(d){last=d;if(ready)render(d);}
function onReady(){ready=true;if(last)render(last);send({type:'ready'});}
function receive(event){try{var s=typeof event.data==='string'?event.data:JSON.stringify(event.data);if(s===lastSent)return;var v=JSON.parse(s);if(v&&v.type==='update'){lastSent=s;update(v.data);}}catch(_){}}
document.addEventListener('message',receive);window.addEventListener('message',receive);
function pad(p){return{top:num(p.top)||40,right:num(p.right)||40,bottom:num(p.bottom)||40,left:num(p.left)||40};}`;

const LEAFLET = `var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([-1.9536,30.0606],14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
var zoomCtl=L.control.zoom({position:'bottomright'}),zoomOn=false,casing=null,line=null;
function icon(h){return L.divIcon({html:h,className:'mk',iconSize:null});}
var A={
 marker:function(lat,lng,h,z,click){var m=L.marker([lat,lng],{icon:icon(h),zIndexOffset:z,keyboard:false}).addTo(map);if(click)m.on('click',click);
  return{set:function(a,b){m.setLatLng([a,b]);},setHtml:function(h2,z2){m.setIcon(icon(h2));m.setZIndexOffset(z2);},remove:function(){map.removeLayer(m);}};},
 route:function(pts,color){
  if(pts.length<2){if(line){map.removeLayer(line);map.removeLayer(casing);line=casing=null;}return;}
  if(!line){casing=L.polyline(pts,{color:'#ffffff',weight:9,opacity:.9}).addTo(map);line=L.polyline(pts,{color:color,weight:5,opacity:.95}).addTo(map);}
  else{casing.setLatLngs(pts);line.setLatLngs(pts);line.setStyle({color:color});}
 },
 fit:function(pts,p,zoom){p=pad(p);
  if(pts.length===1){map.setView(pts[0],zoom,{animate:false});map.panBy([(p.right-p.left)/2,(p.bottom-p.top)/2],{animate:false});return;}
  map.fitBounds(pts,{paddingTopLeft:[p.left,p.top],paddingBottomRight:[p.right,p.bottom],maxZoom:17,animate:false});
 },
 controls:function(on){if(on===zoomOn)return;zoomOn=on;if(on)zoomCtl.addTo(map);else zoomCtl.remove();}
};
map.on('click',function(e){send({type:'coordinate',latitude:e.latlng.lat,longitude:e.latlng.lng});});
onReady();`;

const GOOGLE = `var map,line,casing;
window.gm_authFailure=function(){fail('Google Maps authorization failed. Enable Maps JavaScript API and verify the API key restrictions.');};
function fail(message){var el=document.getElementById('message');el.style.display='flex';el.textContent=message;send({type:'error',message:message});}
var A;
function initMap(){try{
 map=new google.maps.Map(document.getElementById('map'),{center:{lat:-1.9536,lng:30.0606},zoom:14,disableDefaultUI:true,clickableIcons:false,gestureHandling:'greedy'});
 function Html(lat,lng,h,z,click){this.pos=new google.maps.LatLng(lat,lng);this.h=h;this.z=z;this.click=click;this.div=null;this.setMap(map);}
 Html.prototype=new google.maps.OverlayView();
 Html.prototype.onAdd=function(){var d=this.div=document.createElement('div');d.className='mk';d.style.position='absolute';d.style.zIndex=this.z;d.innerHTML=this.h;
  if(this.click){var c=this.click;d.style.cursor='pointer';d.addEventListener('click',function(e){e.stopPropagation();c();});google.maps.OverlayView.preventMapHitsAndGesturesFrom(d);}
  this.getPanes().overlayMouseTarget.appendChild(d);};
 Html.prototype.draw=function(){var p=this.getProjection()&&this.getProjection().fromLatLngToDivPixel(this.pos);if(p&&this.div){this.div.style.left=p.x+'px';this.div.style.top=p.y+'px';}};
 Html.prototype.onRemove=function(){if(this.div){this.div.remove();this.div=null;}};
 A={
  marker:function(lat,lng,h,z,click){var o=new Html(lat,lng,h,z,click);
   return{set:function(a,b){o.pos=new google.maps.LatLng(a,b);o.draw();},setHtml:function(h2,z2){o.h=h2;o.z=z2;if(o.div){o.div.innerHTML=h2;o.div.style.zIndex=z2;}},remove:function(){o.setMap(null);}};},
  route:function(pts,color){var path=pts.map(function(p){return{lat:p[0],lng:p[1]};});
   if(path.length<2){if(line){line.setMap(null);casing.setMap(null);line=casing=null;}return;}
   if(!line){casing=new google.maps.Polyline({map:map,path:path,strokeColor:'#ffffff',strokeWeight:9,strokeOpacity:.9});line=new google.maps.Polyline({map:map,path:path,strokeColor:color,strokeWeight:5,strokeOpacity:.95});}
   else{casing.setPath(path);line.setPath(path);line.setOptions({strokeColor:color});}},
  fit:function(pts,p,zoom){p=pad(p);
   if(pts.length===1){map.setCenter({lat:pts[0][0],lng:pts[0][1]});map.setZoom(zoom);map.panBy((p.right-p.left)/2,(p.bottom-p.top)/2);return;}
   var b=new google.maps.LatLngBounds();pts.forEach(function(q){b.extend({lat:q[0],lng:q[1]});});map.fitBounds(b,p);
   google.maps.event.addListenerOnce(map,'idle',function(){if(map.getZoom()>17)map.setZoom(17);});},
  controls:function(on){map.setOptions({zoomControl:on});}
 };
 map.addListener('click',function(e){send({type:'coordinate',latitude:e.latLng.lat(),longitude:e.latLng.lng()});});
 onReady();
}catch(error){fail(error&&error.message?error.message:'Google Maps could not load.');}}`;

export const OPEN_STREET_MAP_HTML = `<!doctype html><html><head>${HEAD}<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>${CSS}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>${ENGINE}
${LEAFLET}</script></body></html>`;

export function googleMapHtml(apiKey: string) {
  const key = encodeURIComponent(apiKey);
  return `<!doctype html><html><head>${HEAD}<style>${CSS}#message{display:none;position:absolute;inset:0;padding:32px;background:#fff;color:#111827;font:15px sans-serif;align-items:center;justify-content:center;text-align:center}</style></head><body><div id="map"></div><div id="message"></div><script>${ENGINE}
${GOOGLE}</script><script async defer src="https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap"></script></body></html>`;
}
