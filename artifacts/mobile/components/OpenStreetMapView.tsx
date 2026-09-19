import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type Coordinate = { latitude: number; longitude: number };
type MapPoint = Coordinate & { label?: string; color?: string };

type Props = {
  center: Coordinate;
  destination?: Coordinate | null;
  drivers?: MapPoint[];
  route?: Coordinate[];
  onCoordinatePress?: (coordinate: Coordinate) => void;
  onReady?: () => void;
};

export function OpenStreetMapView({ center, destination, drivers = [], route = [], onCoordinatePress, onReady }: Props) {
  const html = useMemo(() => {
    const safeCenter = JSON.stringify([center.latitude, center.longitude]);
    const safeDestination = destination ? JSON.stringify([destination.latitude, destination.longitude]) : 'null';
    const safeDrivers = JSON.stringify(drivers.map(point => ({ lat: point.latitude, lng: point.longitude, label: point.label || 'Driver', color: point.color || '#84cc16' })));
    const safeRoute = JSON.stringify(route.map(point => [point.latitude, point.longitude]));
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>html,body,#map{height:100%;margin:0;background:#e5e7eb}.leaflet-control-attribution{font-size:9px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
      const center=${safeCenter}, destination=${safeDestination}, drivers=${safeDrivers}, route=${safeRoute};
      const map=L.map('map',{zoomControl:true,attributionControl:true}).setView(center,15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
      L.circleMarker(center,{radius:9,color:'#fff',weight:4,fillColor:'#6366f1',fillOpacity:1}).addTo(map).bindTooltip('Your location');
      if(destination)L.marker(destination).addTo(map).bindTooltip('Destination');
      drivers.forEach(d=>L.circleMarker([d.lat,d.lng],{radius:10,color:'#fff',weight:3,fillColor:d.color,fillOpacity:1}).addTo(map).bindTooltip(d.label));
      if(route.length>1){L.polyline(route,{color:'#84cc16',weight:5,opacity:.95}).addTo(map);map.fitBounds(route,{padding:[48,48]});}
      map.on('click',e=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'coordinate',latitude:e.latlng.lat,longitude:e.latlng.lng})));
    </script></body></html>`;
  }, [center.latitude, center.longitude, destination?.latitude, destination?.longitude, drivers, route]);

  return <WebView source={{ html }} style={styles.map} originWhitelist={['*']} javaScriptEnabled domStorageEnabled mixedContentMode="never" onLoadEnd={onReady} onMessage={(event) => { try { const message = JSON.parse(event.nativeEvent.data); if (message.type === 'coordinate') onCoordinatePress?.({ latitude: message.latitude, longitude: message.longitude }); } catch { /* Ignore unrelated web messages. */ } }} />;
}

const styles = StyleSheet.create({ map: { flex: 1, backgroundColor: '#e5e7eb' } });
