export interface AccountInfo {
  email: string;
  organizationName: string;
  plan: string;
  authMethod: string;
}

export interface UsageInfo {
  sessionPercent: number;      // 0–100
  sessionResetMs: number;      // ms until session window resets
  weeklyPercent: number;       // 0–100
  weeklyResetMs: number;       // ms until weekly window resets
  extraPercent?: number;        // 0–100, present when extra usage billing is active
  extraSpentDollars?: number;   // e.g. 7.64
  extraLimitDollars?: number;   // e.g. 50.00
}

export interface UsageData {
  account: AccountInfo;
  usage: UsageInfo;
  fetchedAt: number;
}
