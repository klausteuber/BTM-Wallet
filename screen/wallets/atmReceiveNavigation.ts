import { CommonActions } from '@react-navigation/native';

export const createATMReceiveResetAction = (walletID: string) =>
  CommonActions.reset({
    index: 0,
    routes: [
      {
        name: 'DrawerRoot',
        state: {
          index: 0,
          routes: [
            {
              name: 'DetailViewStackScreensStack',
              state: {
                index: 1,
                routes: [
                  {
                    name: 'WalletsList',
                  },
                  {
                    name: 'ReceiveDetails',
                    params: {
                      walletID,
                      mode: 'atm',
                      entryPoint: 'atm',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  });
