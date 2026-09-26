import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

type Coordinate = { latitude: number; longitude: number };
type MapPoint = Coordinate & { label?: string };
type Props = { apiKey: string; center: Coordinate; destination?: Coordinate | null; drivers?: MapPoint[]; route?: Coordinate[]; onCoordinatePress?: (coordinate: Coordinate) => void; onReady?: () => void; onError?: (message: string) => void };

function mapHtml(apiKey: string) {
  const key = encodeURIComponent(apiKey);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><style>html,body,#map{height:100%;margin:0;background:#e5e7eb}#message{display:none;position:absolute;inset:0;padding:32px;background:#fff;color:#111827;font:15px sans-serif;align-items:center;justify-content:center;text-align:center}</style></head><body><div id="map"></div><div id="message"></div><script>
let map,markers=[],routeLine,firstUpdate=true,pending=null;function send(v){window.ReactNativeWebView.postMessage(JSON.stringify(v));}function fail(message){document.getElementById('message').style.display='flex';document.getElementById('message').textContent=message;send({type:'error',message});}window.gm_authFailure=()=>fail('Google Maps authorization failed. Enable Maps JavaScript API and verify the API key restrictions.');
function update(data){if(!map){pending=data;return;}markers.forEach(m=>m.setMap(null));markers=[];if(routeLine)routeLine.setMap(null);const c={lat:data.center.latitude,lng:data.center.longitude};markers.push(new google.maps.Marker({map,position:c,title:'Your location'}));if(data.destination)markers.push(new google.maps.Marker({map,position:{lat:data.destination.latitude,lng:data.destination.longitude},title:'Destination'}));data.drivers.forEach(d=>markers.push(new google.maps.Marker({map,position:{lat:d.latitude,lng:d.longitude},title:d.label||'Driver'})));if(data.route.length>1){const path=data.route.map(p=>({lat:p.latitude,lng:p.longitude}));routeLine=new google.maps.Polyline({map,path,strokeColor:'#84cc16',strokeWeight:5});if(firstUpdate){const b=new google.maps.LatLngBounds();path.forEach(p=>b.extend(p));map.fitBounds(b,48);}}else if(firstUpdate)map.setCenter(c);firstUpdate=false;}
function receive(event){try{const value=typeof event.data==='string'?JSON.parse(event.data):event.data;if(value&&value.type==='update')update(value.data);}catch(_){}}document.addEventListener('message',receive);window.addEventListener('message',receive);
function initMap(){try{map=new google.maps.Map(document.getElementById('map'),{center:{lat:-1.9536,lng:30.0606},zoom:15,mapTypeControl:false,streetViewControl:false,fullscreenControl:false});map.addListener('click',e=>send({type:'coordinate',latitude:e.latLng.lat(),longitude:e.latLng.lng()}));if(pending)update(pending);send({type:'ready'});}catch(error){fail(error&&error.message?error.message:'Google Maps could not load.');}}
</script><script async defer src="https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap"></script></body></html>`;
}

export function GoogleMapWebView({ apiKey, center, destination, drivers = [], route = [], onCoordinatePress, onReady, onError }: Props) {
  const webView = useRef<WebView>(null);
  const ready = useRef(false);
  const html = useMemo(() => mapHtml(apiKey), [apiKey]);
  const data = useMemo(() => ({ center, destination: destination || null, drivers, route }), [center, destination, drivers, route]);
  const sendUpdate = useCallback(() => webView.current?.postMessage(JSON.stringify({ type: "update", data })), [data]);
  useEffect(() => { if (ready.current) sendUpdate(); }, [sendUpdate]);
  return <WebView ref={webView} source={{ html }} style={styles.map} originWhitelist={["*"]} javaScriptEnabled domStorageEnabled onMessage={(event) => { try { const message = JSON.parse(event.nativeEvent.data); if (message.type === "ready") { ready.current = true; sendUpdate(); onReady?.(); } else if (message.type === "error") onError?.(message.message); else if (message.type === "coordinate") onCoordinatePress?.({ latitude: message.latitude, longitude: message.longitude }); } catch { /* Ignore unrelated messages. */ } }} onError={() => onError?.("Google Maps network request failed.")} />;
}

const styles = StyleSheet.create({ map: { flex: 1, backgroundColor: "#e5e7eb" } });
