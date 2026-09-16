import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { ridesApi } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

export default function DriverRequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const query = useQuery({
    queryKey: ['driver-ride-requests'],
    queryFn: async () => (await ridesApi.getDriverRequests()).data?.data || [],
    refetchInterval: 5000,
  });

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Nearby ride requests</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Requests refresh every five seconds.</Text>
      {query.isLoading ? <ActivityIndicator style={styles.loader} /> : (
        <FlatList
          data={query.data}
          keyExtractor={(item: any) => item._id}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>No nearby requests right now.</Text>}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/ride-request/[id]', params: { id: item._id } } as any)}
            >
              <View style={styles.row}><Feather name="map-pin" size={18} color={colors.primary} /><Text style={[styles.place, { color: colors.textPrimary }]}>{item.pickup?.name || item.pickup?.address || 'Pickup nearby'}</Text></View>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.estimatedDistanceKm || '—'} km · {item.estimatedDurationMin || '—'} min · {item.passengers || 1} passenger(s)</Text>
              <Text style={[styles.fare, { color: colors.primary }]}>{Number(item.offeredFare || 0).toLocaleString()} RWF</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 18, paddingTop: 54 }, title: { fontSize: 26, fontWeight: '800' },
  subtitle: { marginTop: 5, marginBottom: 18 }, loader: { marginTop: 50 }, empty: { textAlign: 'center', marginTop: 50 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  place: { fontSize: 16, fontWeight: '700', flex: 1 }, meta: { marginTop: 10 }, fare: { marginTop: 12, fontSize: 20, fontWeight: '800' },
});
