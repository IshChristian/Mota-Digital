import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { OpenStreetMapView } from '@/components/OpenStreetMapView';
import { GoogleMapWebView } from '@/components/GoogleMapWebView';

export type Coordinate = { latitude: number; longitude: number };
type Provider = 'openstreetmap' | 'google';

type Props = {
  center: Coordinate;
  pickup?: Coordinate;
  destination?: Coordinate;
  driver?: Coordinate;
  nearbyDrivers?: Array<Coordinate & { id: string }>;
  onPress?: (event: any) => void;
  onRoute?: (distanceKm: number, durationMinutes: number) => void;
};

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const OSRM_URL = (process.env.EXPO_PUBLIC_OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');

export function RideMap({ center, pickup, destination, driver, nearbyDrivers = [], onPress, onRoute }: Props) {
  const [provider, setProvider] = useState<Provider>(GOOGLE_KEY ? 'google' : 'openstreetmap');
  const [openRoute, setOpenRoute] = useState<Coordinate[]>([]);
  const [routeUnavailable, setRouteUnavailable] = useState(false);
  const routeOrigin = driver || pickup;
  const route = useMemo(() => routeOrigin && destination ? [routeOrigin, destination] : [], [routeOrigin, destination]);

  useEffect(() => {
    if (route.length !== 2) {
      setOpenRoute([]);
      setRouteUnavailable(false);
      return;
    }

    const controller = new AbortController();
    const [origin, end] = route;
    const url = `${OSRM_URL}/route/v1/driving/${origin.longitude},${origin.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;

    void fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Routing failed (${response.status})`);
        return response.json();
      })
      .then((body) => {
        const selected = body?.routes?.[0];
        const coordinates = selected?.geometry?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) throw new Error('No road route returned');
        setOpenRoute(coordinates.map(([longitude, latitude]: [number, number]) => ({ latitude, longitude })));
        setRouteUnavailable(false);
        onRoute?.(selected.distance / 1000, selected.duration / 60);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setOpenRoute(route);
        setRouteUnavailable(true);
      });

    return () => controller.abort();
  }, [route, onRoute]);

  return (
    <View style={styles.container}>
      {provider === 'openstreetmap' ? <OpenStreetMapView center={center} destination={destination} route={openRoute} drivers={[...(driver ? [{ ...driver, label: 'Driver' }] : []), ...nearbyDrivers.map(item => ({ ...item, label: 'Nearby request' }))]} onCoordinatePress={coordinate => onPress?.({ nativeEvent: { coordinate } })} /> : <GoogleMapWebView apiKey={GOOGLE_KEY} center={center} destination={destination} route={openRoute} drivers={[...(driver ? [{ ...driver, label: 'Driver' }] : []), ...nearbyDrivers.map(item => ({ ...item, label: 'Nearby request' }))]} onCoordinatePress={coordinate => onPress?.({ nativeEvent: { coordinate } })} />}
      <View style={styles.switcher}>
        {(['openstreetmap', 'google'] as Provider[]).map((item) => (
          <TouchableOpacity
            key={item}
            disabled={item === 'google' && !GOOGLE_KEY}
            onPress={() => setProvider(item)}
            style={[styles.option, provider === item && styles.selected, item === 'google' && !GOOGLE_KEY && styles.disabled]}
          >
            <Text style={[styles.label, provider === item && styles.selectedLabel]}>{item === 'google' ? 'Google' : 'OpenMap'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {provider === 'openstreetmap' ? <Text style={styles.attribution}>© OpenStreetMap contributors</Text> : null}
      {routeUnavailable ? <Text style={styles.routeWarning}>Road routing unavailable — showing direct route</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 240 },
  switcher: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 3 },
  option: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  selected: { backgroundColor: '#111827' },
  disabled: { opacity: 0.4 },
  label: { color: '#374151', fontWeight: '600', fontSize: 12 },
  selectedLabel: { color: '#fff' },
  motor: { fontSize: 24 },
  attribution: { position: 'absolute', left: 6, bottom: 4, color: '#111827', backgroundColor: '#FFFFFFCC', fontSize: 9 },
  routeWarning: { position: 'absolute', left: 8, right: 8, bottom: 22, padding: 6, borderRadius: 6, textAlign: 'center', color: '#92400E', backgroundColor: '#FEF3C7EE', fontSize: 11 },
});
