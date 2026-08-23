import { BlueDarkTheme, BlueDefaultTheme } from '../../components/themes';

const relativeLuminance = (hex: string): number => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map(channel => parseInt(channel, 16) / 255)
    .map(channel => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

describe('theme text contrast', () => {
  const pairs = [
    ['light secondary text', BlueDefaultTheme.colors.alternativeTextColor, BlueDefaultTheme.colors.elevated],
    ['light used-address balance', BlueDefaultTheme.colors.darkGray, BlueDefaultTheme.colors.elevated],
    ['light success text', BlueDefaultTheme.colors.successColor, BlueDefaultTheme.colors.elevated],
    ['light incoming icon', BlueDefaultTheme.colors.incomingForegroundColor, BlueDefaultTheme.colors.ballReceive],
    ['light fee value', BlueDefaultTheme.colors.feeValue, BlueDefaultTheme.colors.feeLabel],
    ['light change badge', BlueDefaultTheme.colors.changeText, BlueDefaultTheme.colors.changeBackground],
    ['light receive badge', BlueDefaultTheme.colors.receiveText, BlueDefaultTheme.colors.receiveBackground],
    ['light error status', BlueDefaultTheme.colors.redText, BlueDefaultTheme.colors.redBG],
    ['dark secondary text', BlueDarkTheme.colors.alternativeTextColor, BlueDarkTheme.colors.elevated],
    ['dark used-address balance', BlueDarkTheme.colors.darkGray, BlueDarkTheme.colors.elevated],
    ['dark success text', BlueDarkTheme.colors.successColor, BlueDarkTheme.colors.elevated],
    ['dark incoming icon', BlueDarkTheme.colors.incomingForegroundColor, BlueDarkTheme.colors.ballReceive],
    ['dark fee value', BlueDarkTheme.colors.feeValue, BlueDarkTheme.colors.feeLabel],
    ['dark change badge', BlueDarkTheme.colors.changeText, BlueDarkTheme.colors.changeBackground],
    ['dark error status', BlueDarkTheme.colors.redText, BlueDarkTheme.colors.redBG],
  ] as const;

  it.each(pairs)('%s meets WCAG AA for normal text', (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
