import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { ridesApi } from '@/services/api';
import { OpenStreetMapView } from '@/components/OpenStreetMapView';

const cancellable = ['requested', 'searching', 'accepted', 'approaching', 'arrived'];

export default function PassengerRideDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: ride, isLoading, refetch } = useQuery({ queryKey: ['passenger_ride', id], enabled: Boolean(id), queryFn: async () => { const response = await ridesApi.getRideDetails(id); return response.data?.ride || response.data?.data || response.data; } });

  const status = ride?.rideStatus || ride?.status || 'requested';
  const pickup = ride?.pickup;
  const destination = ride?.destination;
  const pickupCoordinate = pickup?.latitude != null ? { latitude: pickup.latitude, longitude: pickup.longitude } : null;
  const destinationCoordinate = destination?.latitude != null ? { latitude: destination.latitude, longitude: destination.longitude } : null;
  const driver = ride?.driverId || ride?.driver;

  const cancelRide = () => Alert.alert('Cancel ride request', 'The request will remain in your history.', [{ text: 'Keep request', style: 'cancel' }, { text: 'Cancel request', style: 'destructive', onPress: async () => { setSaving(true); try { await ridesApi.cancelRide(id); await refetch(); await queryClient.invalidateQueries({ queryKey: ['passenger_rides'] }); } catch (error: any) { Alert.alert('Unable to cancel', error?.response?.data?.message || 'Please try again.'); } finally { setSaving(false); } } }]);
  const submitRating = async () => { setSaving(true); try { await ridesApi.rateRide(id, { rating, comment: comment.trim() || undefined }); Alert.alert('Thank you', 'Your feedback was saved.'); await refetch(); } catch (error: any) { Alert.alert('Unable to save rating', error?.response?.data?.message || 'Please try again.'); } finally { setSaving(false); } };

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!ride) return <View style={styles.center}><Text style={{ color: colors.textPrimary }}>Ride not found.</Text></View>;

  const locationName = (value: any, fallback: string) => value?.name || value?.address || fallback;
  return <View style={[styles.page, { backgroundColor: colors.background, paddingTop: insets.top }]}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={24} color={colors.textPrimary} /></TouchableOpacity><Text style={[styles.title, { color: colors.textPrimary }]}>Ride details</Text><View style={{ width: 24 }} /></View>
    <ScrollView contentContainerStyle={styles.content}>
      {pickupCoordinate && <View style={styles.map}><OpenStreetMapView center={pickupCoordinate} destination={destinationCoordinate} route={destinationCoordinate ? [pickupCoordinate, destinationCoordinate] : []} drivers={driver?.lastLocation ? [{ latitude: driver.lastLocation.latitude, longitude: driver.lastLocation.longitude, label: 'Driver' }] : []} /></View>}
      <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        <Text style={[styles.status, { color: colors.primary }]}>{String(status).replaceAll('_', ' ').toUpperCase()}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Pickup</Text><Text style={[styles.value, { color: colors.textPrimary }]}>{locationName(pickup, 'Pickup location')}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Destination</Text><Text style={[styles.value, { color: colors.textPrimary }]}>{locationName(destination, 'Destination')}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Price</Text><Text style={[styles.value, { color: colors.textPrimary }]}>{Number(ride.fare || ride.offeredFare || 0).toLocaleString()} RWF</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Driver</Text><Text style={[styles.value, { color: colors.textPrimary }]}>{driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : 'Not assigned'}</Text>
        {driver?.phone ? <Text style={[styles.value, { color: colors.textSecondary }]}>{driver.phone}</Text> : null}
      </View>
      {cancellable.includes(status) && <TouchableOpacity disabled={saving} style={styles.cancel} onPress={cancelRide}><Text style={styles.cancelText}>{saving ? 'Updating…' : 'Cancel ride request'}</Text></TouchableOpacity>}
      {status === 'completed' && <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}><Text style={[styles.title, { color: colors.textPrimary }]}>Rate this ride</Text><View style={styles.stars}>{[1,2,3,4,5].map(value => <TouchableOpacity key={value} onPress={() => setRating(value)}><Feather name="star" size={28} color={value <= rating ? '#F59E0B' : colors.border} /></TouchableOpacity>)}</View><TextInput value={comment} onChangeText={setComment} placeholder="Feedback (optional)" placeholderTextColor={colors.textSecondary} multiline style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} /><TouchableOpacity disabled={saving} style={[styles.primary, { backgroundColor: colors.primary }]} onPress={submitRating}><Text style={styles.primaryText}>{saving ? 'Saving…' : 'Submit feedback'}</Text></TouchableOpacity></View>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({ page:{flex:1}, center:{flex:1,alignItems:'center',justifyContent:'center'}, header:{height:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, title:{fontSize:18,fontFamily:'Inter_700Bold'}, content:{padding:16,paddingBottom:60,gap:14}, map:{height:260,borderRadius:18,overflow:'hidden'}, card:{borderWidth:1,borderRadius:16,padding:16}, status:{fontFamily:'Inter_700Bold',marginBottom:12}, label:{fontSize:12,marginTop:10}, value:{fontSize:15,fontFamily:'Inter_600SemiBold',marginTop:3}, cancel:{padding:15,borderRadius:12,backgroundColor:'#FEE2E2',alignItems:'center'}, cancelText:{color:'#B91C1C',fontFamily:'Inter_700Bold'}, stars:{flexDirection:'row',gap:10,marginVertical:16}, input:{borderWidth:1,borderRadius:12,minHeight:90,padding:12,textAlignVertical:'top'}, primary:{padding:15,borderRadius:12,alignItems:'center',marginTop:12}, primaryText:{color:'#fff',fontFamily:'Inter_700Bold'} });
