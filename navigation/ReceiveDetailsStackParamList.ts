export type ReceiveDetailsStackParamList = {
  ReceiveDetails: {
    walletID?: string;
    address?: string;
    mode?: 'atm' | 'default';
    entryPoint?: 'atm' | 'advanced';
  };
};
