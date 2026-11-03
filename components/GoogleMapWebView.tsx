import { useMemo } from "react";
import { MapFrame } from "@/components/map/MapFrame";
import { googleMapHtml } from "@/components/map/mapHtml";
import { handleMapMessage, mapData, type LiveMapProps } from "@/components/map/types";

/** Google Maps live map. Same props as OpenStreetMapView. */
export function GoogleMapWebView({ apiKey, ...props }: LiveMapProps & { apiKey: string }) {
  const html = useMemo(() => googleMapHtml(apiKey), [apiKey]);
  return <MapFrame sameOrigin html={html} data={mapData(props)} onMessage={(m) => handleMapMessage(m, props)} onLoadError={() => props.onError?.("Google Maps network request failed.")} />;
}
