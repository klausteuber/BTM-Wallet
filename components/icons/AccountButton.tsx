import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@rneui/themed';
import { useTheme } from '../themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';

/** Header button that opens the America Bitcoin account (next to Settings). */
const AccountButton = () => {
  const { colors } = useTheme();
  const { navigate } = useExtendedNavigation();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={loc.abtm.account_title}
      testID="AbtmAccountButton"
      style={[styles.button, { backgroundColor: colors.lightButton }]}
      onPress={() => navigate('AbtmAccount')}
    >
      <Icon size={20} name="person" type="material" color={colors.foregroundColor} />
    </TouchableOpacity>
  );
};

export default AccountButton;

const styles = StyleSheet.create({
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignContent: 'center',
  },
});
