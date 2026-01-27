import fs from "fs";

import { getRegistryPath } from "./paths";

export interface Registry {
  default_account: string | null;
  accounts: string[];
}

const EMPTY_REGISTRY: Registry = {
  default_account: null,
  accounts: []
};

export function loadRegistry(baseDir: string): Registry {
  const registryPath = getRegistryPath(baseDir);

  if (!fs.existsSync(registryPath)) {
    return { ...EMPTY_REGISTRY };
  }

  const raw = fs.readFileSync(registryPath, "utf8");
  let parsed: Registry;

  try {
    parsed = JSON.parse(raw) as Registry;
  } catch (error) {
    const backupPath = `${registryPath}.corrupt-${Date.now()}`;
    fs.writeFileSync(backupPath, raw, "utf8");
    process.stderr.write(
      `Warning: registry.json was invalid and has been backed up to ${backupPath}.\n`
    );
    return { ...EMPTY_REGISTRY };
  }

  const accounts = normalizeAccounts(parsed.accounts);
  const defaultAccount =
    typeof parsed.default_account === "string" ? parsed.default_account.trim() : null;
  const normalizedDefault = defaultAccount && accounts.includes(defaultAccount)
    ? defaultAccount
    : accounts[0] ?? null;

  return {
    default_account: normalizedDefault,
    accounts
  };
}

export function saveRegistry(baseDir: string, registry: Registry): void {
  const registryPath = getRegistryPath(baseDir);
  const payload = JSON.stringify(registry, null, 2) + "\n";
  fs.writeFileSync(registryPath, payload, "utf8");
}

function normalizeAccounts(accounts: unknown): string[] {
  if (!Array.isArray(accounts)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of accounts) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();

    if (trimmed.length === 0) {
      continue;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      continue;
    }

    if (seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}
