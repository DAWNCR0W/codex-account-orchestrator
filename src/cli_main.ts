#!/usr/bin/env node

import { Command } from "commander";
import {
  addAccount,
  ensureAccountConfig,
  ensureAccountDir,
  ensureBaseDir,
  getAccountOrder,
  setDefaultAccount,
  validateAccountName
} from "./account_manager";
import { getAccountDir, getBaseDir } from "./paths";
import { loadRegistry } from "./registry_store";
import { runCodexOnce } from "./process_runner";

interface RunOptions {
  account?: string;
  codex: string;
  fallback: boolean;
}

const program = new Command();

program
  .name("codex-account-orchestrator")
  .description("Codex OAuth account fallback orchestrator")
  .option("--data-dir <path>", "Custom data directory");

program
  .command("add")
  .argument("<name>", "Account name")
  .description("Register a new account and create its config")
  .action((name: string) => {
    const baseDir = getBaseDir(program.opts().dataDir);
    const registry = addAccount(baseDir, name);
    const normalizedName = validateAccountName(name);
    const accountDir = getAccountDir(baseDir, normalizedName);

    process.stdout.write(`Added account: ${normalizedName}\n`);
    process.stdout.write(`Account directory: ${accountDir}\n`);
    process.stdout.write(`Default account: ${registry.default_account ?? "(none)"}\n`);
    process.stdout.write("Run `cao run -- codex` to start with fallback.\n");
  });

program
  .command("list")
  .description("List registered accounts")
  .action(() => {
    const baseDir = getBaseDir(program.opts().dataDir);
    ensureBaseDir(baseDir);
    const registry = loadRegistry(baseDir);

    if (registry.accounts.length === 0) {
      process.stdout.write("No accounts registered. Use `cao add <name>` first.\n");
      return;
    }

    for (const name of registry.accounts) {
      const marker = registry.default_account === name ? "*" : " ";
      process.stdout.write(`${marker} ${name}\n`);
    }
  });

program
  .command("use")
  .argument("<name>", "Account name")
  .description("Set the default account")
  .action((name: string) => {
    const baseDir = getBaseDir(program.opts().dataDir);
    const registry = setDefaultAccount(baseDir, name);
    process.stdout.write(`Default account set to: ${registry.default_account}\n`);
  });

program
  .command("run")
  .option("--account <name>", "Run with a specific account")
  .option("--codex <path>", "Path to the codex binary", "codex")
  .option("--no-fallback", "Disable automatic fallback")
  .description("Run codex with OAuth fallback across accounts")
  .allowUnknownOption(true)
  .action(async (options: RunOptions) => {
    const baseDir = getBaseDir(program.opts().dataDir);
    ensureBaseDir(baseDir);

    const registry = loadRegistry(baseDir);
    const orderedAccounts = getAccountOrder(registry);
    const codexArgs = getCodexArgs(process.argv);

    if (orderedAccounts.length === 0) {
      process.stderr.write("No accounts registered. Use `cao add <name>` first.\n");
      process.exit(1);
      return;
    }

    const resolvedAccounts = resolveAccounts(orderedAccounts, options.account);

    if (resolvedAccounts.length === 0) {
      process.stderr.write("No matching accounts found.\n");
      process.exit(1);
      return;
    }

    await runWithFallback(options, baseDir, resolvedAccounts, codexArgs);
  });

program.parse(process.argv);

function resolveAccounts(ordered: string[], requested?: string): string[] {
  if (!requested) {
    return ordered;
  }

  const normalized = validateAccountName(requested);

  if (ordered.includes(normalized)) {
    return [normalized];
  }

  return [];
}

function getCodexArgs(argv: string[]): string[] {
  const separatorIndex = argv.indexOf("--");

  if (separatorIndex === -1) {
    return [];
  }

  return argv.slice(separatorIndex + 1);
}

async function runWithFallback(
  options: RunOptions,
  baseDir: string,
  accounts: string[],
  codexArgs: string[]
): Promise<void> {
  const codexBin = options.codex;

  for (let index = 0; index < accounts.length; index += 1) {
    const name = accounts[index];
    const accountDir = ensureAccountDir(baseDir, name);
    ensureAccountConfig(accountDir);

    process.stderr.write(`Using account: ${name}\n`);

    const result = await runCodexOnce(codexBin, codexArgs, accountDir, options.fallback);

    if (result.exitCode === 0) {
      process.exit(0);
      return;
    }

    if (!options.fallback) {
      process.exit(result.exitCode);
      return;
    }

    if (!result.quotaError) {
      process.exit(result.exitCode);
      return;
    }

    const nextName = accounts[index + 1];

    if (!nextName) {
      process.stderr.write("All accounts exhausted due to quota.\n");
      process.exit(result.exitCode);
      return;
    }

    process.stderr.write(`Quota exhausted. Falling back to: ${nextName}\n`);
  }
}
