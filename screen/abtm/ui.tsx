import React, { forwardRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand, cardShadow, heroCardShadow } from '../../components/brand';
import BrandLogo from '../../components/BrandLogo';
import BrandSlash from '../../components/BrandSlash';

/**
 * Building blocks for the America Bitcoin account screens. They copy
 * account.americabitcoinatm.com (account_service/static/account.css) so the app and
 * the website look like one product: white cards on a pale page, a navy greeting
 * band with a red slash, red primary buttons, Rethink Sans throughout.
 * The website has no dark mode, so neither do these screens.
 */

// ------------------------------------------------------------------ screens

/** The sign-in look: a navy gradient page with one white card holding the logo. */
export const AuthScreen: React.FC<{ children: React.ReactNode; footer?: React.ReactNode }> = ({ children, footer }) => (
  <LinearGradient colors={[brand.blue, brand.blueDark]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.flex}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'android' ? 'height' : undefined}>
      {/* iOS: the scroll view insets itself above the keyboard (KeyboardAvoidingView would need the header height). */}
      <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={[styles.authCard, heroCardShadow]}>
          <View style={styles.authLogo}>
            <BrandLogo width={170} />
          </View>
          {children}
        </View>
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  </LinearGradient>
);

/** A pale page that scrolls, like the website's dashboard. */
export const Page: React.FC<{ children: React.ReactNode; refreshControl?: React.ReactElement<RefreshControlProps>; testID?: string }> = ({
  children,
  refreshControl,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      testID={testID}
      style={styles.page}
      contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
};

/**
 * The navy greeting band with the red slash. Cards that follow it inside
 * <Overlap> ride up over its bottom edge, as on the website.
 */
export const HeroBand: React.FC<{ title: string; subtitle?: string; children?: React.ReactNode }> = ({ title, subtitle, children }) => (
  <View style={styles.hero}>
    <Text style={styles.heroTitle} accessibilityRole="header">
      {title}
    </Text>
    {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
    {children}
    <BrandSlash width={190} bottom={60} />
  </View>
);

export const Overlap: React.FC<{ children: React.ReactNode }> = ({ children }) => <View style={styles.overlap}>{children}</View>;

/** The white pill notice that sits in the greeting band. */
export const HeroNotice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.heroNotice}>
    <Text style={styles.heroNoticeText}>{children}</Text>
  </View>
);

// ------------------------------------------------------------------ cards and text

export const Card: React.FC<ViewProps> = ({ style, children, ...rest }) => (
  <View style={[styles.card, cardShadow, style]} {...rest}>
    {children}
  </View>
);

/** A card title with an optional count on the right ("2/4"). */
export const Title: React.FC<{ children: React.ReactNode; count?: string }> = ({ children, count }) => (
  <View style={styles.cardHead}>
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
    {count ? <Text style={styles.count}>{count}</Text> : null}
  </View>
);

/** The large heading inside the sign-in card. */
export const AuthTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.authTitle} accessibilityRole="header">
    {children}
  </Text>
);

export const Body: React.FC<{ children: React.ReactNode; muted?: boolean; selectable?: boolean; testID?: string; strong?: boolean }> = ({
  children,
  muted,
  selectable,
  testID,
  strong,
}) => (
  <Text testID={testID} selectable={selectable} style={[styles.body, muted && styles.muted, strong && styles.strong]}>
    {children}
  </Text>
);

/** Small grey help text under a field. */
export const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => <Text style={styles.hint}>{children}</Text>;

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => <Text style={styles.label}>{children}</Text>;

/** A wallet address or other long string: monospace-free but wrapping cleanly in a tinted box. */
export const Code: React.FC<{ children: React.ReactNode; testID?: string }> = ({ children, testID }) => (
  <View style={styles.codeBox}>
    <Text selectable testID={testID} style={styles.codeText}>
      {children}
    </Text>
  </View>
);

// ------------------------------------------------------------------ alerts

