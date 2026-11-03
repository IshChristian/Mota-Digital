import { MapFrame } from "@/components/map/MapFrame";
import { OPEN_STREET_MAP_HTML } from "@/components/map/mapHtml";
import { handleMapMessage, mapData, type LiveMapProps } from "@/components/map/types";

/** OpenStreetMap (Leaflet) live map. Same props as GoogleMapWebView. */
export function OpenStreetMapView(props: LiveMapProps) {
  return <MapFrame html={OPEN_STREET_MAP_HTML} data={mapData(props)} onMessage={(m) => handleMapMessage(m, props)} />;
}
