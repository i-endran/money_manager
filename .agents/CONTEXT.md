# 🧠 Pocket Log - Dense Context for Agents

This document provides a compressed overview of the **Pocket Log** project for AI agents to quickly understand the architecture, rules, and current status.

---

## 🏗️ Architecture Summary

- **App Name**: Pocket Log (formerly PiggyBook)
- **Tech Stack**: React Native 0.84, TypeScript, Drizzle ORM + op-sqlite, Zustand, React Navigation 7.
- **Design System**: iOS-native aesthetic.
  - Background: `#F5F5F7` (Light) / `#000000` (Dark).
  - Accent: Navy Blue (`#1B3A5C`).
  - Layout: Squircle card sections (iOS Settings style).
- **Directory Structure**:
  - `src/features/`: Feature-sliced modules (ledger, transaction, settings, auth).
  - `src/core/`: Centralized theme, constants (enums), and date/currency utils.
  - `src/database/`: Drizzle schema, migrations, and seed.
  - `src/stores/`: Global Zustand state.

---

## 📜 Dev Rules & Standards

1. **Git Flow**:
   - **MANDATORY**: Commit after completion of *every* checkpoint/sub-task.
   - Commit messages follow `feat(module): description` or `fix(module): description`.
2. **Coding Standards**:
   - Use `useAppTheme()` for all styling (never hardcode colors unless defining tokens).
   - Enforce 2-decimal point limits on currency inputs.
   - Maintain 3-level hierarchical category logic.
3. **Rebuilds**:
   - Native changes (icons, splash, names) require `npx react-native run-android`.

---

## 📊 Current Project Status

- **Status**: Milestone 2 (Settings Revamp) — **100% Complete**.
- **Latest Features**:
  - **Theme Profiles**: Added `settingsStore` backing Light, Dark, and System Default options with reactive styling.
  - **Account Management**: Nesting support (1-level "Reserves"), Grouped UI, and true Drag-to-Reorder via `react-native-draggable-flatlist`. The Account Picker uses a drill-down UI for reserves.
  - **Closed-Box Logic**: Accounts can be excluded from summaries; transfers into them count as expense, out count as income.
  - **Carry Forward Balance**: Computes and displays opening balance row from prior months.
  - **Unified Header**: Month selector and summary merged into a single bubble.
  - **App Icon & Splash**: Updated to the new Pocket Log branding (Navy Blue).

---

## 🔗 Key References

- [Full Architecture](./docs/architecture.md)
- [Task Tracker](./docs/task_plan.md)
- [Test Cases](./docs/test_cases.md)
- [Git Standard](./.agents/rules/always-commit-after-each-checkpoint.md)
