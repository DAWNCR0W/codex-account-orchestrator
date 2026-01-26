export const REGISTRY_FILE_NAME = "registry.json";

export const DEFAULT_CONFIG_TOML = [
  "# Codex config for this account",
  "cli_auth_credentials_store = \"file\"",
  "preferred_auth_method = \"chatgpt\"",
  ""
].join("\n");

export const QUOTA_ERROR_PATTERNS: RegExp[] = [
  /usage\s*limit/i,
  /quota/i,
  /exceeded/i,
  /insufficient\s+credits/i,
  /insufficient\s+quota/i,
  /credits?\s+exhausted/i
];

export const MAX_CAPTURED_LINES = 200;