const Alert: React.FC<{ tone: 'error' | 'info'; children: React.ReactNode }> = ({ tone, children }) => (
  <View
    accessibilityRole={tone === 'error' ? 'alert' : 'text'}
    style={[styles.alert, tone === 'error' ? styles.alertError : styles.alertInfo]}
  >
    <Text style={[styles.alertText, { color: tone === 'error' ? brand.errorText : brand.infoText }]}>{children}</Text>
  </View>
);

export const ErrorText: React.FC<{ children: React.ReactNode }> = ({ children }) => <Alert tone="error">{children}</Alert>;
export const Notice: React.FC<{ children: React.ReactNode }> = ({ children }) => <Alert tone="info">{children}</Alert>;

// ------------------------------------------------------------------ inputs

export const Field = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor="#8a8da6"
      {...props}
      onFocus={e => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={e => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[styles.input, focused && styles.inputFocused, props.style]}
    />
  );
});

/** A US mobile number with the "+1" box in front, as on the website. */
export const PhoneField = forwardRef<TextInput, TextInputProps>((props, ref) => (
  <View style={styles.phoneRow}>
    <View style={styles.phonePrefix}>
      <Text style={styles.phonePrefixText}>+1</Text>
    </View>
    <View style={styles.flex}>
      <Field ref={ref} {...props} style={[styles.phoneInput, props.style]} />
    </View>
  </View>
));

/** A six-digit code, big and spaced out. */
export const CodeField = forwardRef<TextInput, TextInputProps>((props, ref) => (
  <Field ref={ref} {...props} style={[styles.codeInput, props.style]} />
));

// ------------------------------------------------------------------ small parts

export const Gap: React.FC<{ size?: number }> = ({ size = 16 }) => <View style={{ height: size } as ViewStyle} />;

/** Status badge: good (mint), warn (red), neutral (pale blue). */
export const Pill: React.FC<{ tone: 'good' | 'warn' | 'neutral'; children: React.ReactNode }> = ({ tone, children }) => {
  const palette =
    tone === 'good'
      ? { bg: brand.infoBg, fg: brand.infoText, dot: brand.mintDark }
      : tone === 'warn'
        ? { bg: brand.errorBg, fg: brand.errorText, dot: brand.red }
        : { bg: brand.tint, fg: brand.blue, dot: brand.blue };
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.pillText, { color: palette.fg }]}>{children}</Text>
    </View>
  );
};

/** The website's underlined text button ("Resend code", "Email me a code instead"). */
export const LinkButton: React.FC<{ title: string; onPress: () => void; disabled?: boolean; testID?: string; light?: boolean }> = ({
  title,
  onPress,
  disabled,
  testID,
  light,
}) => (
  <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled} testID={testID} style={styles.link} hitSlop={8}>
    <Text style={[styles.linkText, light && styles.linkLight, disabled && styles.linkDisabled]}>{title}</Text>
  </TouchableOpacity>
);

export const LinkRow: React.FC<{ children: React.ReactNode }> = ({ children }) => <View style={styles.linkRow}>{children}</View>;

/** Numbered progress pills: done (mint ✓), current (blue), upcoming (grey). */
export const Steps: React.FC<{ items: { label: string; state: 'done' | 'current' | 'todo' }[] }> = ({ items }) => (
  <View style={styles.steps} accessibilityLabel={items.map(i => i.label).join(', ')}>
    {items.map((item, index) => (
      <View
        key={item.label}
        style={[styles.step, item.state === 'current' && styles.stepCurrent, item.state === 'done' && styles.stepDone]}
      >
        <View style={[styles.stepNum, item.state === 'current' && styles.stepNumCurrent, item.state === 'done' && styles.stepNumDone]}>
          <Text style={styles.stepNumText}>{item.state === 'done' ? '✓' : String(index + 1)}</Text>
        </View>
        <Text
          style={[styles.stepLabel, item.state === 'current' && styles.stepLabelCurrent, item.state === 'done' && styles.stepLabelDone]}
        >
          {item.label}
        </Text>
      </View>
    ))}
  </View>
);

