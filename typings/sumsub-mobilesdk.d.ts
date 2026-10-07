// The SumSub React Native module ships plain JS; these are the parts the app uses.
declare module '@sumsub/react-native-mobilesdk-module' {
  export type SNSStatusChangedEvent = { prevStatus: string; newStatus: string };

  export type SNSLaunchResult = {
    success: boolean;
    status: string;
    errorType?: string;
    errorMsg?: string;
    actionResult?: { actionId: string; answer: string };
  };

  interface SNSBuilder {
    withHandlers(handlers: { onStatusChanged?: (event: SNSStatusChangedEvent) => void; onEvent?: (event: any) => void }): SNSBuilder;
    withLocale(locale: string): SNSBuilder;
    withDebug(flag: boolean): SNSBuilder;
    withAnalyticsEnabled(flag: boolean): SNSBuilder;
    withAutoCloseOnApprove(seconds: number): SNSBuilder;
    withStrings(strings: Record<string, string>): SNSBuilder;
    build(): { launch(): Promise<SNSLaunchResult>; dismiss(): void };
  }

  const SNSMobileSDK: {
    init(accessToken: string, tokenExpirationHandler: () => Promise<string>): SNSBuilder;
  };
  export default SNSMobileSDK;
}
