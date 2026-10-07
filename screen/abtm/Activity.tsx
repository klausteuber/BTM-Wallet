import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../components/themes';
import { ActivityEvent, pairedWalletApi } from '../../blue_modules/paired-wallet-api';
import loc from '../../loc';
import { Body, ErrorText, formatDateTime } from './ui';

/** Recent sign-ins and account events (the website's "Recent activity", from the same audit log). */
const AbtmActivity: React.FC = () => {
  const { colors } = useTheme();
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
      <View style={[styles.center, { backgroundColor: colors.elevated }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.elevated }}
      data={events || []}
      keyExtractor={(item, index) => `${item.at}-${index}`}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>{error ? <ErrorText>{error}</ErrorText> : <Body muted>{loc.abtm.activity_intro}</Body>}</View>
      }
      ListEmptyComponent={error ? null : <Body muted>{loc.abtm.activity_empty}</Body>}
      renderItem={({ item }) => (
        <View style={[styles.row, { borderBottomColor: colors.formBorder }]}>
          <Body>{item.label}</Body>
          <Body muted>{`${formatDateTime(item.at)} · ${item.device}`}</Body>
        </View>
      )}
    />
  );
};

export default AbtmActivity;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16 },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
