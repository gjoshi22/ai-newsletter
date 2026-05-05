# GitHub Personal Deploy Setup

This repo is set up to deploy the newsletter as a static GitHub Pages site from GitHub Actions.

## Static Site

Expected GitHub Pages URL for the current repo:

```text
https://gjoshi22.github.io/ai-newsletter/
```

The workflow in `.github/workflows/pages.yml` builds `@workspace/xd-journal` with:

```text
BASE_PATH=/ai-newsletter/
SITE_URL=https://gjoshi22.github.io/ai-newsletter/
CMS_BACKEND=github
GITHUB_REPO=gjoshi22/ai-newsletter
```

It publishes:

```text
frontend/xd-journal/dist/public
```

## GitHub Pages Settings

In the GitHub repo:

1. Go to `Settings > Pages`.
2. Set `Build and deployment > Source` to `GitHub Actions`.
3. Push to `main` or manually run the `Deploy GitHub Pages` workflow.

## Decap CMS Admin

The admin UI will be served at:

```text
https://gjoshi22.github.io/ai-newsletter/admin/
```

The generated Decap config uses the GitHub backend:

```yaml
backend:
  name: github
  repo: gjoshi22/ai-newsletter
  branch: main
```

## CMS Auth Requirement

GitHub OAuth for Decap CMS requires an OAuth proxy because a static site cannot safely store a GitHub client secret.

When the proxy is ready, set this in the GitHub Actions workflow build environment:

```text
DECAP_AUTH_BASE_URL=https://your-oauth-proxy.example.com
```

The generated Decap config will then include:

```yaml
base_url: https://your-oauth-proxy.example.com
auth_endpoint: auth
```

## GitHub OAuth App

Create a GitHub OAuth app with a callback URL that points to the OAuth proxy callback route, not directly to GitHub Pages.

The OAuth app needs:

```text
Homepage URL: https://gjoshi22.github.io/ai-newsletter/
Callback URL: https://your-oauth-proxy.example.com/callback
```

The OAuth proxy stores the GitHub client ID and client secret. Do not commit the client secret to this repo.
