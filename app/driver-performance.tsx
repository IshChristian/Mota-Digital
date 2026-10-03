import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { PassengerSettingsScreen } from '@/components/PassengerSettingsScreen';
import { driverApi, getApiErrorMessage } from '@/services/api';

type Performance = { days: number; from: string; asOf: string; offers: number; accepted: number; completed: number; driverCancelled: number; passengerCancelled: number; acceptanceRate: number | null; cancellationRate: number | null };
export default function DriverPerformance() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const allowed = user?.role === 'driver';
  const [reloadKey, setReloadKey] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!allowed) return () => { active = false; };
    setLoading(true); setError(''); setData(null);
    driverApi.getPerformance(days).then(response => { if (active) setData(response.data.data); }).catch(e => { if (active) setError(getApiErrorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, days, reloadKey]));
  const card = { padding: 18, borderRadius: 18, backgroundColor: colors.backgroundCard, gap: 10 } as const;
  return <PassengerSettingsScreen title="Driving performance">
    {!allowed ? <Text style={{ color: colors.textSecondary }}>Performance is available to driver accounts.</Text> : <>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>{[7, 30, 90].map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: value === days }} onPress={() => setDays(value)} style={{ padding: 14, borderRadius: 12, borderWidth: 2, borderColor: value === days ? colors.primary : colors.border, backgroundColor: value === days ? colors.primary : colors.backgroundCard }}><Text style={{ color: value === days ? '#fff' : colors.textPrimary, fontWeight: '700' }}>{value} days</Text></TouchableOpacity>)}</View>
      {loading && <ActivityIndicator accessibilityLabel="Loading performance" color={colors.primary} />}
      {!!error && <View style={card}><Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text><TouchableOpacity accessibilityRole="button" disabled={loading} onPress={() => setReloadKey(value => value + 1)}><Text style={{ color: colors.primary }}>Retry</Text></TouchableOpacity></View>}
      {data && <>
        <Text style={{ color: colors.textSecondary }}>Offers received from {new Date(data.from).toLocaleDateString()} through {new Date(data.asOf).toLocaleString()}</Text>
        <View style={{ ...card, flexDirection: 'row', flexWrap: 'wrap' }}>{[['Offers received', data.offers], ['Accepted', data.accepted], ['Completed', data.completed], ['You cancelled', data.driverCancelled], ['Passenger cancelled', data.passengerCancelled]].map(([label, count]) => <View key={String(label)} style={{ flexBasis: 130, flexGrow: 1, minWidth: 0, gap: 4 }}><Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '700' }}>{Number(count).toLocaleString()}</Text><Text style={{ color: colors.textSecondary }}>{label}</Text></View>)}</View>
        <View style={card}><Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }}>Acceptance rate · {data.acceptanceRate === null ? '—' : `${data.acceptanceRate}%`}</Text><Text style={{ color: colors.textSecondary }}>{data.accepted} accepted / {data.offers} received offers</Text></View>
        <View style={card}><Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }}>Cancellation rate · {data.cancellationRate === null ? '—' : `${data.cancellationRate}%`}</Text><Text style={{ color: colors.textSecondary }}>{data.driverCancelled} driver cancellations / {data.accepted} accepted offers. Passenger cancellations do not increase your rate.</Text></View>
        <View style={card}><Text style={{ color: colors.textPrimary, fontWeight: '700' }}>What these numbers mean</Text><Text style={{ color: colors.textSecondary }}>Each offer is counted once when this app opens and acknowledges it. All counts use the same group of offers received in the selected rolling period, with their latest ride outcomes. Reopening an offer does not count it again. Offers accepted by another driver remain unaccepted for you.</Text><Text style={{ color: colors.textSecondary }}>Tracking starts with this app update. Older rides and offers that could not be acknowledged are excluded. A dash means there is no denominator yet. These statistics do not change your tier or impose penalties.</Text>{data.offers === 0 && <Text style={{ color: colors.textSecondary }}>No tracked offers yet. Your results will appear after new offers arrive.</Text>}</View>
      </>}
    </>}
  </PassengerSettingsScreen>;
}
