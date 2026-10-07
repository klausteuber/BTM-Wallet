import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { brand } from '../../components/brand';

/**
 * An "I agree" checkbox in the website's consent box. The whole box is the tap target
 * and reads as a checkbox to VoiceOver.
 */
const AgreeRow: React.FC<{ value: boolean; onChange: (value: boolean) => void; label: string; testID?: string }> = ({
  value,
  onChange,
  label,
  testID,
}) => (
  <TouchableOpacity
    accessibilityRole="checkbox"
    accessibilityState={{ checked: value }}
    accessibilityLabel={label}
    activeOpacity={0.7}
    onPress={() => onChange(!value)}
    style={[styles.row, value && styles.rowChecked]}
    testID={testID}
  >
    <View style={[styles.box, value && styles.boxChecked]}>{value ? <Text style={styles.tick}>✓</Text> : null}</View>
    <Text style={styles.text}>{label}</Text>
  </TouchableOpacity>
);

export default AgreeRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: brand.line,
    borderRadius: brand.radiusControl,
    backgroundColor: brand.page,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowChecked: { borderColor: brand.blue },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: brand.line,
    backgroundColor: brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: { backgroundColor: brand.blue, borderColor: brand.blue },
  tick: { color: '#fff', fontSize: 13, fontWeight: '800' },
  text: { flex: 1, marginLeft: 12, fontSize: 14.5, lineHeight: 20, color: brand.ink },
});
