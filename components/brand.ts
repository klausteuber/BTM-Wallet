import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * America Bitcoin brand tokens, mirroring account.americabitcoinatm.com
 * (account_service/static/account.css) so the app and the website read as one product.
 */
export const brand = {
  blue: '#040766',
  blueDark: '#020438',
  red: '#ED122E',
  redDark: '#c40e25',
  mint: '#38E3A5',
  mintDark: '#1fb47e',
  // Go-ahead actions (approve a purchase, a waiting request): calm, not alarming like red.
  green: '#0F8A5F',
  greenDark: '#0B6B49',
  gray: '#D9DAE5',
  ink: '#1d1f3a',
  muted: '#555874',
  line: '#b9bbd0',
  page: '#f4f5fa',
  surface: '#ffffff',
  tint: '#e6e7f4', // pale blue: current step, chips
  errorBg: '#fdecef',
  errorText: '#8f0a1c',
  infoBg: '#e9fbf4',
  infoText: '#0d5c40',
  radius: 14, // cards
  radiusControl: 10, // buttons and inputs
} as const;

/** Rethink Sans ships as one file per weight; each has its own PostScript name. */
export const fonts = {
  regular: 'RethinkSans-Regular',
  medium: 'RethinkSans-Medium',
  semibold: 'RethinkSans-SemiBold',
  bold: 'RethinkSans-Bold',
  extrabold: 'RethinkSans-ExtraBold',
} as const;

const BY_WEIGHT: Record<string, string> = {
  normal: fonts.regular,
  '100': fonts.regular,
  '200': fonts.regular,
  '300': fonts.regular,
  '400': fonts.regular,
  '500': fonts.medium,
  '600': fonts.semibold,
  bold: fonts.bold,
  '700': fonts.bold,
  '800': fonts.extrabold,
  '900': fonts.extrabold,
};

/** The Rethink Sans file for a CSS-style weight (defaults to Regular). */
export function fontFor(weight?: TextStyle['fontWeight'] | number): string {
  if (weight === undefined || weight === null) return fonts.regular;
  return BY_WEIGHT[String(weight)] ?? fonts.regular;
}

/** `{ fontFamily }` for a weight; spread into a text style. */
export const type = (weight?: TextStyle['fontWeight']): TextStyle => ({ fontFamily: fontFor(weight) });

/** The site's card shadow: 0 6px 24px rgba(4,7,102,.08). */
export const cardShadow: ViewStyle = Platform.select({
  ios: { shadowColor: brand.blue, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  default: { elevation: 3 },
}) as ViewStyle;

/** The heavier auth-card shadow: 0 24px 60px rgba(0,0,0,.35). */
export const heroCardShadow: ViewStyle = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 16 } },
  default: { elevation: 10 },
}) as ViewStyle;
