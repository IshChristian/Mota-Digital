import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { RideMap } from '@/components/RideMap';
import { ridesApi } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

export default function RideRequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const query = useQuery({ queryKey: ['ride-request', id], queryFn: async () => (await ridesApi.getRideStatus(id)).data, enabled: !!id });
  const ride: any = query.data;
  const pickup = ride?.pickup ? { latitude: ride.pickup.latitude ?? ride.pickup.lat, longitude: ride.pickup.longitude ?? ride.pickup.lng } : undefined;
  const destination = ride?.destination ? { latitude: ride.destination.latitude ?? ride.destination.lat, longitude: ride.destination.longitude ?? ride.destination.lng } : undefined;

  const act = async (accept: boolean) => {
    setSubmitting(true);
    try {
      if (accept) {
        await ridesApi.acceptRide(id);
        router.replace({ pathname: '/active-ride', params: { rideId: id } } as any);
      } else {
        await ridesApi.declineRide(id);
        router.back();
      }
    } catch (error: any) {
      try {
        const current = (await ridesApi.getRideStatus(id)).data;
        if (current?.driverId && ['accepted','approaching','arrived','start_requested','in_progress','stop_requested','awaiting_payment'].includes(current.rideStatus)) {
          router.replace({ pathname: '/active-ride', params: { rideId: id } } as any);
          return;
        }
      } catch { /* Show the original server error below. */ }
      Alert.alert('Ride request', error.response?.data?.message || 'Unable to update this ride. Refresh to see its current timeline.');
      void query.refetch();
    } finally { setSubmitting(false); }
  };

  if (query.isLoading || !ride) return <ActivityIndicator style={{ flex: 1 }} />;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Ride request</Text>
      <View style={styles.map}>{pickup ? <RideMap center={pickup} pickup={pickup} destination={destination} /> : null}</View>
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.place, { color: colors.textPrimary }]}>{ride.pickup?.name || ride.pickup?.address || 'Pickup'}</Text>
        <Text style={{ color: colors.textSecondary }}>to {ride.destination?.name || ride.destination?.address || 'Destination'}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{ride.estimatedDistanceKm || '—'} km · {ride.estimatedDurationMin || '—'} min · {ride.passengers || 1} passenger(s)</Text>
        <Text style={[styles.fare, { color: colors.primary }]}>{Number(ride.offeredFare || 0).toLocaleString()} RWF</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity disabled={submitting} style={[styles.button, styles.decline]} onPress={() => act(false)}><Text style={styles.buttonText}>Decline</Text></TouchableOpacity>
        <TouchableOpacity disabled={submitting} style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => act(true)}><Text style={styles.buttonText}>{submitting ? 'Working…' : 'Accept'}</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 18, paddingTop: 54, flexGrow: 1 }, title: { fontSize: 26, fontWeight: '800', marginBottom: 14 },
  map: { height: 340, borderRadius: 18, overflow: 'hidden' }, card: { padding: 18, borderRadius: 16, marginTop: 16 },
  place: { fontSize: 18, fontWeight: '800' }, meta: { marginTop: 12 }, fare: { fontSize: 24, fontWeight: '800', marginTop: 14 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 }, button: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 12 },
  decline: { backgroundColor: '#6B7280' }, buttonText: { color: '#fff', fontWeight: '800' },
});
