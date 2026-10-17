import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, TextInput } from 'react-native';
import Button from '../../components/Button';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { pairedWalletApi, SmsMarketingOffer } from '../../blue_modules/paired-wallet-api';
import { refreshAbtmAccount } from '../../hooks/useAbtmAccount';
import { markSignedInJustNow, registrableWallets } from '../../blue_modules/abtm-wallet';
import { useStorage } from '../../hooks/context/useStorage';
import { SUPPORT_PHONE } from '../../blue_modules/send-guard';
import loc from '../../loc';
import AgreeRow from './AgreeRow';
import {
  AuthFooter,
  AuthScreen,
  AuthTitle,
  Body,
  CodeField,
  ErrorText,
  Field,
  formatPhoneInput,
  Gap,
  Hint,
  Label,
  LinkButton,
  LinkRow,
  Notice,
  PhoneField,
  phoneDigits,
  Steps,
} from './ui';

type Step = 'phone' | 'code' | 'email_backup_code' | 'email' | 'email_code' | 'terms';

const RESEND_SECONDS = 30;

/**
 * Sign in or create an account, starting with the phone number (like the website):
 * a texted code signs an existing customer in; a new number goes on to confirm an
 * email address with a code and accept the Terms.
 */
const AbtmSignIn: React.FC = () => {
  const navigation = useExtendedNavigation();
  const { wallets } = useStorage();
  const hasWallet = registrableWallets(wallets).length > 0;
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [agreed, setAgreed] = useState(false);
  // Promo texts: optional, never pre-ticked, and never a condition of the account.
  const [smsAgreed, setSmsAgreed] = useState(false);
  const [smsOffer, setSmsOffer] = useState<SmsMarketingOffer | null>(null);
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
    markSignedInJustNow();
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
      setSmsOffer(result.smsMarketing && result.smsMarketing.version && result.smsMarketing.text ? result.smsMarketing : null);
      setSmsAgreed(false);
      setStep('terms');
    });

  const createAccount = () =>
    run(async () => {
      await pairedWalletApi.signupComplete(
        signup.current.verifiedToken!,
        terms!.version,
        phoneDigits(phone),
        smsOffer && smsAgreed ? smsOffer.version : null,
      );
      await finish();
    });

  const codeField = (onSubmit: () => void) => (
    <CodeField
      ref={codeInput}
      testID="AbtmCode"
      value={code}
      onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="sms-otp"
      maxLength={6}
      placeholder="••••••"
      returnKeyType="done"
      onSubmitEditing={onSubmit}
    />
  );

  // New accounts walk through Phone → Email → Terms, shown as the website's step pills.
  const signupSteps = (current: 0 | 1 | 2) => (
    <Steps
      items={[loc.abtm.step_phone, loc.abtm.step_email, loc.abtm.step_terms].map((label, index) => ({
        label,
        state: index < current ? 'done' : index === current ? 'current' : 'todo',
      }))}
    />
  );

  let content: React.ReactNode;
  switch (step) {
    case 'phone':
      content = (
        <>
          <AuthTitle>{loc.abtm.signin_title}</AuthTitle>
          <Body muted>{loc.abtm.signin_intro}</Body>
          <Gap size={20} />
          <Label>{loc.abtm.phone_label}</Label>
          <PhoneField
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
          <Hint>{loc.abtm.phone_hint}</Hint>
          {hasWallet ? <Hint>{loc.abtm.signin_wallet_link}</Hint> : null}
          <Gap size={22} />
          <Button
            testID="AbtmSendCode"
            title={loc.abtm.send_code}
            onPress={sendText}
            disabled={busy || phoneDigits(phone).length !== 10}
            showActivityIndicator={busy}
          />
        </>
      );
      break;
    case 'code':
      content = (
        <>
          <AuthTitle>{loc.abtm.code_title}</AuthTitle>
          <Body muted>{loc.formatString(loc.abtm.code_sent_to, { phone: `+1 ${phone}` })}</Body>
          <Gap size={20} />
          {codeField(checkText)}
          <Gap size={22} />
          <Button
            testID="AbtmCheckCode"
            title={loc._.continue}
            onPress={checkText}
            disabled={busy || code.length !== 6}
            showActivityIndicator={busy}
          />
          <LinkRow>
            <LinkButton
              title={resendIn > 0 ? (loc.formatString(loc.abtm.resend_in, { seconds: resendIn }) as string) : loc.abtm.resend_code}
              onPress={resendText}
              disabled={busy || resendIn > 0}
            />
            <LinkButton title={loc.abtm.email_instead} onPress={emailInstead} disabled={busy} testID="AbtmEmailInstead" />
          </LinkRow>
        </>
      );
      break;
    case 'email_backup_code':
      content = (
        <>
          <AuthTitle>{loc.abtm.email_code_title}</AuthTitle>
          <Body muted>{loc.abtm.email_backup_sent}</Body>
          <Gap size={20} />
          {codeField(checkEmailBackup)}
          <Gap size={22} />
          <Button title={loc.abtm.sign_in} onPress={checkEmailBackup} disabled={busy || code.length !== 6} showActivityIndicator={busy} />
          <LinkRow>
            <LinkButton title={loc.abtm.use_text_instead} onPress={() => go('code')} disabled={busy} />
          </LinkRow>
        </>
      );
      break;
    case 'email':
      content = (
        <>
          {signupSteps(1)}
          <AuthTitle>{loc.abtm.new_account_title}</AuthTitle>
          <Body muted>{loc.abtm.new_account_intro}</Body>
          <Gap size={20} />
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
          <Gap size={22} />
          <Button
            testID="AbtmSendEmailCode"
            title={loc.abtm.send_email_code}
            onPress={sendEmail}
            disabled={busy || !email.includes('@')}
            showActivityIndicator={busy}
          />
        </>
      );
      break;
    case 'email_code':
      content = (
        <>
          {signupSteps(1)}
          <AuthTitle>{loc.abtm.email_code_title}</AuthTitle>
          <Body muted>{loc.formatString(loc.abtm.email_code_sent_to, { email: signup.current.maskedEmail || email })}</Body>
          <Gap size={20} />
          {codeField(checkEmail)}
          <Gap size={22} />
          <Button
            testID="AbtmCheckEmailCode"
            title={loc._.continue}
            onPress={checkEmail}
            disabled={busy || code.length !== 6}
            showActivityIndicator={busy}
          />
          <LinkRow>
            <LinkButton title={loc.abtm.change_email} onPress={() => setStep('email')} disabled={busy} />
          </LinkRow>
        </>
      );
      break;
    case 'terms':
      content = (
        <>
          {signupSteps(2)}
          <AuthTitle>{loc.abtm.terms_title}</AuthTitle>
          <Body muted>{loc.abtm.terms_intro}</Body>
          <LinkRow>
            <LinkButton title={loc.abtm.terms_of_service} onPress={() => terms && Linking.openURL(terms.termsUrl)} />
            <LinkButton title={loc.abtm.privacy_policy} onPress={() => terms && Linking.openURL(terms.privacyUrl)} />
          </LinkRow>
          <Gap size={14} />
          <AgreeRow testID="AbtmAgree" value={agreed} onChange={setAgreed} label={loc.abtm.terms_agree} />
          {smsOffer ? (
            <>
              <Gap size={18} />
              <Label>{loc.abtm.sms_optin_label}</Label>
              <Gap size={6} />
              {/* The server's exact wording: its version is what gets recorded as agreed to. */}
              <AgreeRow testID="AbtmSmsOptIn" value={smsAgreed} onChange={setSmsAgreed} label={smsOffer.text} />
            </>
          ) : null}
          <Gap size={22} />
          <Button
            testID="AbtmCreateAccount"
            title={loc.abtm.create_account}
            onPress={createAccount}
            disabled={busy || !agreed}
            showActivityIndicator={busy}
          />
        </>
      );
      break;
  }

  return (
    <AuthScreen footer={<AuthFooter>{loc.formatString(loc.abtm.need_help, { phone: SUPPORT_PHONE })}</AuthFooter>}>
      {error ? (
        <>
          <ErrorText>{error}</ErrorText>
          <Gap size={16} />
        </>
      ) : null}
      {notice ? (
        <>
          <Notice>{notice}</Notice>
          <Gap size={16} />
        </>
      ) : null}
      {content}
    </AuthScreen>
  );
};

export default AbtmSignIn;
