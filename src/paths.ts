import os from "os";
import path from "path";

import { REGISTRY_FILE_NAME } from "./constants";

export function getBaseDir(dataDir?: string): string {
  if (dataDir && dataDir.trim().length > 0) {
    return dataDir;
  }

  return path.join(os.homedir(), ".codex-account-orchestrator");
}

export function getAccountDir(baseDir: string, accountName: string): string {
  return path.join(baseDir, accountName);
}

export function getRegistryPath(baseDir: string): string {
  return path.join(baseDir, REGISTRY_FILE_NAME);
}
