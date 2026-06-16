import { createATMReceiveResetAction } from '../../screen/wallets/atmReceiveNavigation';

describe('createATMReceiveResetAction', () => {
  it('keeps WalletsList behind ATM ReceiveDetails so the QR screen can close', () => {
    const action = createATMReceiveResetAction('wallet-123') as any;
    const drawerRoot = action.payload.routes[0];
    const detailStack = drawerRoot.state.routes[0];

    expect(detailStack.state.index).toBe(1);
    expect(detailStack.state.routes).toEqual([
      { name: 'WalletsList' },
      {
        name: 'ReceiveDetails',
        params: {
          walletID: 'wallet-123',
          mode: 'atm',
          entryPoint: 'atm',
        },
      },
    ]);
  });
});
