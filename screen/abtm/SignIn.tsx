import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text } from '@rneui/themed';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { pairedWalletApi } from '../../blue_modules/paired-wallet-api';
import { refreshAbtmAccount } from '../../hooks/useAbtmAccount';
import { SUPPORT_PHONE } from '../../blue_modules/send-guard';
import loc from '../../loc';
import AgreeRow from './AgreeRow';
import { Body, ErrorText, Field, formatPhoneInput, Gap, Label, phoneDigits, Title } from './ui';

type Step = 'phone' | 'code' | 'email_backup_code' | 'email' | 'email_code' | 'terms';

const RESEND_SECONDS = 30;

/**
 * Sign in or create an account, starting with the phone number (like the website):
 * a texted code signs an existing customer in; a new number goes on to confirm an
 * email address with a code and accept the Terms.
 */
const AbtmSignIn: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useExtendedNavigation();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const signup = useRef<{ signupToken?: string; emailToken?: string; verifiedToken?: string; maskedEmail?: string }>({});
  const [terms, setTerms] = useState<{ version: string; termsUrl: string; privacyUrl: string } | null>(null);
  const codeInput = useRef<TextInput>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const go = (next: Step) => {
    setStep(next);
    setCode('');
    setError(null);
    setTimeout(() => codeInput.current?.focus(), 300);
  };

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await work();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const finish = useCallback(async () => {
    await refreshAbtmAccount();
    navigation.goBack();
  }, [navigation]);

  const sendText = () =>
    run(async () => {
      if (phoneDigits(phone).length !== 10) throw new Error(loc.abtm.phone_invalid);
      await pairedWalletApi.requestCode(phoneDigits(phone));
      setResendIn(RESEND_SECONDS);
      go('code');
    });

  const resendText = () =>
    run(async () => {
      await pairedWalletApi.requestCode(phoneDigits(phone));
      setResendIn(RESEND_SECONDS);
      setNotice(loc.abtm.code_resent);
    });

  const emailInstead = () =>
    run(async () => {
      await pairedWalletApi.requestCode(phoneDigits(phone), 'email');
      go('email_backup_code');
    });

  const checkText = () =>
    run(async () => {
      const result = await pairedWalletApi.continueWithPhone(phoneDigits(phone), code);
      if (result.existingAccount) {
        await finish();
        return;
      }
      signup.current = { signupToken: result.signupToken };
      setStep('email');
      setError(null);
    });

  const checkEmailBackup = () =>
    run(async () => {
      await pairedWalletApi.signInWithEmailCode(phoneDigits(phone), code);
      await finish();
    });

  const sendEmail = () =>
    run(async () => {
      const result = await pairedWalletApi.signupSendEmail(signup.current.signupToken!, email.trim(), firstName.trim());
      signup.current = { ...signup.current, emailToken: result.emailToken, maskedEmail: result.maskedEmail };
      go('email_code');
    });

  const checkEmail = () =>
    run(async () => {
      const result = await pairedWalletApi.signupVerifyEmail(signup.current.signupToken!, signup.current.emailToken!, code);
      signup.current = { ...signup.current, verifiedToken: result.verifiedToken };
      setTerms(result.terms);
      setStep('terms');
    });

  const createAccount = () =>
    run(async () => {
      await pairedWalletApi.signupComplete(signup.current.verifiedToken!, terms!.version, phoneDigits(phone));
      await finish();
    });

  const codeField = (onSubmit: () => void) => (
    <Field
      ref={codeInput}
      testID="AbtmCode"
      value={code}
      onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="sms-otp"
      maxLength={6}
      placeholder="123456"
      returnKeyType="done"
      onSubmitEditing={onSubmit}
    />
  );

  const link = (title: string, onPress: () => void, disabled = false, testID?: string) => (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled || busy} testID={testID} style={styles.link}>
      <Text style={[styles.linkText, { color: disabled ? colors.alternativeTextColor : colors.buttonAlternativeTextColor }]}>{title}</Text>
    </TouchableOpacity>
  );

  let content: React.ReactNode;
  switch (step) {
    case 'phone':
      content = (
        <>
          <Title>{loc.abtm.signin_title}</Title>
          <Body muted>{loc.abtm.signin_intro}</Body>
          <Gap />
          <Label>{loc.abtm.phone_label}</Label>
          <Field
            testID="AbtmPhone"
            value={phone}
            onChangeText={value => setPhone(formatPhoneInput(value))}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            placeholder="(555) 555-5555"
            returnKeyType="next"
            onSubmitEditing={sendText}
            autoFocus
          />
          <Gap size={8} />
          <Body muted>{loc.abtm.phone_hint}</Body>
          <Gap />
          <Button testID="AbtmSendCode" title={loc.abtm.send_code} onPress={sendText} disabled={busy || phoneDigits(phone).length !== 10} />
        </>
      );
      break;
    case 'code':
      content = (
        <>
          <Title>{loc.abtm.code_title}</Title>
          <Body muted>{loc.formatString(loc.abtm.code_sent_to, { phone })}</Body>
          <Gap />
          {codeField(checkText)}
          <Gap />
          <Button testID="AbtmCheckCode" title={loc._.continue} onPress={checkText} disabled={busy || code.length !== 6} />
          <Gap size={8} />
          {link(
            resendIn > 0 ? loc.formatString(loc.abtm.resend_in, { seconds: resendIn }) : loc.abtm.resend_code,
            resendText,
            resendIn > 0,
          )}
          {link(loc.abtm.email_instead, emailInstead, false, 'AbtmEmailInstead')}
        </>
      );
      break;
    case 'email_backup_code':
      content = (
        <>
          <Title>{loc.abtm.email_code_title}</Title>
          <Body muted>{loc.abtm.email_backup_sent}</Body>
          <Gap />
          {codeField(checkEmailBackup)}
          <Gap />
          <Button title={loc.abtm.sign_in} onPress={checkEmailBackup} disabled={busy || code.length !== 6} />
          <Gap size={8} />
          {link(loc.abtm.use_text_instead, () => go('code'))}
        </>
      );
      break;
    case 'email':
      content = (
        <>
          <Title>{loc.abtm.new_account_title}</Title>
          <Body muted>{loc.abtm.new_account_intro}</Body>
          <Gap />
          <Label>{loc.abtm.first_name_label}</Label>
          <Field
            testID="AbtmFirstName"
            value={firstName}
            onChangeText={setFirstName}
            textContentType="givenName"
            autoComplete="given-name"
          />
          <Gap />
          <Label>{loc.abtm.email_label}</Label>
          <Field
            testID="AbtmEmail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={sendEmail}
          />
          <Gap />
          <Button testID="AbtmSendEmailCode" title={loc.abtm.send_email_code} onPress={sendEmail} disabled={busy || !email.includes('@')} />
        </>
      );
      break;
    case 'email_code':
      content = (
        <>
          <Title>{loc.abtm.email_code_title}</Title>
          <Body muted>{loc.formatString(loc.abtm.email_code_sent_to, { email: signup.current.maskedEmail || email })}</Body>
          <Gap />
          {codeField(checkEmail)}
          <Gap />
          <Button testID="AbtmCheckEmailCode" title={loc._.continue} onPress={checkEmail} disabled={busy || code.length !== 6} />
          <Gap size={8} />
          {link(loc.abtm.change_email, () => setStep('email'))}
        </>
      );
      break;
    case 'terms':
      content = (
        <>
          <Title>{loc.abtm.terms_title}</Title>
          <Body muted>{loc.abtm.terms_intro}</Body>
          <Gap size={8} />
          {link(loc.abtm.terms_of_service, () => terms && Linking.openURL(terms.termsUrl))}
          {link(loc.abtm.privacy_policy, () => terms && Linking.openURL(terms.privacyUrl))}
          <Gap size={8} />
          <AgreeRow testID="AbtmAgree" value={agreed} onChange={setAgreed} label={loc.abtm.terms_agree} />
          <Gap />
          <Button testID="AbtmCreateAccount" title={loc.abtm.create_account} onPress={createAccount} disabled={busy || !agreed} />
        </>
      );
      break;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.elevated }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {content}
        {error ? (
          <>
            <Gap size={12} />
            <ErrorText>{error}</ErrorText>
          </>
        ) : null}
        {notice ? (
          <>
            <Gap size={12} />
            <Body muted>{notice}</Body>
          </>
        ) : null}
        <Gap size={32} />
        <Body muted>{loc.formatString(loc.abtm.need_help, { phone: SUPPORT_PHONE })}</Body>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AbtmSignIn;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20 },
  link: { paddingVertical: 10 },
  linkText: { fontSize: 16, fontWeight: '600' },
});
