import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

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

export function RideMap({ center, pickup, destination, driver, nearbyDrivers = [], onPress, onRoute }: Props) {
  const [provider, setProvider] = useState<Provider>(GOOGLE_KEY ? 'google' : 'openstreetmap');
  const routeOrigin = driver || pickup;
  const route = useMemo(() => routeOrigin && destination ? [routeOrigin, destination] : [], [routeOrigin, destination]);

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={provider === 'google' ? PROVIDER_GOOGLE : undefined}
        mapType={provider === 'openstreetmap' ? 'none' : 'standard'}
        initialRegion={{ ...center, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
        onPress={onPress}
        showsUserLocation
      >
        {provider === 'openstreetmap' ? (
          <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
        ) : null}
        {pickup ? <Marker coordinate={pickup} title="Pickup" pinColor="#2563EB" /> : null}
        {destination ? <Marker coordinate={destination} title="Destination" pinColor="#10B981" /> : null}
        {driver ? <Marker coordinate={driver} title="Driver"><Text style={styles.motor}>🏍️</Text></Marker> : null}
        {nearbyDrivers.map((item) => <Marker key={item.id} coordinate={item} title="Available driver"><Text style={styles.motor}>🏍️</Text></Marker>)}
        {route.length === 2 && provider === 'google' && GOOGLE_KEY ? (
          <MapViewDirections
            origin={route[0]}
            destination={route[1]}
            apikey={GOOGLE_KEY}
            strokeWidth={5}
            strokeColor="#DC2626"
            onReady={(result) => onRoute?.(result.distance, result.duration)}
          />
        ) : route.length === 2 ? <Polyline coordinates={route} strokeWidth={5} strokeColor="#DC2626" /> : null}
      </MapView>
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
});
