import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { Icon } from '@rneui/themed';
import { useTheme } from './themes';

interface BlueBigCheckmarkProps extends ViewProps {}

export function BlueBigCheckmark(props: BlueBigCheckmarkProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.msSuccessBG }, props.style]}>
      <Icon name="check" size={50} type="font-awesome" color={colors.msSuccessCheck} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
});
