import { promises as fs } from "node:fs";
import path from "node:path";

const appRoot = path.resolve(import.meta.dirname, "..");
const templatePath = path.join(appRoot, "public/admin/config.template.yml");
const outputPath = path.join(appRoot, "public/admin/config.yml");

function normalizeBasePath(value) {
  let basePath = (value || "/").trim();
  if (!basePath.startsWith("/")) basePath = `/${basePath}`;
  if (!basePath.endsWith("/")) basePath = `${basePath}/`;
  return basePath.replace(/\/{2,}/g, "/");
}

function normalizeUrl(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function normalizeOrigin(value) {
  return (value || "").trim().replace(/\/+$/, "");
}

function localSiteUrl(basePath) {
  const port = process.env.PORT || "5173";
  return `http://localhost:${port}${basePath}`;
}

function selfHostedGitLabConfig(origin) {
  if (!origin) return "";

  return [
    `api_root: ${origin}/api/v4`,
    `base_url: ${origin}`,
    "auth_endpoint: oauth/authorize",
    `graphql_api_root: ${origin}/api/graphql`,
  ].join("\n");
}

function indentBlock(value, spaces = 2) {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function githubBackendConfig() {
  const repo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || "gjoshi22/ai-newsletter";
  const branch = process.env.GITHUB_BRANCH || process.env.GITHUB_REF_NAME || "main";
  const authBaseUrl = normalizeOrigin(process.env.DECAP_AUTH_BASE_URL || process.env.GITHUB_AUTH_BASE_URL);
  const authEndpoint = (process.env.DECAP_AUTH_ENDPOINT || "auth").trim();

  const lines = [
    "name: github",
    `repo: ${repo}`,
    `branch: ${branch}`,
    "use_graphql: true",
  ];

  if (authBaseUrl) {
    lines.push(`base_url: ${authBaseUrl}`);
    lines.push(`auth_endpoint: ${authEndpoint}`);
  }

  return lines.join("\n");
}

function gitlabBackendConfig(gitlabOrigin, isGitLabDotCom) {
  const lines = [
    "name: gitlab",
    `repo: ${process.env.GITLAB_REPO || process.env.CI_PROJECT_PATH || "YOUR_GROUP/YOUR_PROJECT"}`,
    `branch: ${process.env.GITLAB_BRANCH || process.env.CI_DEFAULT_BRANCH || "main"}`,
    "auth_type: pkce",
    `app_id: ${
      process.env.GITLAB_OAUTH_APPLICATION_ID ||
      process.env.VITE_GITLAB_OAUTH_APPLICATION_ID ||
      "YOUR_GITLAB_OAUTH_APPLICATION_ID"
    }`,
  ];

  if (gitlabOrigin && !isGitLabDotCom) {
    lines.push(selfHostedGitLabConfig(gitlabOrigin));
  }

  lines.push("use_graphql: true");
  return lines.join("\n");
}

const basePath = normalizeBasePath(process.env.BASE_PATH || process.env.PAGES_BASE_PATH);
const siteUrl = normalizeUrl(process.env.SITE_URL || process.env.CI_PAGES_URL) || localSiteUrl(basePath);
const gitlabOrigin = normalizeOrigin(process.env.GITLAB_BASE_URL || process.env.CI_SERVER_URL);
const isGitLabDotCom = gitlabOrigin === "https://gitlab.com" || gitlabOrigin === "http://gitlab.com";
const cmsBackend = (process.env.CMS_BACKEND || "github").trim().toLowerCase();

if (!["github", "gitlab"].includes(cmsBackend)) {
  throw new Error(`Unsupported CMS_BACKEND "${cmsBackend}". Expected "github" or "gitlab".`);
}

const replacements = {
  __BASE_PATH__: basePath,
  __SITE_URL__: siteUrl,
  __BACKEND_CONFIG__: indentBlock(
    cmsBackend === "gitlab"
      ? gitlabBackendConfig(gitlabOrigin, isGitLabDotCom)
      : githubBackendConfig(),
  ),
};

let config = await fs.readFile(templatePath, "utf8");
for (const [placeholder, value] of Object.entries(replacements)) {
  config = config.replaceAll(placeholder, value);
}

const unresolved = config.match(/__[A-Z0-9_]+__/g);
if (unresolved) {
  throw new Error(`Unresolved Decap config placeholders: ${[...new Set(unresolved)].join(", ")}`);
}

await fs.writeFile(outputPath, config);
console.log(`Generated ${cmsBackend} Decap config with base path ${basePath}`);