/** Label / value rows ("Mobile  ***-***-0142"). */
export const Facts: React.FC<{ rows: [string, React.ReactNode][] }> = ({ rows }) => (
  <View style={styles.facts}>
    {rows.map(([key, value]) => (
      <View key={key} style={styles.factRow}>
        <Text style={styles.factKey}>{key}</Text>
        <Text style={styles.factValue} selectable>
          {value}
        </Text>
      </View>
    ))}
  </View>
);

export const Progress: React.FC<{ done: number; total: number }> = ({ done, total }) => (
  <View style={styles.progress}>
    <View style={[styles.progressFill, { width: `${total ? Math.round((done / total) * 100) : 0}%` }]} />
  </View>
);

/** One line of the "Complete your profile" checklist. */
export const CheckItem: React.FC<{ done: boolean; title: string; detail?: string; children?: React.ReactNode }> = ({
  done,
  title,
  detail,
  children,
}) => (
  <View style={styles.checkItem}>
    <View style={[styles.mark, done && styles.markDone]}>{done ? <Text style={styles.markText}>✓</Text> : null}</View>
    <View style={styles.flex}>
      <Text style={[styles.checkTitle, !done && styles.checkTitleTodo]}>{title}</Text>
      {detail ? <Text style={styles.checkDetail}>{detail}</Text> : null}
      {children}
    </View>
  </View>
);

