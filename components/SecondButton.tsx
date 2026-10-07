import React, { forwardRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Icon } from '@rneui/themed';

import { useTheme } from './themes';

type IconProps = {
  name: string;
  type: string;
  color: string;
};

type SecondButtonProps = {
  backgroundColor?: string;
  disabled?: boolean;
  icon?: IconProps;
  title?: string;
  onPress?: () => void;
  loading?: boolean;
  testID?: string;
};

export const SecondButton = forwardRef<React.ElementRef<typeof TouchableOpacity>, SecondButtonProps>((props, ref) => {
  const { colors } = useTheme();
  // Secondary: the website's outline button (white, blue border, blue text).
  let backgroundColor = props.backgroundColor ? props.backgroundColor : colors.buttonGrayBackgroundColor;
  let fontColor = colors.secondButtonTextColor;
  let borderColor: string = props.backgroundColor ? 'transparent' : colors.secondButtonTextColor;
  if (props.disabled === true) {
    backgroundColor = colors.buttonDisabledBackgroundColor;
    fontColor = colors.buttonDisabledTextColor;
    borderColor = 'transparent';
  }

  const buttonView = props.loading ? (
    <ActivityIndicator size="small" color={colors.buttonTextColor} />
  ) : (
    <View style={styles.view}>
      {props.icon && <Icon name={props.icon.name} type={props.icon.type} color={props.icon.color} />}
      {props.title && <Text style={[styles.text, { color: fontColor }]}>{props.title}</Text>}
    </View>
  );

  return props.onPress ? (
    <TouchableOpacity
      disabled={props.disabled || props.loading}
      accessibilityRole="button"
      testID={props.testID}
      style={[styles.button, { backgroundColor, borderColor }]}
      {...props}
      ref={ref}
    >
      {buttonView}
    </TouchableOpacity>
  ) : (
    <View style={[styles.button, { backgroundColor, borderColor }]}>{buttonView}</View>
  );
});

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    height: 52,
    maxHeight: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginHorizontal: 8,
    fontSize: 17,
    fontWeight: '700',
  },
  view: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
