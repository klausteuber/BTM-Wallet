import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useTheme } from './themes';

interface HeaderRightButtonProps {
  disabled?: boolean;
  onPress?: () => void;
  title: string;
  testID?: string;
}

// A plain text bar button, the way iOS draws "Edit" / "Done" / "Details".
// No fill of our own: on iOS 26 the navigation bar wraps every bar item in a
// Liquid Glass capsule, so a filled pill here showed up as a pill inside a
// pill. Earlier iOS versions and Android draw header text buttons without a
// background too, so this reads as native everywhere.
const HeaderRightButton: React.FC<HeaderRightButtonProps> = ({ disabled = true, onPress, title, testID }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      hitSlop={HIT_SLOP}
      testID={testID}
    >
      <Text style={[styles.title, { color: colors.buttonTextColor }]} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 6,
  },
  disabled: {
    opacity: 0.35,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default HeaderRightButton;
