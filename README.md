# 💰 Pocket Log

A personal finance mobile app built with **React Native**. Track expenses, income, and transfers across multiple accounts with a hierarchical category system, biometric security, and a clean month-view ledger.

---

## 📚 Documentation

| Document | Description |
|---|---|
| [Architecture](./docs/architecture.md) | Full technical architecture, directory structure, data flow |
| [Agent Context](./.agents/CONTEXT.md) | High-density reference for AI development |
| [Task Plan](./docs/task_plan.md) | Detailed feature checklist and completion status |
| [Test Cases](./docs/test_cases.md) | 75+ test cases organized by checkpoint |
| [Privacy Policy](./docs/privacy_policy.md) | App privacy policy for store listings |

---

## ✨ Features

### 💸 Transactions
- **Add / Edit / Delete** expenses, income, and transfers with strict numeric validation.
- **Atomic Transfers** — Linked debit/credit pair entries with safe deletion and "From → To" display.
- **Closed-box account transfers** — Transfers to excluded accounts count as expenses in the global summary; transfers from them count as income.

### 📅 Ledger
- **Month-view Ledger** — Day-grouped transaction list with a unified month selector and summary header.
- **Carry Forward Balance** — Optional opening balance row showing the net carry-over from prior months.

### 🏦 Accounts
- **Multi-account support** — Bank, Cash, Card, Wallet, and more.
- **Nested Reserves** — 1-level deep reserve accounts inside a parent account.
- **Exclude from summaries** — Mark accounts as closed-box to hide them from global totals.

### 🗂️ Categories
- **3-level hierarchy** — Full parent → child → grandchild category tree with emoji icons.
- **Separate Expense and Income trees** — Independent category sets per transaction type.
- **Drill-down picker** — Hierarchical navigation for selecting categories.

### ⚙️ Settings
- **Theme profiles** — Light, Dark, and System Default.
- **Dynamic currency** — User-defined currency symbol applied globally.
- **Export data** — Save all transactions to CSV or XLSX via the system share sheet.
- **Import data** — Restore or append data from a CSV or XLSX file.

### 🔒 Security
- **PIN lock screen** — 4-digit PIN stored in the device keychain.
- **Biometric unlock** — Face ID / Touch ID / fingerprint as an optional PIN substitute.
- **Auto-lock** — App locks automatically when moved to the background.

### 🎨 UI
- **iOS Settings style** — Squircle-rounded cards and grouped sections throughout.
- **Native branding** — Custom splash screen and app icon.
- **Fully offline** — No account, no internet, no tracking.

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

## 🔧 Troubleshooting

### Android: CMake fails after Clean Project — missing codegen JNI directories

**Symptom:** `Execution failed for task ':app:externalNativeBuildCleanDebug'` with CMake errors like:
```
add_subdirectory given source ".../node_modules/@op-engineering/op-sqlite/android/build/generated/source/codegen/jni/" which is not an existing directory.
```

**Cause:** Android Studio's "Clean Project" deletes the `build/generated/source/codegen/jni/` directories inside each native module. CMake then tries to re-run but can't find them.

**Fix:** Run codegen manually before rebuilding:
```sh
cd android
.\gradlew.bat generateCodegenArtifactsFromSchema
cd ..
```
Then do **Build → Rebuild Project** in Android Studio (do not clean again).

**Better alternative** — use the CLI instead of Android Studio clean+rebuild:
```sh
cd android && .\gradlew.bat generateCodegenArtifactsFromSchema && cd .. && npm run android
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
