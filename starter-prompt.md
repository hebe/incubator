# Starter prompt — set up the "prototypes" monorepo

Paste this into Claude Code (or hand it to Claude with terminal/bash access)
in the folder where you want the repo created. Fill in the bracketed bits
first.

---

I want to set up a new local repo called `prototypes` for hosting small,
work-in-progress app experiments — each one lives in its own subfolder with
its own stack (framework, package.json, lockfile), and eventually gets
deployed as its own independent Vercel project pointed at that subfolder.

Please do the following:

1. Create a new folder called `prototypes` at [PATH, e.g. ~/Developer/prototypes]
   and `cd` into it.

2. Initialize it as a git repo (`git init`).

3. Create a root `README.md` with:
   - A one-line description: "Monorepo of small WIP app prototypes, each
     deployed independently on Vercel."
   - A short list of the current prototypes (empty for now) with their
     Vercel URLs, to be filled in as I add them.
   - A pointer to `note-to-self.md` for the workflow details.

4. Create `note-to-self.md` at the root with the content below (this is my
   own reference doc, copy it verbatim):

   [PASTE THE CONTENTS OF note-to-self.md HERE]

5. Add a root `.gitignore` covering common node/JS junk (`node_modules`,
   `.env*`, `.vercel`, `.DS_Store`, build output dirs like `.next`, `dist`,
   `build`) — since every subfolder will have its own stack, keep this
   broad rather than framework-specific.

6. Create the GitHub repo and push:
   - Use `gh repo create prototypes --private --source=. --remote=origin`
     if the GitHub CLI is available and I'm authenticated.
   - If `gh` isn't available or I'm not logged in, stop and tell me — don't
     try to create it any other way.
   - Commit everything so far (`README.md`, `note-to-self.md`, `.gitignore`)
     and push to `main`.

7. Scaffold my first prototype:
   - Folder: `prototypes/[FIRST-PROTOTYPE-NAME]`
   - Stack: [e.g. "Vite + React + TypeScript" or "plain HTML/CSS/JS" — tell
     me what you're building it in]
   - Give it a minimal working starting point (not a full app), just enough
     to deploy and confirm the pipeline works.
   - Commit and push.

8. Walk me through — don't do this part yourself, just give me the exact
   steps — connecting this as a new Vercel project via the dashboard:
   - Import the `prototypes` GitHub repo (again, as a *new* project).
   - Set Root Directory to `prototypes/[FIRST-PROTOTYPE-NAME]`.
   - Deploy.
   - Set the Ignored Build Step using the git diff command from
     `note-to-self.md`, substituted with this prototype's folder path.

9. Once that's live, update the root `README.md` with the prototype's name
   and its `.vercel.app` URL, commit, push.

Don't set up Turborepo, Nx, or any workspace tooling — I'm deliberately
keeping each prototype fully independent. If a database is needed for this
first prototype, ask me before provisioning anything (I use Neon, not
Supabase, by default).

---

**Next time I want to add a new prototype**, I'll just say something like:
"Add a new prototype called [name] using [stack] — set it up the way
note-to-self.md describes," and you can skip straight to steps 7–9 above.
