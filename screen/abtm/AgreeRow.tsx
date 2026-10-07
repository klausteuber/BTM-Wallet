import React from 'react';
import { StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Body } from './ui';

/** An "I agree" switch whose whole row is the tap target (and reads as a checkbox to VoiceOver). */
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
    style={styles.row}
    testID={testID}
  >
    <Switch value={value} onValueChange={onChange} importantForAccessibility="no" />
    <View style={styles.text}>
      <Body>{label}</Body>
    </View>
  </TouchableOpacity>
);

export default AgreeRow;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  text: { flex: 1, marginLeft: 12 },
});
