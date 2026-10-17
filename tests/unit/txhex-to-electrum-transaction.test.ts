import assert from "assert";

import { txhexToElectrumTransaction } from "../../blue_modules/BlueElectrum";

describe("txhexToElectrumTransaction", () => {
  it("decodes a transaction with an OP_RETURN output instead of throwing", () => {
    // Mainnet tx d45818ae11a584357f7b74da26012d2becf4ef064db015a45bdfcd9cb438929d: an OP_RETURN spam message
    // plus two P2PKH outputs. Servers that send raw hex route through this decoder; it used to throw on the
    // OP_RETURN, failing the whole history fetch of any wallet that received such a transaction.
    const tx = txhexToElectrumTransaction(
      "02000000018258b8515382f1d9f6448e413864008f3865e4d9f15d433c13f454ebbd9390ac020000006a47304402203d8a15d46d3c84b639c0f156d61d3e1526283f05ad6df013b77a6e66cff874780220089f7d864b81c97c65070a3080bfd447b92ed10735312aeaf7ab3caa53df71890121034d53163932c9b93942c4361f2f0ff3b3aadb2e50806d32f4ff9f709e86fc6456fdffffff0300000000000000003a6a385765276c6c2062757920796f757220426974636f696e732e2073656c6c2e6275792e626974636f696e4070726f746f6e6d61696c2e636f6d22020000000000001976a914f6bed9eccb7f13a363dcd352aafcd7daeab6f18788acee994000000000001976a91472e6844820795902150bc0f56c5efc4fe5667edf88ac00000000",
    );

    assert.strictEqual(
      tx.txid,
      "d45818ae11a584357f7b74da26012d2becf4ef064db015a45bdfcd9cb438929d",
    );
    assert.strictEqual(tx.vout.length, 3);

    assert.strictEqual(tx.vout[0].scriptPubKey.type, "nulldata");
    assert.deepStrictEqual(tx.vout[0].scriptPubKey.addresses, []);
    assert.strictEqual(tx.vout[0].value, 0);

    assert.deepStrictEqual(tx.vout[1].scriptPubKey.addresses, [
      "1PVfrmbn1vSMoFZB2Ga7nDuXLFDyJZHrHK",
    ]);
    assert.strictEqual(tx.vout[1].value, 0.00000546);
    assert.deepStrictEqual(tx.vout[2].scriptPubKey.addresses, [
      "1BUYBTC1oYQtAjktSRZUtjkeBJ15ABc5bb",
    ]);
    assert.strictEqual(tx.vout[2].value, 0.0423371);
  });
});
