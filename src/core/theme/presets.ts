import { StyleSheet } from 'react-native';
import { Layout } from './layout';
import { Spacing } from './spacing';
import { Typography } from './typography';

type FontWeightToken = (typeof Typography.weights)[keyof typeof Typography.weights];

type LedgerTextLevel = 'primary' | 'secondary' | 'amount' | 'meta';

type LedgerTextPreset = Readonly<{
    fontSize: number;
    fontWeight: FontWeightToken;
}>;

export const LedgerTextHierarchyPreset = {
    primary: {
        fontSize: Typography.sizes.sm2,
        fontWeight: Typography.weights.medium,
    },
    secondary: {
        fontSize: Typography.sizes.xs2,
        fontWeight: Typography.weights.regular,
    },
    amount: {
        fontSize: Typography.sizes.sm2,
        fontWeight: Typography.weights.semibold,
    },
    meta: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.medium,
    },
} as const satisfies Record<LedgerTextLevel, LedgerTextPreset>;

export const LedgerRowDensityPreset = {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    iconSize: Layout.iconSize.md,
    iconGap: Spacing.lg,
    separatorThickness: StyleSheet.hairlineWidth,
    separatorLeadingInset: Spacing.xl + Layout.iconSize.md + Spacing.lg,
    separatorTrailingInset: Spacing.xl,
} as const;

export const LedgerSummaryCardMetricsPreset = {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    labelValueSpacing: Spacing.xs,
    dividerThickness: StyleSheet.hairlineWidth,
    dividerSpacing: Spacing.xl,
    dividerRadius: Layout.radius.full,
    cardRadius: Layout.radius.md,
} as const;

export const FormDensityPreset = {
    rowPaddingVertical: LedgerRowDensityPreset.paddingVertical + Spacing.xxs,
    rowPaddingHorizontal: LedgerRowDensityPreset.paddingHorizontal + Spacing.xs,
    fieldSpacing: Spacing.xl,
    sectionSpacing: Spacing.xxl,
    controlRadius: Layout.radius.sm,
} as const;
