# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with this codebase.

## Project Overview

BlueWallet is a Bitcoin and Lightning Network wallet built with React Native. It supports iOS, Android, and macOS (via Mac Catalyst). The app uses Electrum servers for blockchain data and supports SegWit, Replace-By-Fee, and various wallet types.

## Common Commands

### Development
```bash
npm install              # Install dependencies
npm start                # Start Metro bundler
npx react-native run-ios     # Run on iOS simulator
npx react-native run-android # Run on Android emulator
npx pod-install          # Install iOS CocoaPods dependencies
```

### Testing
```bash
npm test                 # Run lint + unit + integration tests
npm run lint             # Run ESLint and TypeScript checks
npm run tslint           # TypeScript type checking only
npm run unit             # Run unit tests only
npm run integration      # Run integration tests only
```

### E2E Testing (Detox)
```bash
npm run e2e:debug-build  # Build debug APK for e2e
npm run e2e:debug-test   # Run e2e tests on Android debug
```

### Cleaning
```bash
npm run clean            # Full clean (Android gradle, node_modules, cache)
npm run clean:ios        # Clean iOS (node_modules, Pods, cache)
```

## Architecture

### Directory Structure
- `screen/` - Screen components (organized by feature)
- `components/` - Reusable UI components
- `class/` - Wallet classes and business logic
- `blue_modules/` - Core modules (Electrum client, encryption, storage)
- `navigation/` - React Navigation configuration
- `hooks/` - Custom React hooks
- `helpers/` - Utility functions
- `loc/` - Localization files (translations)
- `models/` - Data models
- `typings/` - TypeScript type definitions
- `tests/` - Unit and integration tests
- `ios/` - iOS native code and Xcode project
- `android/` - Android native code and Gradle project

### Key Technologies
- **React Native 0.78** with React 19
- **TypeScript** for type safety
- **React Navigation 7** for navigation
- **Realm** for local database
- **bitcoinjs-lib** for Bitcoin operations
- **Electrum** protocol for blockchain queries

## Code Style

### Formatting
- Uses Prettier with: single quotes, 140 char print width, trailing commas
- ESLint with TypeScript and React Native plugins
- No inline styles allowed (`react-native/no-inline-styles`)
- Run `npm run lint:fix` to auto-fix issues

### TypeScript
- Strict mode enabled
- Prefer `.tsx` for components, `.ts` for utilities
- Type definitions in `typings/` directory

### Patterns
- Functional components with hooks preferred
- Custom hooks in `hooks/` directory
- Screen components receive navigation props via React Navigation
- Use `useTheme()` hook for theming

## Testing

- **Unit tests**: `tests/unit/` - Test individual functions and classes
- **Integration tests**: `tests/integration/` - Test module interactions
- **E2E tests**: Uses Detox for end-to-end testing
- Jest configuration in `jest.config.js`
- Mocks in `__mocks__/` directory

## Important Notes

- Node.js >= 20 required (see `engines` in package.json)
- iOS development requires Rosetta-compatible simulator for debugging
- Private keys never leave the device - security is paramount
- Translations managed via Transifex
