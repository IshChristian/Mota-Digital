import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type Coordinate = { latitude: number; longitude: number };
type MapPoint = Coordinate & { label?: string };

type Props = {
  apiKey: string;
  center: Coordinate;
  destination?: Coordinate | null;
  drivers?: MapPoint[];
  route?: Coordinate[];
  onCoordinatePress?: (coordinate: Coordinate) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
};

export function GoogleMapWebView({ apiKey, center, destination, drivers = [], route = [], onCoordinatePress, onReady, onError }: Props) {
  const html = useMemo(() => {
    const payload = JSON.stringify({ center, destination, drivers, route });
    const key = encodeURIComponent(apiKey);
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><style>html,body,#map{height:100%;margin:0;background:#e5e7eb}#message{display:none;position:absolute;inset:0;padding:32px;background:#fff;color:#111827;font:15px sans-serif;align-items:center;justify-content:center;text-align:center}</style></head><body><div id="map"></div><div id="message"></div><script>
      const data=${payload};
      function send(value){window.ReactNativeWebView.postMessage(JSON.stringify(value));}
      function fail(message){document.getElementById('message').style.display='flex';document.getElementById('message').textContent=message;send({type:'error',message});}
      window.gm_authFailure=()=>fail('Google Maps authorization failed. Enable Maps JavaScript API and verify the API key restrictions.');
      function initMap(){try{
        const map=new google.maps.Map(document.getElementById('map'),{center:{lat:data.center.latitude,lng:data.center.longitude},zoom:15,mapTypeControl:false,streetViewControl:false,fullscreenControl:false});
        new google.maps.Marker({map,position:{lat:data.center.latitude,lng:data.center.longitude},title:'Your location'});
        if(data.destination)new google.maps.Marker({map,position:{lat:data.destination.latitude,lng:data.destination.longitude},title:'Destination'});
        data.drivers.forEach(d=>new google.maps.Marker({map,position:{lat:d.latitude,lng:d.longitude},title:d.label||'Driver'}));
        if(data.route.length>1){const path=data.route.map(p=>({lat:p.latitude,lng:p.longitude}));new google.maps.Polyline({map,path,strokeColor:'#84cc16',strokeWeight:5});const bounds=new google.maps.LatLngBounds();path.forEach(p=>bounds.extend(p));map.fitBounds(bounds,48);}
        map.addListener('click',e=>send({type:'coordinate',latitude:e.latLng.lat(),longitude:e.latLng.lng()}));send({type:'ready'});
      }catch(error){fail(error && error.message ? error.message : 'Google Maps could not load.');}}
    </script><script async defer src="https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap"></script></body></html>`;
  }, [apiKey, center.latitude, center.longitude, destination?.latitude, destination?.longitude, drivers, route]);

  return <WebView source={{ html }} style={styles.map} originWhitelist={['*']} javaScriptEnabled domStorageEnabled onMessage={(event) => { try { const message = JSON.parse(event.nativeEvent.data); if (message.type === 'ready') onReady?.(); if (message.type === 'error') onError?.(message.message); if (message.type === 'coordinate') onCoordinatePress?.({ latitude: message.latitude, longitude: message.longitude }); } catch { /* Ignore unrelated messages. */ } }} onError={() => onError?.('Google Maps network request failed.')} />;
}

const styles = StyleSheet.create({ map: { flex: 1, backgroundColor: '#e5e7eb' } });
