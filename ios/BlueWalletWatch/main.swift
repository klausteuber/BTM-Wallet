//
//  main.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 3/20/25.
//  Copyright © 2025 BlueWallet. All rights reserved.
//

import WatchKit
import Foundation

// WatchKit entry point for watch extension apps
WKApplicationMain(CommandLine.argc, CommandLine.unsafeArgv, NSStringFromClass(ExtensionDelegate.self))
