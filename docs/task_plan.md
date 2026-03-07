# Pocket Log - Milestone 1: Transaction Ledger

## Planning
- [x] Gather requirements and clarify doubts
- [x] Create implementation plan
- [x] Incorporate user feedback (emoji, iOS picker, liquid glass, splash, export, git checkpoints)
- [x] Create comprehensive test cases (75+ cases, 7 checkpoints)
- [x] Get user approval on plan

## Core Layer (Checkpoint 1-2)
- [x] Verify build toolchain & Initialize project
- [x] Configure dependencies & Git
- [x] Platform-adaptive theme (Navy Blue accent)
- [x] Currency formatter, date utilities

## Database Layer (Checkpoint 3)
- [x] Drizzle schema (transactions, accounts, categories, settings KV)
- [x] Seed data (default accounts, categories with emoji)
- [x] Migration setup

## Ledger Screen (Checkpoint 4)
- [x] Month selector, monthly summary card
- [x] Day-grouped SectionList with weekend differentiation
- [x] Transaction rows with quick info
- [x] Transfer merge display logic

## Add/Edit Transaction (Checkpoint 5)
- [x] Transaction form (amount, type, account, category, note, desc, date)
- [x] iOS month-view date picker
- [x] Hierarchical category picker with inline add
- [x] Edit + delete flow

## Settings & Entity Management (Checkpoint 6)
- [x] Settings screen (currency, theme, backup/export placeholders)
- [x] Account CRUD with initial balance
- [x] Category CRUD (3-level, emoji support)
- [x] Liquid glass transitions (iOS)

## Auth & Splash (Checkpoint 7-8)
- [x] Splash screen (react-native-bootsplash)
- [x] PIN / biometric auth
- [x] Lock screen on app launch

## Branding & UI Polish (Final Checkpoints)
- [x] **Rebranding**: Renamed to Pocket Log, new icon, navy blue splash.
- [x] **UI Overhaul**: iOS Settings-style squircle lists throughout.
- [x] **Features**: Carry Forward Balance toggle & opening balance row.
- [x] **UX Polish**: Unified header bubble, centered titles, tightened spacing.

## Accounts & UI Normalisation (Post-Release Polish)
- [x] **Accounts Summary SQL**: Migrated aggregation to raw SQL helpers (`summarySql.ts`) with test coverage.
- [x] **Style Preset System**: Added `FormHeaderPreset`, `LedgerRowDensityPreset`, `LedgerTextHierarchyPreset` to `presets.ts` for cross-screen consistency.
- [x] **Accounts Summary page**: Title left-aligned at `xl(28px)`; reserve rows use left-border accent (`theme.primary`).
- [x] **Manage Accounts**: Collapsible type sections with chevron; independent `+` circle per section; reserves indented with left-border; row padding/font matched to Accounts Summary.
- [x] **Manage Categories**: Normal-case section titles; sub-categories use left-border indent (no `↳` arrow); fixed-width spacer for dot alignment.
- [x] **Typography normalisation**: `FormHeaderPreset` applied to all management/form screen titles; form button sizes (`md`/`semibold`) consistent across AccountForm, TransactionForm.
- [x] **Dark theme fix**: Sub-item left-border colour changed from `theme.border` to `theme.primary` for visibility in dark mode.
- [x] **Settings pickers**: Theme and currency pickers show selected item highlight + checkmark; currency picker auto-scrolls to selection.
- [x] **Theme picker bottom sheet**: Modal content uses edge-to-edge row backgrounds (no horizontal padding frame) for consistent selection highlight.

## Export / Import & Auth Settings (Post-Release)
- [x] **Export fix**: `exportData.ts` writes XLSX/CSV base64 to `RNFS.TemporaryDirectoryPath`; `Share.share({ url: 'file://...' })` replaces broken data-URI sharing.
- [x] **Import fix**: `importData.ts` uses `RNFS.readFile(path, 'base64')` + `XLSX.read(..., { type: 'base64' })` for reliable file reading.
- [x] **Download Template**: Moved inside Import Data flow (Alert dialog) instead of a standalone settings row.
- [x] **react-native-fs**: Installed + `bundle exec pod install` (CocoaPods requires `bundle exec` with project Gemfile on macOS system Ruby).
- [x] **Auth Settings UI**: Added SECURITY section to SettingsScreen — App Lock toggle (PIN setup/remove), Biometrics toggle (Face ID / Touch ID, hardware-gated), Change PIN row.
- [x] **PinSetupModal**: Full-screen PIN entry component supporting `setup` mode (enter + confirm) and `verify` mode (enter + validate); key-based remount for seamless multi-step Change PIN flow.
- [x] **Biometrics prompt**: Fixed title from "Unlock Money Manager" → "Unlock Pocket Log".
