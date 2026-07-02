# Incubator Monorepo — Note to Self

One repo, many independent subfolders, each deployed as its own Vercel project.
No workspace tooling (no Turborepo/pnpm workspaces) — each prototype is fully
self-contained: own `package.json`, own lockfile, own stack. Keep it that way
unless two prototypes genuinely need to share code.

## Spinning up a new prototype

1. `mkdir <name>` and scaffold it however that prototype wants
   (Next.js, Vite, plain HTML, whatever — no constraints from the rest of the repo).
2. Commit + push to the shared `incubator` GitHub repo.
3. In Vercel: **Add New → Project → Import** the `incubator` repo again
   (yes, again — each subfolder gets its own Project even though it's the same repo).
4. Before deploying, set **Root Directory** to `<name>`.
5. Project name → gives you `<name>.vercel.app` (or similar) automatically.
   That's your cross-device test URL: open it on the iMac and on the phone.
6. Set up the Ignored Build Step (see below) so this prototype doesn't
   trigger rebuilds of unrelated ones and vice versa.

## Ignored Build Step (per project)

Without this, *every* push to the repo tries to redeploy *every* connected
project — even ones you didn't touch. Since we're not using workspaces,
Vercel's automatic "skip unaffected projects" doesn't apply, so this has to
be set manually per project.

Vercel dashboard → project → Settings → Build & Deployment → Ignored Build Step.
Use a command like:

```bash
git diff --quiet HEAD^ HEAD -- <name>
```

Exit code 0 (no diff in that folder) = skip the build. Non-zero = build.
Do this for every prototype project as you create it — takes ~1 minute.

## Database: Neon

Default to **one Neon project per prototype** that needs a DB — Neon's free
tier is generous and branching is cheap, so isolation costs basically
nothing. Only consolidate into a single Neon project (with separate
branches or schemas) once the number of prototypes needing a DB gets
annoying to manage individually.

Store the connection string in that prototype's own Vercel project env vars
— never in a shared/root `.env`, since these projects don't share a build.

## Graduating a prototype

Two options, pick based on how "real" it's becoming:

- **Cheap graduation:** leave it in the monorepo, just attach a proper
  custom domain to its existing Vercel project. Nothing else changes.
- **Full graduation (own repo):** extract the folder with history using
  `git subtree split --prefix=<name> -b <name>-extracted`,
  push that branch to a new repo, then re-point the existing Vercel
  project at the new repo (or create a fresh one and delete the old).

Don't over-think which one — cheap graduation is fine indefinitely for
most things. Only bother extracting to a real repo if it needs independent
issue tracking, collaborators, or you want the monorepo's commit history
to stop including it.

## Reminders

- Every push deploys every *changed* project in parallel — that's normal,
  not a bug.
- `vercel link` and other CLI commands must be run from the monorepo root,
  not from inside a subfolder.
- If a prototype dies, just delete the Vercel project (Settings → Advanced
  → Delete) and leave the folder or delete it — doesn't affect the others.
