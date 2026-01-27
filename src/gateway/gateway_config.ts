import fs from "fs";
import os from "os";
import path from "path";

export interface GatewayConfig {
  bindAddress: string;
  port: number;
  baseUrl: string;
  oauthClientId: string;
  cooldownSeconds: number;
  maxRetryPasses: number;
  requestTimeoutMs: number;
  upstreamMaxRetries: number;
  upstreamRetryBaseMs: number;
  upstreamRetryMaxMs: number;
  upstreamRetryJitterMs: number;
  overrideAuth: boolean;
}

const DEFAULT_CONFIG: GatewayConfig = {
  bindAddress: "127.0.0.1",
  port: 4319,
  baseUrl: "https://chatgpt.com/backend-api/codex",
  oauthClientId: "app_EMoamEEZ73f0CkXaXp7hrann",
  cooldownSeconds: 900,
  maxRetryPasses: 1,
  requestTimeoutMs: 120_000,
  upstreamMaxRetries: 2,
  upstreamRetryBaseMs: 200,
  upstreamRetryMaxMs: 2_000,
  upstreamRetryJitterMs: 120,
  overrideAuth: true
};

export function resolveGatewayConfig(overrides: Partial<GatewayConfig>): GatewayConfig {
  const merged: GatewayConfig = {
    ...DEFAULT_CONFIG,
    ...overrides
  };

  return sanitizeGatewayConfig(merged);
}

export function getGatewayConfigPath(): string {
  return path.join(os.homedir(), ".codex-account-orchestrator", "gateway.json");
}

export function loadGatewayConfig(): Partial<GatewayConfig> {
  const configPath = getGatewayConfigPath();

  if (!fs.existsSync(configPath)) {
    return {};
  }

  const raw = fs.readFileSync(configPath, "utf8");
  try {
    return JSON.parse(raw) as Partial<GatewayConfig>;
  } catch (error) {
    const backupPath = `${configPath}.corrupt-${Date.now()}`;
    fs.writeFileSync(backupPath, raw, "utf8");
    process.stderr.write(
      `Warning: gateway.json was invalid and has been backed up to ${backupPath}.\n`
    );
    return {};
  }
}

export function saveGatewayConfig(config: Partial<GatewayConfig>): void {
  const configPath = getGatewayConfigPath();
  const dir = path.dirname(configPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

function sanitizeGatewayConfig(config: GatewayConfig): GatewayConfig {
  const safePort = clampInt(config.port, DEFAULT_CONFIG.port, 1, 65_535);
  const safeCooldown = clampInt(config.cooldownSeconds, DEFAULT_CONFIG.cooldownSeconds, 0);
  const safeMaxPasses = clampInt(config.maxRetryPasses, DEFAULT_CONFIG.maxRetryPasses, 0);
  const safeTimeout = clampInt(config.requestTimeoutMs, DEFAULT_CONFIG.requestTimeoutMs, 1000);
  const safeUpstreamRetries = clampInt(
    config.upstreamMaxRetries,
    DEFAULT_CONFIG.upstreamMaxRetries,
    0
  );
  const safeRetryBase = clampInt(
    config.upstreamRetryBaseMs,
    DEFAULT_CONFIG.upstreamRetryBaseMs,
    0
  );
  const safeRetryMax = clampInt(
    config.upstreamRetryMaxMs,
    DEFAULT_CONFIG.upstreamRetryMaxMs,
    safeRetryBase
  );
  const safeRetryJitter = clampInt(
    config.upstreamRetryJitterMs,
    DEFAULT_CONFIG.upstreamRetryJitterMs,
    0
  );

  return {
    bindAddress: normalizeString(config.bindAddress, DEFAULT_CONFIG.bindAddress),
    port: safePort,
    baseUrl: normalizeString(config.baseUrl, DEFAULT_CONFIG.baseUrl),
    oauthClientId: normalizeString(config.oauthClientId, DEFAULT_CONFIG.oauthClientId),
    cooldownSeconds: safeCooldown,
    maxRetryPasses: safeMaxPasses,
    requestTimeoutMs: safeTimeout,
    upstreamMaxRetries: safeUpstreamRetries,
    upstreamRetryBaseMs: safeRetryBase,
    upstreamRetryMaxMs: safeRetryMax,
    upstreamRetryJitterMs: safeRetryJitter,
    overrideAuth: typeof config.overrideAuth === "boolean" ? config.overrideAuth : DEFAULT_CONFIG.overrideAuth
  };
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max?: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const floored = Math.floor(value);
  if (max !== undefined) {
    return Math.min(max, Math.max(min, floored));
  }

  return Math.max(min, floored);
}
