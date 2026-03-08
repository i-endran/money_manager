/**
 * Global app identity constants.
 * Change APP_NAME here to update all user-facing strings app-wide.
 */
export const APP_NAME = 'Pocket Log';

/** Lowercase hyphenated slug used in export filenames. */
export const APP_NAME_SLUG = 'pocket-log';

export const APP_VERSION = '1.0.0';

/** Android applicationId / iOS CFBundleIdentifier */
export const APP_BUNDLE_ID = 'com.qubitPixel.pocketLog';

/**
 * UI label constants — change once here to update all badges, alerts and
 * descriptions that reference the opt-out account feature.
 */
export const LABEL_OPT_OUT = 'Opt Out';
export const LABEL_OPT_OUT_FULL = 'Opt Out of Summaries';
export const LABEL_OPT_OUT_DESCRIPTION =
    'Excluded from income/expense summary calculations. Transfers to/from this account are treated as expense/income.';
export const LABEL_OPT_OUT_MANDATORY_DESCRIPTION = (type: string) =>
    `Mandatory for ${type.toUpperCase()} accounts. Excluded from income/expense summary calculations.`;
