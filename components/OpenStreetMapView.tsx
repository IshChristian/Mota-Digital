import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

type Coordinate = { latitude: number; longitude: number };
type MapPoint = Coordinate & { label?: string; color?: string };
type Props = { center: Coordinate; destination?: Coordinate | null; drivers?: MapPoint[]; route?: Coordinate[]; onCoordinatePress?: (coordinate: Coordinate) => void; onReady?: () => void };

const HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>html,body,#map{height:100%;margin:0;background:#e5e7eb}.leaflet-control-attribution{font-size:9px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const map=L.map('map',{zoomControl:true,attributionControl:true}).setView([-1.9536,30.0606],15);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);const layers=L.layerGroup().addTo(map);let firstUpdate=true;
function update(data){layers.clearLayers();const c=[data.center.latitude,data.center.longitude];L.circleMarker(c,{radius:9,color:'#fff',weight:4,fillColor:'#6366f1',fillOpacity:1}).addTo(layers).bindTooltip('Your location');if(data.destination)L.marker([data.destination.latitude,data.destination.longitude]).addTo(layers).bindTooltip('Destination');data.drivers.forEach(d=>L.circleMarker([d.latitude,d.longitude],{radius:10,color:'#fff',weight:3,fillColor:d.color||'#84cc16',fillOpacity:1}).addTo(layers).bindTooltip(d.label||'Driver'));if(data.route.length>1){const points=data.route.map(p=>[p.latitude,p.longitude]);L.polyline(points,{color:'#84cc16',weight:5,opacity:.95}).addTo(layers);if(firstUpdate)map.fitBounds(points,{padding:[48,48]});}else if(firstUpdate)map.setView(c,15);firstUpdate=false;}
function receive(event){try{const value=typeof event.data==='string'?JSON.parse(event.data):event.data;if(value&&value.type==='update')update(value.data);}catch(_){}}document.addEventListener('message',receive);window.addEventListener('message',receive);map.on('click',e=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'coordinate',latitude:e.latlng.lat,longitude:e.latlng.lng})));window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
</script></body></html>`;

export function OpenStreetMapView({ center, destination, drivers = [], route = [], onCoordinatePress, onReady }: Props) {
  const webView = useRef<WebView>(null);
  const ready = useRef(false);
  const data = useMemo(() => ({ center, destination: destination || null, drivers, route }), [center, destination, drivers, route]);
  const sendUpdate = useCallback(() => webView.current?.postMessage(JSON.stringify({ type: "update", data })), [data]);
  useEffect(() => { if (ready.current) sendUpdate(); }, [sendUpdate]);
  return <WebView ref={webView} source={{ html: HTML }} style={styles.map} originWhitelist={["*"]} javaScriptEnabled domStorageEnabled mixedContentMode="never" onMessage={(event) => { try { const message = JSON.parse(event.nativeEvent.data); if (message.type === "ready") { ready.current = true; sendUpdate(); onReady?.(); } else if (message.type === "coordinate") onCoordinatePress?.({ latitude: message.latitude, longitude: message.longitude }); } catch { /* Ignore unrelated web messages. */ } }} />;
}

const styles = StyleSheet.create({ map: { flex: 1, backgroundColor: "#e5e7eb" } });
