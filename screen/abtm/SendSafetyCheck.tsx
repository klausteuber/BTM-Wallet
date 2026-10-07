import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Text } from '@rneui/themed';
import Button from '../../components/Button';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { getAbtmAccountState, refreshAbtmAccount } from '../../hooks/useAbtmAccount';
import { AddressCheck, beginHolds, evaluateSend, holdMsFor, SUPPORT_PHONE } from '../../blue_modules/send-guard';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import loc from '../../loc';
import { Body, Card, Field, Gap, Label, Title } from './ui';

type Route = RouteProp<SendDetailsStackParamList, 'SendSafetyCheck'>;
type Answer = 'yes' | 'no' | undefined;

const QUESTION_IDS = ['Stranger', 'Authority', 'OnPhone'];
const questionText = () => [loc.abtm.scam_q_stranger, loc.abtm.scam_q_authority, loc.abtm.scam_q_on_phone];

async function isSenior(): Promise<boolean> {
  let state = getAbtmAccountState();
  if (state.status !== 'signed_out' && !state.profile) {
    await refreshAbtmAccount();
    state = getAbtmAccountState();
  }
  return state.profile?.age65Plus === true;
}

function holdLength(ms: number): string {
  return ms >= 60 * 60 * 1000
    ? (loc.formatString(loc.abtm.hold_hours, { hours: Math.round(ms / 3600000) }) as string)
    : (loc.formatString(loc.abtm.hold_minutes, { minutes: Math.round(ms / 60000) }) as string);
}

function shortAddress(address: string): string {
  return address.length > 20 ? `${address.slice(0, 10)}…${address.slice(-8)}` : address;
}

/**
 * Shown instead of Confirm when a send goes to an address this phone has never paid:
 * three scam questions (any "yes" stops the send), then a hold before the address can
 * be used. 15 minutes; 24 hours plus a typed confirmation for customers 65 and older.
 */
