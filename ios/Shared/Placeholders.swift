//
//  Models.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/1/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import Foundation



let emptyMarketData = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
let emptyWalletData = WalletData(balance: 0, latestTransactionTime:  LatestTransaction(isUnconfirmed: false, epochValue: Int64(Date().timeIntervalSince1970)))

