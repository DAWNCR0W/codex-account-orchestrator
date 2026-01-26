import fs from "fs";

import { getRegistryPath } from "./paths";

export interface Registry {
  default_account: string | null;
  accounts: string[];
}

export function loadRegistry(baseDir: string): Registry {
  const registryPath = getRegistryPath(baseDir);

  if (!fs.existsSync(registryPath)) {
    return { default_account: null, accounts: [] };
  }

  const raw = fs.readFileSync(registryPath, "utf8");
  const parsed = JSON.parse(raw) as Registry;

  return {
    default_account: parsed.default_account ?? null,
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts : []
  };
}

export function saveRegistry(baseDir: string, registry: Registry): void {
  const registryPath = getRegistryPath(baseDir);
  const payload = JSON.stringify(registry, null, 2) + "\n";
  fs.writeFileSync(registryPath, payload, "utf8");
}
