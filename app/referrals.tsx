import { useCallback, useState } from 'react';
import { ActivityIndicator, Share, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PassengerSettingsScreen } from '@/components/PassengerSettingsScreen';
import { useTheme } from '@/context/ThemeContext';
import { referralsApi, getApiErrorMessage } from '@/services/api';
import { showMessage } from '@/components/GlobalAlert';

type Summary = { code: string | null; cashRewardsEligible: boolean; currentReward: number; total: number; pending: number; successful: number; totalEarned: number; page: number; hasMore: boolean; records: Array<{ _id: string; status: string; reward: number; createdAt: string }> };
export default function ReferralsScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try { const response = await referralsApi.getMine(page); setData(response.data.data); }
    catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const card = { padding: 18, borderRadius: 18, backgroundColor: colors.backgroundCard, gap: 12 } as const;
  return <PassengerSettingsScreen title="Invite friends">
    {loading && <ActivityIndicator accessibilityLabel="Loading referrals" color={colors.primary} />}
    {!!error && <View style={card}><Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void load(data?.page || 1)}><Text style={{ color: colors.primary }}>Retry</Text></TouchableOpacity></View>}
    {data && <>
      <View style={card}>
        <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700' }}>Your MOTA referral code</Text>
        <Text selectable style={{ color: colors.primary, fontSize: 28, fontWeight: '800' }}>{data.code || 'Code unavailable'}</Text>
        <Text style={{ color: colors.textSecondary }}>Friends enter this code in the optional referral field when registering. The code must be used at signup.</Text>
        <TouchableOpacity accessibilityRole="button" disabled={!data.code} onPress={async () => { try { await Share.share({ message: `Join MOTA and enter my referral code ${data.code} when you register. Passenger registration is free.` }); } catch { showMessage('Could not share the code. Please retry.'); } }} style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', opacity: data.code ? 1 : 0.5 }}><Text style={{ color: '#fff', fontWeight: '700' }}>Share code</Text></TouchableOpacity>
      </View>
      <View style={card}>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>How referrals work</Text>
        <Text style={{ color: colors.textSecondary }}>{data.cashRewardsEligible ? `New eligible driver referrals currently earn ${data.currentReward.toLocaleString()} RWF. The amount is fixed when they register. Rewards are paid to your wallet after phone verification, approved KYC, registration fee payment and registration approval. Pending is not a paid reward. Older pending invitations may require support review.` : 'You can invite drivers and passengers and track their verification. Cash referral rewards currently apply to driver and agent referrers who invite drivers.'}</Text>
        {data.cashRewardsEligible && <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={async () => { setLoading(true); try { const response = await referralsApi.checkRewards(); setData(response.data.data); showMessage(response.data.message); } catch (e) { showMessage(getApiErrorMessage(e)); } finally { setLoading(false); } }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Check eligible rewards</Text></TouchableOpacity>}
        <Text style={{ color: colors.textSecondary }}>Passenger invitations have no cash reward. Passengers never pay a registration fee.</Text>
      </View>
      <View style={{ ...card, flexDirection: 'row', flexWrap: 'wrap' }}>{[['Invited', data.total], ['Pending', data.pending], ['Completed', data.successful], ['Paid (RWF)', data.totalEarned]].map(([label, value]) => <View key={String(label)} style={{ flexGrow: 1, flexBasis: 110, minWidth: 0, gap: 4 }}><Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700' }}>{Number(value).toLocaleString()}</Text><Text style={{ color: colors.textSecondary }}>{label}</Text></View>)}</View>
      <View style={card}><Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Referral history</Text>
        {!data.records.length && <Text style={{ color: colors.textSecondary }}>No invitations yet. Share your code to get started.</Text>}
        {data.records.map((item, index) => <View key={item._id} style={{ paddingVertical: 12, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Invitation {(data.page - 1) * 20 + index + 1} · {item.status === 'successful' ? 'Completed' : 'Pending verification'}</Text><Text style={{ color: colors.textSecondary }}>{new Date(item.createdAt).toLocaleDateString()} · {item.reward > 0 ? `${item.reward.toLocaleString()} RWF ${item.status === 'successful' ? 'reward recorded' : 'potential reward'}` : 'No cash reward'}</Text></View>)}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><TouchableOpacity accessibilityRole="button" disabled={loading || data.page <= 1} onPress={() => void load(data.page - 1)}><Text style={{ color: data.page <= 1 ? colors.textSecondary : colors.primary }}>Previous</Text></TouchableOpacity><Text style={{ color: colors.textSecondary }}>Page {data.page}</Text><TouchableOpacity accessibilityRole="button" disabled={loading || !data.hasMore} onPress={() => void load(data.page + 1)}><Text style={{ color: data.hasMore ? colors.primary : colors.textSecondary }}>Next</Text></TouchableOpacity></View>
      </View>
    </>}
  </PassengerSettingsScreen>;
}