/** A white card of tappable rows with chevrons. */
export const MenuCard: React.FC<{
  rows: { title: string; detail?: string; alert?: boolean; onPress: () => void; testID?: string }[];
  style?: StyleProp<ViewStyle>;
}> = ({ rows, style }) => (
  <View style={[styles.card, styles.menuCard, cardShadow, style]}>
    {rows.map((row, index) => (
      <TouchableOpacity
        key={row.title}
        accessibilityRole="button"
        onPress={row.onPress}
        testID={row.testID}
        style={[styles.menuRow, index > 0 && styles.menuRowBorder]}
      >
        <View style={styles.flex}>
          <Text style={styles.menuTitle}>{row.title}</Text>
          {row.detail ? <Text style={[styles.menuDetail, row.alert && styles.menuDetailAlert]}>{row.detail}</Text> : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    ))}
  </View>
);

/** White help line under the sign-in card. */
export const AuthFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => <Text style={styles.authFooter}>{children}</Text>;

// ------------------------------------------------------------------ formatting

/** "(702) 555-0142" while typing; the server accepts any 10-digit US format. */
export function formatPhoneInput(raw: string): string {
  const digits = raw
    .replace(/\D/g, '')
    .replace(/^1(?=\d{10})/, '')
    .slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function phoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  authScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 28 },
  authCard: { backgroundColor: brand.surface, borderRadius: brand.radius, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },
  authLogo: { alignItems: 'center', marginBottom: 22 },
  authTitle: { fontSize: 24, fontWeight: '800', color: brand.blue, marginBottom: 8 },
  authFooter: { textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 18, lineHeight: 20 },

  page: { flex: 1, backgroundColor: brand.page },
  hero: { backgroundColor: brand.blue, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 70, overflow: 'hidden' },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  heroSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 15.5, marginTop: 6 },
  heroNotice: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: 'rgba(56,227,165,0.16)',
    borderColor: 'rgba(56,227,165,0.5)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroNoticeText: { color: '#fff', fontSize: 14.5 },
  overlap: { marginTop: -46 },

  card: { backgroundColor: brand.surface, borderRadius: brand.radius, padding: 20, marginHorizontal: 16, marginBottom: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '800', color: brand.blue, flexShrink: 1 },
  count: { fontSize: 14, fontWeight: '700', color: brand.muted },
  body: { fontSize: 15.5, lineHeight: 22, color: brand.ink },
  muted: { color: brand.muted },
  strong: { fontWeight: '700' },
  hint: { fontSize: 13.5, lineHeight: 19, color: brand.muted, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '700', color: brand.ink, marginBottom: 6 },
  codeBox: { backgroundColor: brand.page, borderRadius: brand.radiusControl, paddingHorizontal: 14, paddingVertical: 12 },
  codeText: { fontSize: 15, lineHeight: 21, color: brand.ink, fontWeight: '600', letterSpacing: 0.3 },

  alert: { borderRadius: brand.radiusControl, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1 },
  alertError: { backgroundColor: brand.errorBg, borderColor: '#f6c3cb' },
  alertInfo: { backgroundColor: brand.infoBg, borderColor: '#b8f0da' },
  alertText: { fontSize: 14.5, lineHeight: 20 },

  input: {
    borderWidth: 1.5,
    borderColor: brand.line,
    borderRadius: brand.radiusControl,
    backgroundColor: brand.surface,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 17,
    color: brand.ink,
  },
  inputFocused: {
    borderColor: brand.blue,
    shadowColor: brand.blue,
    shadowOpacity: 0.15,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  phoneRow: { flexDirection: 'row', alignItems: 'stretch' },
  phonePrefix: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: brand.page,
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderColor: brand.line,
    borderTopLeftRadius: brand.radiusControl,
    borderBottomLeftRadius: brand.radiusControl,
  },
  phonePrefixText: { fontSize: 17, fontWeight: '700', color: brand.muted },
  phoneInput: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  codeInput: { fontSize: 28, height: 64, letterSpacing: 10, textAlign: 'center', fontWeight: '700' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  pillText: { fontSize: 13, fontWeight: '700' },

  link: { alignSelf: 'flex-start', paddingVertical: 6 },
  linkText: { fontSize: 15, fontWeight: '700', color: brand.blue, textDecorationLine: 'underline' },
  linkLight: { color: '#fff' },
  linkDisabled: { color: brand.muted, textDecorationLine: 'none' },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 4, marginTop: 14 },

  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: brand.page,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 5,
  },
  stepCurrent: { backgroundColor: brand.tint },
  stepDone: { backgroundColor: brand.infoBg },
  stepNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#c9cbdc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  stepNumCurrent: { backgroundColor: brand.blue },
  stepNumDone: { backgroundColor: brand.mintDark },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepLabel: { fontSize: 13, fontWeight: '700', color: brand.muted },
  stepLabelCurrent: { color: brand.blue },
  stepLabelDone: { color: brand.infoText },

  facts: { gap: 10 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  factKey: { fontSize: 15, color: brand.muted },
  factValue: { fontSize: 15, fontWeight: '700', color: brand.ink, flexShrink: 1, textAlign: 'right' },

  progress: { height: 8, borderRadius: 999, backgroundColor: brand.gray, overflow: 'hidden', marginBottom: 18 },
  progressFill: { height: '100%', backgroundColor: brand.blue },
  checkItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16 },
  mark: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#c9cbdc', alignItems: 'center', justifyContent: 'center' },
  markDone: { backgroundColor: brand.mintDark, borderColor: brand.mintDark },
  markText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  checkTitle: { fontSize: 15.5, fontWeight: '700', color: brand.ink },
  checkTitleTodo: { color: brand.muted },
  checkDetail: { fontSize: 13.5, lineHeight: 19, color: brand.muted, marginTop: 2 },

  menuCard: { paddingVertical: 0, paddingHorizontal: 0 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  menuRowBorder: { borderTopWidth: 1, borderTopColor: '#ecedf4' },
  menuTitle: { fontSize: 16, fontWeight: '700', color: brand.ink },
  menuDetail: { fontSize: 13.5, color: brand.muted, marginTop: 2 },
  menuDetailAlert: { color: brand.green, fontWeight: '700' },
  chevron: { fontSize: 26, color: brand.line, marginLeft: 12, marginTop: -2 },
});
