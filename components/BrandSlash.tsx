import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { brand } from './brand';

/**
 * The red skewed bar from the website's blue greeting band
 * (`.greeting::after` in account.css). Place inside a container with overflow hidden.
 */
export const BrandSlash: React.FC<{ style?: StyleProp<ViewStyle>; width?: number; bottom?: number }> = ({
  style,
  width = 220,
  bottom = 22,
}) => <View pointerEvents="none" style={[styles.slash, { width, bottom }, style]} />;

const styles = StyleSheet.create({
  slash: {
    position: 'absolute',
    right: -40,
    height: 9,
    backgroundColor: brand.red,
    transform: [{ skewX: '-24deg' }],
  },
});

export default BrandSlash;
