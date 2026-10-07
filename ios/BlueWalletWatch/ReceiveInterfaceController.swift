//
//  ReceiveInterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/12/19.

import WatchKit
import WatchConnectivity
import Foundation

class ReceiveInterfaceController: WKInterfaceController {

    static let identifier = "ReceiveInterfaceController"
    private var wallet: Wallet?
    private var receiveMethod: ReceiveMethod = .Onchain
    private var interfaceMode: ReceiveInterfaceMode = .Address
    var receiveType: ReceiveType = .Address
    @IBOutlet weak var addressLabel: WKInterfaceLabel!
    @IBOutlet weak var loadingIndicator: WKInterfaceGroup!
    @IBOutlet weak var imageInterface: WKInterfaceImage!
    private let userActivity: NSUserActivity = NSUserActivity(activityType: HandoffIdentifier.ReceiveOnchain.rawValue)

    override func willActivate() {
        super.willActivate()
        userActivity.title = HandOffTitle.ReceiveOnchain.rawValue
        userActivity.requiredUserInfoKeys = [HandOffUserInfoKey.ReceiveOnchain.rawValue]
        userActivity.isEligibleForHandoff = true
        update(userActivity)
    }

    override func awake(withContext context: Any?) {
        super.awake(withContext: context)
        guard let passedContext = context as? (Int, ReceiveMethod, ReceiveType) else {
            pop()
            return
        }
        let wallet = WatchDataSource.shared.wallets[passedContext.0]
        self.wallet = wallet
        receiveMethod = passedContext.1
        receiveType = passedContext.2
        setupView()
    }

    private func setupView() {
      if receiveMethod == .CreateInvoice && (wallet?.type == .lightningCustodianWallet) {
        presentController(withName: SpecifyInterfaceController.identifier, context: wallet?.id)
        } else {
            setupQRCode()
            setupMenuItems()
        }
    }

    private func setupQRCode() {
      guard let address = receiveType == .Address ? wallet?.receiveAddress : wallet?.paymentCode else { return }
        addressLabel.setText(address)
        // QR code display not available on watchOS — show address text instead
        loadingIndicator.setHidden(true)
        imageInterface.setHidden(true)
        addressLabel.setHidden(false)
    }

    private func setupMenuItems() {
        clearAllMenuItems()
        addMenuItem(with: .shuffle, title: "Toggle View", action: #selector(toggleViewButtonPressed))
    }

    @IBAction @objc func toggleViewButtonPressed() {
        interfaceMode = interfaceMode == .QRCode ? .Address : .QRCode
        updateView()
    }

    private func updateView() {
        addressLabel.setHidden(interfaceMode != .Address)
        imageInterface.setHidden(interfaceMode != .QRCode)
    }

    override func didAppear() {
        super.didAppear()
        if isCreatingInvoice() {
            presentController(withName: SpecifyInterfaceController.identifier, context: wallet?.id)
        }
    }

    private func isCreatingInvoice() -> Bool {
      return receiveMethod == .CreateInvoice && (wallet?.type == .lightningCustodianWallet)
    }

    override func didDeactivate() {
        super.didDeactivate()
        NotificationCenter.default.removeObserver(self)
        userActivity.invalidate()
    }
}

