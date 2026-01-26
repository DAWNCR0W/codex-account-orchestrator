import { QUOTA_ERROR_PATTERNS } from "./constants";

export function isQuotaError(outputText: string): boolean {
  return QUOTA_ERROR_PATTERNS.some((pattern) => pattern.test(outputText));
}
