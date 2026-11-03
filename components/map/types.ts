export type Coordinate = { latitude: number; longitude: number };

/** A driver on the map (glides between positions) or a tappable request marker. */
export type MapMarker = Coordinate & { id?: string; label?: string; color?: string; heading?: number | null; highlight?: boolean; selected?: boolean };
export type MapPlace = Coordinate & { label?: string };
export type MapPadding = { top?: number; right?: number; bottom?: number; left?: number };

export type LiveMapProps = {
  /** Where to look when there is nothing else to show. */
  center: Coordinate;
  /** The viewer's own GPS position (blue dot). */
  me?: (Coordinate & { heading?: number | null }) | null;
  pickup?: MapPlace | null;
  destination?: MapPlace | null;
  drivers?: MapMarker[];
  /** Tappable markers, e.g. ride requests; taps call onMarkerPress(id). */
  points?: MapMarker[];
  route?: Coordinate[];
  routeColor?: string;
  /** The map re-frames everything only when this changes, so users can pan freely in between. */
  fitKey?: string | number;
  /** Include every driver (not only highlighted ones) when framing, e.g. available drivers around a passenger. */
  fitDrivers?: boolean;
  /** Space covered by panels over the map, so framing keeps markers visible. */
  padding?: MapPadding;
  zoomControls?: boolean;
  onCoordinatePress?: (coordinate: Coordinate) => void;
  onMarkerPress?: (id: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
};

const point = (p?: Coordinate | null) => p && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)) ? { ...p, latitude: Number(p.latitude), longitude: Number(p.longitude) } : null;

/** Plain, serialisable data for the map page (see mapHtml.ts). */
export function mapData(props: LiveMapProps) {
  return {
    center: point(props.center),
    me: point(props.me),
    pickup: point(props.pickup),
    destination: point(props.destination),
    drivers: (props.drivers || []).map(point).filter(Boolean),
    points: (props.points || []).map(point).filter(Boolean),
    route: (props.route || []).map(point).filter(Boolean),
    routeColor: props.routeColor,
    fitKey: props.fitKey ?? "",
    fitDrivers: props.fitDrivers,
    padding: props.padding,
    zoomControls: props.zoomControls,
  };
}

export type MapMessage = { type: string; [key: string]: unknown };

/** Routes a message from the map page to the matching callback. */
export function handleMapMessage(message: MapMessage, props: LiveMapProps) {
  if (message.type === "ready") props.onReady?.();
  else if (message.type === "error") props.onError?.(String(message.message));
  else if (message.type === "coordinate") props.onCoordinatePress?.({ latitude: Number(message.latitude), longitude: Number(message.longitude) });
  else if (message.type === "marker") props.onMarkerPress?.(String(message.id));
}