const SendSafetyCheck: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useExtendedNavigation();
  const { addresses } = useRoute<Route>().params;
  const { wallets } = useStorage();
  const [checks, setChecks] = useState<AddressCheck[] | null>(null);
  const [senior, setSenior] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([undefined, undefined, undefined]);
  const [phrase, setPhrase] = useState('');
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [result, isOld] = await Promise.all([evaluateSend(addresses, wallets as any), isSenior()]);
    setChecks(result);
    setSenior(isOld);
  }, [addresses, wallets]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const newOnes = useMemo(() => (checks || []).filter(c => c.status === 'new'), [checks]);
  const held = useMemo(() => (checks || []).filter(c => c.status === 'on_hold' || c.status === 'cleared'), [checks]);
  const holdUntil = held.reduce((latest, c) => Math.max(latest, c.holdUntil || 0), 0);
  const saidYes = answers.includes('yes');
  const allNo = answers.every(a => a === 'no');
  const phraseOk = phrase.trim().toLowerCase() === (loc.abtm.senior_phrase as string).toLowerCase();

  const cancelSend = () => navigation.getParent()?.goBack();
  const backToSend = () => navigation.goBack();
  const callUs = () => Linking.openURL(`tel:${SUPPORT_PHONE}`);

  const startHold = async () => {
    setBusy(true);
    try {
      await beginHolds(
        newOnes.map(c => c.address),
        senior,
      );
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!checks) {
    return (
      <View style={[styles.center, { backgroundColor: colors.elevated }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const answerRow = (index: number) => {
    const key = QUESTION_IDS[index];
    const choose = (value: Answer) => setAnswers(prev => prev.map((a, i) => (i === index ? value : a)));
    const choice = (value: 'yes' | 'no', title: string) => {
      const selected = answers[index] === value;
      return (
        <TouchableOpacity
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          testID={`AbtmScam${key}_${value}`}
          onPress={() => choose(value)}
          style={[
            styles.choice,
            {
              borderColor: selected ? colors.foregroundColor : colors.formBorder,
              backgroundColor: selected ? colors.foregroundColor : colors.inputBackgroundColor,
            },
          ]}
        >
          <Text style={[styles.choiceText, { color: selected ? colors.background : colors.foregroundColor }]}>
            {selected ? `✓ ${title}` : title}
          </Text>
        </TouchableOpacity>
      );
    };
    return (
      <View key={key} style={styles.question}>
        <Body>{questionText()[index]}</Body>
        <Gap size={8} />
        <View style={styles.choices}>
          {choice('no', loc._.no)}
          <View style={styles.choiceGap} />
          {choice('yes', loc._.yes)}
        </View>
      </View>
    );
  };

  let content: React.ReactNode;
  if (newOnes.length > 0 && saidYes) {
    content = (
      <Card testID="AbtmScamStop">
        <Title>{loc.abtm.scam_stop_title}</Title>
        <Body>{loc.abtm.scam_stop}</Body>
        <Gap />
        <Button title={loc.formatString(loc.abtm.call_us, { phone: SUPPORT_PHONE }) as string} onPress={callUs} />
        <Gap size={10} />
        <SecondButton title={loc.abtm.cancel_send} onPress={cancelSend} testID="AbtmCancelSend" />
      </Card>
    );
  } else if (newOnes.length > 0) {
    content = (
      <>
        <Card>
          <Title>{loc.abtm.new_address_title}</Title>
          <Body>{loc.formatString(loc.abtm.new_address_intro, { duration: holdLength(holdMsFor(senior)) })}</Body>
          <Gap size={10} />
          {newOnes.map(c => (
            <Body key={c.address} muted selectable>
              {shortAddress(c.address)}
            </Body>
          ))}
        </Card>
        <Card>
          <Label>{loc.abtm.scam_questions_label}</Label>
          {QUESTION_IDS.map((_, i) => answerRow(i))}
        </Card>
        {senior && allNo ? (
          <Card testID="AbtmSeniorCheck">
            <Title>{loc.abtm.senior_title}</Title>
            <Body>{loc.abtm.senior_intro}</Body>
            <Gap />
            <SecondButton title={loc.formatString(loc.abtm.call_us, { phone: SUPPORT_PHONE }) as string} onPress={callUs} />
            <Gap />
            <Body>{loc.formatString(loc.abtm.senior_type_phrase, { phrase: loc.abtm.senior_phrase })}</Body>
            <Gap size={8} />
            <Field testID="AbtmSeniorPhrase" value={phrase} onChangeText={setPhrase} autoCapitalize="characters" autoCorrect={false} />
          </Card>
        ) : null}
        <Card>
          <Button
            testID="AbtmStartHold"
            title={loc.formatString(loc.abtm.start_hold, { duration: holdLength(holdMsFor(senior)) }) as string}
            onPress={startHold}
            disabled={busy || !allNo || (senior && !phraseOk)}
          />
          <Gap size={10} />
          <SecondButton title={loc.abtm.cancel_send} onPress={cancelSend} />
        </Card>
      </>
    );
  } else if (holdUntil > now) {
    const until = new Date(holdUntil);
    const sameDay = until.toDateString() === new Date(now).toDateString();
    const when = sameDay
      ? until.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : until.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    const left = Math.ceil((holdUntil - now) / 1000);
    const h = Math.floor(left / 3600);
    const m = Math.floor((left % 3600) / 60);
    const s = left % 60;
    const countdown = h > 0 ? `${h}h ${m}m` : `${m}:${s < 10 ? '0' : ''}${s}`;
    content = (
      <Card testID="AbtmOnHold">
        <Title>{loc.abtm.on_hold_title}</Title>
        <Body>{loc.formatString(loc.abtm.on_hold, { when })}</Body>
        <Gap />
        <Text style={[styles.countdown, { color: colors.foregroundColor }]}>{countdown}</Text>
        <Gap />
        <Body muted>{loc.abtm.on_hold_note}</Body>
        <Gap />
        <SecondButton title={loc.abtm.cancel_send} onPress={cancelSend} />
      </Card>
    );
  } else {
    content = (
      <Card testID="AbtmHoldDone">
        <Title>{loc.abtm.hold_done_title}</Title>
        <Body>{loc.abtm.hold_done}</Body>
        <Gap />
        <Button title={loc.abtm.back_to_send} onPress={backToSend} />
      </Card>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.elevated }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {content}
    </ScrollView>
  );
};

export default SendSafetyCheck;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  question: { marginTop: 14 },
  choices: { flexDirection: 'row' },
  choiceGap: { width: 12 },
  choice: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  choiceText: { fontSize: 16, fontWeight: '600' },
  countdown: { fontSize: 40, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
});
