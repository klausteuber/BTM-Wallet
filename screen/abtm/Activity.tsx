import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { brand } from '../../components/brand';
import { ActivityEvent, pairedWalletApi } from '../../blue_modules/paired-wallet-api';
import loc from '../../loc';
import { Body, Card, ErrorText, formatDateTime, Page } from './ui';

/** Recent sign-ins and account events (the website's "Recent activity", from the same audit log). */
const AbtmActivity: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvents(await pairedWalletApi.getActivity());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!events && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.blue} />
      </View>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.intro}>{error ? <ErrorText>{error}</ErrorText> : <Body muted>{loc.abtm.activity_intro}</Body>}</View>
      {!error ? (
        <Card>
          {(events || []).length === 0 ? <Body muted>{loc.abtm.activity_empty}</Body> : null}
          {(events || []).map((item, index) => (
            <View key={`${item.at}-${index}`} style={[styles.row, index > 0 && styles.rowBorder]}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.meta}>{`${formatDateTime(item.at)} · ${item.device}`}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Page>
  );
};

export default AbtmActivity;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.page },
  intro: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  row: { paddingVertical: 11 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#ecedf4' },
  label: { fontSize: 15, fontWeight: '700', color: brand.ink },
  meta: { fontSize: 13.5, color: brand.muted, marginTop: 2 },
});
