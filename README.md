# 💰 Pocket Log

A personal finance mobile app built with **React Native**. Track expenses, income, and transfers across multiple accounts with a hierarchical category system, biometric security, and a clean month-view ledger.

---

## 📚 Documentation

| Document | Description |
|---|---|
| [Architecture](./docs/architecture.md) | Full technical architecture, directory structure, data flow |
| [Task Plan](./docs/task_plan.md) | Detailed feature checklist and completion status |
| [Test Cases](./docs/test_cases.md) | 75+ test cases organized by checkpoint |

---

## ✨ Features (Milestone 1)

- 📅 **Unified Ledger Header** — Merged month selector and monthly summary in a single clean bubble.
- ⏭️ **Carry Forward Balance** — Option to see previous month's net balance as an opening balance row.
- ➕ **Add / Edit / Delete** transactions (expense, income, transfer) with strict numeric validation.
- 🏦 **Multi-account** support (Bank, Cash, Card, Wallet, etc.) with grouped selection.
- 🗂️ **3-level Hierarchical Categories** with emoji icons.
- 🔄 **Atomic Transfers** — Linked debit/credit entries with safe deletion and "From → To" display.
- ⚙️ **iOS Settings Style** — Squircle-rounded lists and grouped sections throughout the app.
- 🔒 **Biometric / PIN Lock Screen** — Secured via `react-native-keychain`.
- 🌄 **Native Branding** — Custom "Pocket Log" splash screen and app icon.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI | React Native 0.84 + TypeScript |
| Navigation | React Navigation 7 (Tabs + Stack) |
| Database | `op-sqlite` + Drizzle ORM |
| State | Zustand |
| Security | `react-native-keychain`, `react-native-biometrics` |
| Styling | Vanilla StyleSheet (Navy Blue `#1B3A5C` accent) |

---

## 🚀 Getting Started

> Make sure you have completed the [React Native Environment Setup](https://reactnative.dev/docs/set-up-your-environment) before proceeding.

### 1. Install dependencies

```sh
npm install
```

### 2. Install iOS Pods

```sh
bundle install
bundle exec pod install
```

### 3. Start Metro

```sh
npm start
```

### 4. Run on Device / Simulator

```sh
# Android
npm run android

# iOS
npm run ios
```

---

## 🗂️ Project Structure

```
src/
├── core/           # Theme, constants, and utilities
├── database/       # Drizzle ORM schema, migrations, and seed
├── features/
│   ├── auth/       # Lock Screen (PIN + biometrics)
│   ├── ledger/     # Main ledger view & carry-forward logic
│   ├── transaction/# Add/edit form and pickers
│   └── settings/   # Settings hub & entity management
├── navigation/     # Root stack & bottom tab navigators
└── stores/         # Zustand global state (auth, ledger)
```

> See [Architecture](./docs/architecture.md) for full detail.

---

## 🔐 Security

PIN codes are stored securely in the device keychain (never in AsyncStorage or plain text). Biometric unlock (TouchID / FaceID) is triggered on app cold launch. The app automatically locks when moved to the background.

---

## 📄 License

Private project — all rights reserved.
