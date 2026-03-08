# Privacy Policy — Pocket Log

**Effective Date:** March 8, 2026  
**Developer:** qubitPixel  
**App Name:** Pocket Log  
**Bundle ID:** com.qubitPixel.pocketLog  
**Platforms:** Android, iOS

---

## 1. Overview

Pocket Log is a personal finance tracking application. We take privacy seriously. This policy explains exactly what data the app accesses, where it is stored, and how it is used.

**The short version:** Everything stays on your device. We collect nothing. We share nothing. We have no servers.

---

## 2. Data We Collect and Store

All data created in Pocket Log is stored **locally on your device only** in a SQLite database. It never leaves your device unless you explicitly export it yourself.

### 2.1 Financial Data (You Create This)

| Data | Where Stored | Purpose |
|---|---|---|
| Transactions (amount, type, date, note, description) | On-device SQLite | Core app functionality |
| Accounts (name, type, balance, settings) | On-device SQLite | Account management |
| Categories (name, hierarchy, type) | On-device SQLite | Transaction categorisation |
| App settings (currency, theme, carry-forward toggle) | On-device SQLite | User preferences |

### 2.2 Security Credentials

| Data | Where Stored | Purpose |
|---|---|---|
| 4-digit PIN (hashed) | Device Keychain (iOS) / Keystore (Android) | App lock screen |
| Biometric preference (enabled/disabled) | Device local storage | Remember your auth choice |

The PIN is stored using your device's native secure credential storage (`react-native-keychain`). We never see it, and it never leaves your device.

### 2.3 Biometric Data

Pocket Log can optionally use Face ID, Touch ID, or fingerprint authentication to unlock the app. **We do not access, store, or process your biometric data.** Authentication is handled entirely by your device's operating system (iOS LocalAuthentication / Android BiometricPrompt). The app only receives a pass/fail result.

---

## 3. Data We Do NOT Collect

- ✅ No analytics or usage tracking
- ✅ No crash reporting sent to external servers
- ✅ No advertising identifiers
- ✅ No location data
- ✅ No device identifiers (IMEI, advertising ID, etc.)
- ✅ No contact list, camera, or microphone access
- ✅ No account registration required
- ✅ No internet connection required or used

---

## 4. Internet and Network Access

Pocket Log **does not make any network requests**. The app functions entirely offline. While Android declares the `INTERNET` permission in its manifest, this is an unused artifact from the React Native framework template and is not exercised by the app.

---

## 5. Data Import and Export

### Export
You can export your data as a CSV or XLSX file via **Settings → Export**. The file is written temporarily to your device's storage and shared using your device's native share sheet. You choose where it goes — your device, iCloud, Google Drive, email, etc. We have no involvement in or visibility into that transfer.

### Import
You can import a CSV or XLSX file via **Settings → Import**. The file is read locally, parsed on-device, and written to the local SQLite database. No data passes through any external service.

---

## 6. Third-Party Services

Pocket Log does not integrate with any third-party analytics, advertising, or data processing services. The open-source libraries used by the app operate entirely on-device and do not transmit data externally.

| Library | Purpose | Sends data externally? |
|---|---|---|
| op-sqlite / Drizzle ORM | Local database | No |
| react-native-keychain | Secure credential storage | No |
| react-native-biometrics | Biometric auth (OS-delegated) | No |
| react-native-document-picker | File import UI | No |
| react-native-fs | Local file read/write | No |
| xlsx | CSV/XLSX parsing and generation | No |
| All UI/navigation libraries | Interface rendering | No |

---

## 7. Data Retention and Deletion

Since all data is stored locally on your device:

- **To delete all app data:** Uninstall Pocket Log. All SQLite data, settings, and the stored PIN are removed.
- **To delete individual data:** Use the app's built-in delete functionality for transactions, accounts, and categories.
- **PIN and biometric preference:** Cleared automatically on uninstall.

We have no ability to delete your data on your behalf because we never have access to it.

---

## 8. Data Security

- Financial data is stored in a SQLite database in the app's private storage directory, inaccessible to other apps.
- The app lock feature (PIN / biometrics) provides an additional layer of security if your device is accessed by others.
- The PIN is stored in the device's secure enclave-backed keychain, not in plain text.
- Exported files are only as secure as wherever you choose to save them.

---

## 9. Children's Privacy

Pocket Log does not knowingly collect any information from anyone, including children under the age of 13. Since no data is collected at all, there is no special risk to minors.

---

## 10. Your Rights

Since we collect no personal data and have no servers, there is no data to access, correct, port, or erase on our end. All rights over your data are exercised directly on your device:

- **Access:** Your data is in the app.
- **Export:** Settings → Export.
- **Delete:** Delete entries in-app, or uninstall.

---

## 11. Changes to This Policy

If we update this policy in a future app version, we will update the **Effective Date** above and note the changes in the app release notes. Continued use of the app after changes constitutes acceptance of the updated policy.

---

## 12. Contact

For privacy-related questions or concerns, contact us at:

**Developer:** Qubit Pixel  
**Email:** *contact.hyperverse@gmail.com*  
**GitHub:** *https://github.com/i-endran/money_manager*

---