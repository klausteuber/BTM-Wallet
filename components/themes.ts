import { DarkTheme, DefaultTheme, useTheme as useThemeBase } from '@react-navigation/native';
import { Appearance } from 'react-native';

export const BlueDefaultTheme = {
  ...DefaultTheme,
  closeImage: require('../img/close.png'),
  barStyle: 'dark-content',
  scanImage: require('../img/scan.png'),
  colors: {
    ...DefaultTheme.colors,
    borderWidth: 0.5,
    brandingColor: '#ffffff',
    customHeader: '#ffffff',
    foregroundColor: '#040766', // American Blue
    borderTopColor: 'rgba(4, 7, 102, 0.1)',
    buttonBackgroundColor: '#D9DAE5', // American Gray
    buttonTextColor: '#040766', // American Blue
    secondButtonTextColor: '#50555C',
    buttonAlternativeTextColor: '#040766', // American Blue
    buttonDisabledBackgroundColor: '#eef0f4',
    buttonDisabledTextColor: '#9aa0aa',
    inputBorderColor: '#D9DAE5', // American Gray
    inputBackgroundColor: '#f5f5f5',
    alternativeTextColor: '#5F6570', // Accessible secondary text on light backgrounds
    alternativeTextColor2: '#040766', // American Blue
    buttonBlueBackgroundColor: '#D9DAE5', // American Gray
    buttonGrayBackgroundColor: '#EEEEEE',
    incomingBackgroundColor: '#d2f8d6',
    incomingForegroundColor: '#087A55', // Accessible dark mint for icons on light surfaces
    outgoingBackgroundColor: '#f8d2d2',
    outgoingForegroundColor: '#ED122E', // American Red
    successColor: '#087A55', // Accessible dark mint for success text on light surfaces
    failedColor: '#ED122E', // American Red
    placeholderTextColor: '#5F6570',
    shadowColor: '#000000',
    inverseForegroundColor: '#ffffff',
    hdborderColor: '#040766', // American Blue
    hdbackgroundColor: '#E8E8F0',
    lnborderColor: '#FFB600',
    lnbackgroundColor: '#FFFAEF',
    background: '#FFFFFF',
    lightButton: '#eef0f4',
    ballReceive: '#d2f8d6',
    ballOutgoing: '#f8d2d2',
    lightBorder: '#D9DAE5', // American Gray
    ballOutgoingExpired: '#EEF0F4',
    modal: '#ffffff',
    formBorder: '#D9DAE5', // American Gray
    modalButton: '#D9DAE5', // American Gray
    darkGray: '#5F6570',
    scanLabel: '#9AA0AA',
    feeText: '#5F6570',
    feeLabel: '#d2f8d6',
    feeValue: '#040766', // American Blue on the pale-mint fee badge
    feeActive: '#d2f8d6',
    labelText: '#5F6570',
    cta2: '#040766', // American Blue
    outputValue: '#040766', // American Blue
    elevated: '#ffffff',
    mainColor: '#D9DAE5', // American Gray
    success: '#D9DAE5', // American Gray
    successCheck: '#040766', // American Blue
    msSuccessBG: '#38E3A5', // American Mint
    msSuccessCheck: '#ffffff',
    newBlue: '#040766', // American Blue
    redBG: '#F8D2D2',
    redText: '#A20C20', // Accessible dark red on the pale-red status background
    changeBackground: '#FDF2DA',
    changeText: '#040766', // American Blue keeps the pale-yellow badge readable
    receiveBackground: '#D1F9D6',
    receiveText: '#040766', // American Blue keeps the pale-mint badge readable
    navigationBarColor: '#FFFFFF',
    androidRippleColor: '#D9DAE5', // American Gray
  },
};

export type Theme = typeof BlueDefaultTheme;

export const BlueDarkTheme: Theme = {
  ...DarkTheme,
  closeImage: require('../img/close-white.png'),
  scanImage: require('../img/scan-white.png'),
  barStyle: 'light-content',
  colors: {
    ...BlueDefaultTheme.colors,
    ...DarkTheme.colors,
    customHeader: '#040766', // American Blue dark header
    brandingColor: '#040766', // American Blue
    borderTopColor: '#9aa0aa',
    background: '#040766', // American Blue background
    foregroundColor: '#ffffff',
    buttonDisabledBackgroundColor: '#3A3A3C',
    buttonBackgroundColor: '#1a1d6b', // Lighter American Blue
    buttonTextColor: '#ffffff',
    lightButton: 'rgba(255,255,255,.1)',
    buttonAlternativeTextColor: '#ffffff',
    alternativeTextColor: '#9aa0aa',
    alternativeTextColor2: '#38E3A5', // American Mint
    incomingForegroundColor: '#38E3A5', // American Mint is high contrast on dark surfaces
    successColor: '#38E3A5', // American Mint is high contrast on dark surfaces
    placeholderTextColor: '#9AA0AA',
    ballReceive: '#0a0d4a',
    ballOutgoing: '#0a0d4a',
    lightBorder: '#1a1d6b',
    ballOutgoingExpired: '#0a0d4a',
    modal: '#0a0d4a',
    formBorder: '#1a1d6b',
    inputBackgroundColor: '#0a0d4a',
    modalButton: '#040766', // American Blue
    darkGray: '#9AA0AA',
    feeText: '#9AA0AA',
    feeLabel: '#38E3A5', // American Mint
    feeValue: '#040766', // American Blue
    feeActive: 'rgba(56,227,165,.2)', // American Mint with opacity
    cta2: '#ffffff',
    outputValue: '#ffffff',
    elevated: '#0a0d4a',
    mainColor: '#ED122E', // American Red accent
    success: '#0a0d4a',
    successCheck: '#38E3A5', // American Mint
    buttonBlueBackgroundColor: '#0a0d4a',
    scanLabel: 'rgba(255,255,255,.2)',
    labelText: '#ffffff',
    msSuccessBG: '#38E3A5', // American Mint
    msSuccessCheck: '#040766', // American Blue
    newBlue: '#38E3A5', // American Mint for highlights in dark mode
    redBG: '#5A4E4E',
    redText: '#FFFFFF',
    changeBackground: '#5A4E4E',
    changeText: '#FFFFFF',
    receiveBackground: 'rgba(56,227,165,.2)', // American Mint with opacity
    receiveText: '#38E3A5', // American Mint
    navigationBarColor: '#040766', // American Blue
    androidRippleColor: '#1a1d6b',
  },
};

// Casting theme value to get autocompletion
export const useTheme = (): Theme => useThemeBase() as Theme;

export class BlueCurrentTheme {
  static colors: Theme['colors'];
  static closeImage: Theme['closeImage'];
  static scanImage: Theme['scanImage'];

  static updateTheme(theme: Theme): void {
    BlueCurrentTheme.colors = theme.colors;
    BlueCurrentTheme.closeImage = theme.closeImage;
    BlueCurrentTheme.scanImage = theme.scanImage;
  }

  static updateColorScheme(): void {
    const isColorSchemeDark = Appearance.getColorScheme() === 'dark';
    BlueCurrentTheme.updateTheme(isColorSchemeDark ? BlueDarkTheme : BlueDefaultTheme);
  }
}

BlueCurrentTheme.updateColorScheme();
