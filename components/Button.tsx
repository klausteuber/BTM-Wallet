import React, { forwardRef } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, Pressable, PressableProps, View, ViewStyle, Platform } from 'react-native';
import { Icon } from '@rneui/themed';

import { useTheme } from './themes';

interface ButtonProps extends PressableProps {
  backgroundColor?: string;
  buttonTextColor?: string;
  disabled?: boolean;
  testID?: string;
  icon?: {
    name: string;
    type: string;
    color: string;
  };
  title?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  showActivityIndicator?: boolean;
}

export const Button = forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>((props, ref) => {
  const { colors } = useTheme();
  const {
    backgroundColor: customBackgroundColor,
    buttonTextColor,
    disabled,
    icon,
    onPress,
    showActivityIndicator,
    style,
    testID,
    title,
    ...pressableProps
  } = props;

  let backgroundColor = customBackgroundColor ?? colors.mainColor;
  let fontColor = buttonTextColor ?? colors.buttonTextColor;
  if (disabled) {
    backgroundColor = colors.buttonDisabledBackgroundColor;
    fontColor = colors.buttonDisabledTextColor;
  }

  const buttonStyle = {
    ...styles.button,
    backgroundColor,
    borderColor: disabled ? colors.buttonDisabledBackgroundColor : 'transparent',
  };

  const textStyle = {
    ...styles.text,
    color: fontColor,
  };

  const buttonView = showActivityIndicator ? (
    <ActivityIndicator size="small" color={textStyle.color} />
  ) : (
    <>
      {icon && <Icon name={icon.name} type={icon.type} color={icon.color} />}
      {title && (
        <Text adjustsFontSizeToFit numberOfLines={1} style={textStyle}>
          {title}
        </Text>
      )}
    </>
  );
  const flattenedCustomStyle = StyleSheet.flatten(style);
  const wrapperBorderRadius =
    typeof flattenedCustomStyle?.borderRadius === 'number' ? flattenedCustomStyle.borderRadius : styles.pressableWrapper.borderRadius;

  return onPress ? (
    <View style={[styles.pressableWrapper, { borderRadius: wrapperBorderRadius }]}>
      <Pressable
        {...pressableProps}
        ref={ref}
        testID={testID}
        android_ripple={{ color: colors.androidRippleColor }}
        style={({ pressed }) => [Platform.OS === 'ios' && pressed ? styles.pressed : null, buttonStyle, style, styles.content]}
        accessibilityRole="button"
        onPress={onPress}
        disabled={disabled}
      >
        {buttonView}
      </Pressable>
    </View>
  ) : (
    <View style={[buttonStyle, style, styles.content]}>{buttonView}</View>
  );
});

const styles = StyleSheet.create({
  button: {
    borderWidth: 0.7,
    minHeight: 45,
    height: 48,
    maxHeight: 48,
    borderRadius: 25,
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
    fontSize: 16,
    fontWeight: '600',
  },
  pressableWrapper: {
    overflow: 'hidden',
    borderRadius: 25,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default Button;
