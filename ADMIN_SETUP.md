# Admin Page Setup

The admin page lives at `/admin.html`. It posts app data to the Cloudflare Pages
Function at `/api/apps`.

The function uploads the app PNG into `assets/`, updates `data/apps.json`
through the GitHub API, and creates commits on `main`.

## Required Cloudflare Secrets

Set these in Cloudflare Pages before using the admin page:

```sh
wrangler pages secret put GITHUB_TOKEN --project-name the-little-ai-app-planet
wrangler pages secret put ADMIN_SECRET --project-name the-little-ai-app-planet
```

`GITHUB_TOKEN` should be a GitHub fine-grained token with access only to:

- Repository: `PeterPanSwift/The-Little-AI-App-Planet`
- Permission: `Contents: Read and write`

`ADMIN_SECRET` is the password you type into the admin page.

## Optional Environment Variables

These defaults already match this project, so you usually do not need to set them:

```txt
GITHUB_OWNER=PeterPanSwift
GITHUB_REPO=The-Little-AI-App-Planet
GITHUB_BRANCH=main
```

## Notes

- Do not put the GitHub token in frontend JavaScript.
- `/admin.html` is intentionally not linked from the public home page.
- The admin page accepts PNG uploads. The uploaded file name, without `.png`,
  becomes the app's `image` value in `data/apps.json`.
