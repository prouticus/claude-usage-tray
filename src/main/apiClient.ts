import https from 'https';
import { readCredentials } from './auth';
import type { AccountInfo, UsageInfo, UsageData } from '../shared/types';

export type { AccountInfo, UsageInfo, UsageData };

const BASE_API_URL = 'api.anthropic.com';
const ANTHROPIC_BETA = 'oauth-2025-04-20';

export async function fetchUsageData(): Promise<UsageData> {
  const creds = readCredentials();
  if (!creds) throw new Error('Not authenticated. Please run `claude login` first.');

  const token = creds.accessToken;

  const [usageRaw, profileRaw] = await Promise.all([
    anthropicGet('/api/oauth/usage', token),
    anthropicGet('/api/oauth/profile', token).catch(() => null),
  ]);

  const account = parseAccount(creds, profileRaw);
  const usage = parseUsage(usageRaw);

  return { account, usage, fetchedAt: Date.now() };
}

function anthropicGet(apiPath: string, token: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: BASE_API_URL,
      path: apiPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': ANTHROPIC_BETA,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error(`Token expired (HTTP ${res.statusCode}). Run \`claude login\` to refresh.`));
          return;
        }
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`API error: HTTP ${res.statusCode} for ${apiPath}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error(`Failed to parse response from ${apiPath}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.end();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAccount(creds: ReturnType<typeof readCredentials>, profileRaw: any): AccountInfo {
  const plan = formatPlan(creds?.subscriptionType);

  // Profile endpoint: { account: { email_address }, organization: { name } }
  const email = profileRaw?.account?.email_address
    ?? profileRaw?.account?.email
    ?? profileRaw?.email_address
    ?? profileRaw?.email
    ?? '—';

  const orgName = profileRaw?.organization?.name
    ?? profileRaw?.organizationName
    ?? (email !== '—' ? `${email}'s Organization` : 'Unknown');

  return { email, organizationName: orgName, plan, authMethod: 'Claude AI' };
}

function formatPlan(subscriptionType: string | null | undefined): string {
  if (!subscriptionType) return 'Claude';
  const map: Record<string, string> = {
    pro: 'Claude Pro',
    free: 'Claude Free',
    team: 'Claude Team',
    enterprise: 'Claude Enterprise',
    max: 'Claude Max',
  };
  return map[subscriptionType.toLowerCase()] ?? subscriptionType;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseUsage(raw: any): UsageInfo {
  // Response: { five_hour, seven_day, seven_day_opus, seven_day_sonnet,
  //             seven_day_oauth_apps, seven_day_cowork, extra_usage, iguana_necktie }
  const fiveHour = raw?.five_hour;
  const sevenDay = raw?.seven_day;
  const extra = raw?.extra_usage;

  const sessionPercent = fiveHour?.utilization != null
    ? Math.min(100, Math.round(fiveHour.utilization * 100))
    : 0;

  const weeklyPercent = sevenDay?.utilization != null
    ? Math.min(100, Math.round(sevenDay.utilization * 100))
    : 0;

  const sessionResetMs = fiveHour?.resets_at
    ? new Date(fiveHour.resets_at).getTime() - Date.now()
    : 0;

  const weeklyResetMs = sevenDay?.resets_at
    ? new Date(sevenDay.resets_at).getTime() - Date.now()
    : 0;

  // extra_usage.utilization is already a percentage (e.g. 15.28), unlike session/weekly
  // which are 0–1 ratios. extra_usage also has no resets_at — it's a monthly billing budget.
  const extraEnabled = extra?.is_enabled === true;
  const extraPercent = extraEnabled && extra?.utilization != null
    ? Math.min(100, Math.round(extra.utilization))
    : undefined;
  // used_credits and monthly_limit are in cents (100 credits = $1.00)
  const extraSpentDollars = extraEnabled && extra?.used_credits != null
    ? extra.used_credits / 100
    : undefined;
  const extraLimitDollars = extraEnabled && extra?.monthly_limit != null
    ? extra.monthly_limit / 100
    : undefined;

  return { sessionPercent, sessionResetMs, weeklyPercent, weeklyResetMs, extraPercent, extraSpentDollars, extraLimitDollars };
}
