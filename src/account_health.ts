import type { AccountInspection } from "./account_inspector";

export type HealthSeverity = "warn" | "error";

export interface HealthCheckOptions {
  expiresWithinHours: number;
  maxFailures: number;
}

export interface HealthIssue {
  account: string;
  severity: HealthSeverity;
  code: string;
  message: string;
}

export interface HealthSummary {
  issues: HealthIssue[];
  okCount: number;
  warnCount: number;
  errorCount: number;
}

export const DEFAULT_HEALTH_OPTIONS: HealthCheckOptions = {
  expiresWithinHours: 24,
  maxFailures: 3
};

export function evaluateAccountHealth(
  inspection: AccountInspection,
  options: HealthCheckOptions,
  nowMs = Date.now()
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const status = inspection.status ?? {};

  if (!inspection.loggedIn) {
    issues.push({
      account: inspection.name,
      severity: "error",
      code: "not_logged_in",
      message: "No auth.json found for this account."
    });
    return issues;
  }

  const expiresAtMs = inspection.tokenDetails?.expiresAtMs;

  if (!expiresAtMs) {
    issues.push({
      account: inspection.name,
      severity: "warn",
      code: "token_unknown",
      message: "Token expiry could not be determined."
    });
  } else if (expiresAtMs <= nowMs) {
    issues.push({
      account: inspection.name,
      severity: "error",
      code: "token_expired",
      message: "Token is expired."
    });
  } else {
    const thresholdMs = options.expiresWithinHours * 60 * 60 * 1000;

    if (expiresAtMs - nowMs <= thresholdMs) {
      issues.push({
        account: inspection.name,
        severity: "warn",
        code: "token_expiring_soon",
        message: `Token expires within ${options.expiresWithinHours}h.`
      });
    }
  }

  if (status.cooldownUntilMs && status.cooldownUntilMs > nowMs) {
    issues.push({
      account: inspection.name,
      severity: "warn",
      code: "cooldown_active",
      message: "Account is currently in cooldown."
    });
  }

  if (status.consecutiveFailures !== undefined && status.consecutiveFailures >= options.maxFailures) {
    issues.push({
      account: inspection.name,
      severity: "warn",
      code: "failures_high",
      message: `Consecutive failures >= ${options.maxFailures}.`
    });
  }

  if (status.lastError) {
    issues.push({
      account: inspection.name,
      severity: "warn",
      code: "last_error",
      message: `Last error: ${status.lastError}`
    });
  }

  return issues;
}

export function summarizeHealth(
  inspections: AccountInspection[],
  options: HealthCheckOptions,
  nowMs = Date.now()
): HealthSummary {
  const issues: HealthIssue[] = [];

  for (const inspection of inspections) {
    issues.push(...evaluateAccountHealth(inspection, options, nowMs));
  }

  const warnCount = issues.filter((issue) => issue.severity === "warn").length;
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const okCount = inspections.length - new Set(issues.map((issue) => issue.account)).size;

  return {
    issues,
    okCount,
    warnCount,
    errorCount
  };
}
