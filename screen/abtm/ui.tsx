import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewProps } from 'react-native';
import { useTheme } from '../../components/themes';

/** Shared building blocks for the America Bitcoin account screens. */

export const Card: React.FC<ViewProps> = ({ style, children, ...rest }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.lightButton }, style]} {...rest}>
      {children}
    </View>
  );
};

export const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  return <Text style={[styles.title, { color: colors.foregroundColor }]}>{children}</Text>;
};

export const Body: React.FC<{ children: React.ReactNode; muted?: boolean; selectable?: boolean; testID?: string }> = ({
  children,
  muted,
  selectable,
  testID,
}) => {
  const { colors } = useTheme();
  return (
    <Text
      testID={testID}
      selectable={selectable}
      style={[styles.body, { color: muted ? colors.alternativeTextColor : colors.foregroundColor }]}
    >
      {children}
    </Text>
  );
};

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.alternativeTextColor }]}>{children}</Text>;
};

export const ErrorText: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="alert" style={[styles.body, { color: colors.failedColor }]}>
      {children}
    </Text>
  );
};

export const Field = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const { colors } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.alternativeTextColor}
      {...props}
      style={[
        styles.input,
        { borderColor: colors.formBorder, backgroundColor: colors.inputBackgroundColor, color: colors.foregroundColor },
        props.style,
      ]}
    />
  );
});

export const Gap: React.FC<{ size?: number }> = ({ size = 16 }) => <View style={{ height: size } as any} />;

export const Pill: React.FC<{ tone: 'good' | 'warn' | 'neutral'; children: React.ReactNode }> = ({ tone, children }) => {
  const { colors } = useTheme();
  const background = tone === 'good' ? colors.successColor : tone === 'warn' ? colors.failedColor : colors.alternativeTextColor;
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
};

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
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 17,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
