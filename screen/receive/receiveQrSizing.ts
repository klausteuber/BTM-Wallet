export const RECEIVE_QR_MIN_SIZE = 180;
export const RECEIVE_QR_MAX_SIZE = 260;
export const ATM_RECEIVE_QR_MAX_SIZE = 220;
export const ATM_RECEIVE_QR_FULLSCREEN_SIZE = 260;

const PORTRAIT_HORIZONTAL_SAFE_SPACE = 40;

type ReceiveQRCodeSizeParams = {
  height: number;
  width: number;
  isAtmMode?: boolean;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const getReceiveQRCodeSize = ({ height, width, isAtmMode = false }: ReceiveQRCodeSizeParams): number => {
  const isPortrait = height > width;

  if (isAtmMode) {
    const heightBasedSize = height * (isPortrait ? 0.32 : 0.48);
    const widthBasedSize = width * (isPortrait ? 0.58 : 0.32);
    return Math.round(clamp(Math.min(heightBasedSize, widthBasedSize), RECEIVE_QR_MIN_SIZE, ATM_RECEIVE_QR_MAX_SIZE));
  }

  const heightBasedSize = height * (isPortrait ? 0.42 : 0.58);
  const widthBasedSize = isPortrait ? width * 0.66 - PORTRAIT_HORIZONTAL_SAFE_SPACE : width * 0.36;

  return Math.round(clamp(Math.min(heightBasedSize, widthBasedSize), RECEIVE_QR_MIN_SIZE, RECEIVE_QR_MAX_SIZE));
};
