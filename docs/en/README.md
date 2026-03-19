# repoget — Full Documentation (English)

> ← [Back to root README](../../README.md) · [🇪🇸 Ver en Español](../es/README.md)

---

## What is it?

`repoget` is a CLI tool that lets you download specific files from any public GitHub repository — without cloning the whole thing. You navigate the file tree interactively, select only what you need, and it downloads everything preserving the original folder structure.

---

## Requirements

- Node.js **18.0.0 or higher** (uses native `fetch`)
- Works on **macOS, Linux and Windows**

---

## Installation

### Global (recommended)

```bash
npm install -g repoget
```

Once installed, the `repoget` command is available anywhere in your terminal.

### From source

```bash
git clone https://github.com/cdramirez25/repoget.git
cd repoget
npm install
npm install -g .
```

---

## Usage

```bash
# Launch interactive mode — just run repoget and follow the prompts
repoget

# Pass the URL directly to skip the URL prompt
repoget https://github.com/owner/repo

# Browse a specific branch
repoget https://github.com/owner/repo/tree/develop

# Browse a specific subfolder only
repoget https://github.com/owner/repo/tree/main/src/components

# Authenticated request (private repos or high usage)
repoget https://github.com/owner/repo --token ghp_xxxxxxxxxxxx

# Show help
repoget --help
```

---

## Step by step

### 1. Start the tool

```bash
repoget
```

You will see the welcome screen with usage examples and a prompt to paste the repository URL.

### 2. Paste the GitHub URL

Any of these formats work:

```
https://github.com/owner/repo
https://github.com/owner/repo/tree/branch
https://github.com/owner/repo/tree/branch/some/subfolder
```

### 3. Navigate the file browser

The interactive browser opens. You will see the folders and files at the root of the repository (or the subfolder if you included one in the URL).

```
  📁 /
  ────────────────────────────────────────────
  [ Show all files ]
▶ 📁 src/
  📁 docs/
  📄 README.md                   3.2 KB
  📄 package.json                0.8 KB
  ────────────────────────────────────────────
  No files selected yet
  Space=select/enter  A=select all  Q=back  Enter=download
```

### 4. Select your files

Navigate into folders with `Space`, select files with `Space`, and go back with `Q`. When you are done, press `Enter`.

### 5. Choose where to save

You will be asked for a destination folder. The default is your Desktop. A folder named after the repository will be created inside it automatically.

```
Save inside (folder "repoget" will be created here): C:\Users\you\Desktop
```

Result: `C:\Users\you\Desktop\repoget\`

### 6. Download and summary

The files download with a progress bar. At the end you get a summary with the file count, total size and the full absolute path to the folder.

---

## Browser controls

| Key | Action |
|-----|--------|
| `↑` `↓` | Move the cursor up and down |
| `Space` | Enter a folder / select or deselect a file |
| `A` | Select all visible files — press again to deselect all |
| `Q` | Go back to the parent folder |
| `Enter` | Confirm selection and start download |
| `Ctrl+C` | Cancel and exit |

**[ Show all files ]** — selecting this option switches to a flat view of every file in the repo, grouped by folder. Useful when you know exactly what you are looking for. Press `Q` to return to the folder tree.

---

## GitHub token

### Do I need one?

**No**, for public repositories. `repoget` works out of the box without any token.

You only need a token if:

| Situation | Needs token? |
|-----------|-------------|
| Public repo, casual use | ❌ No |
| Public repo, many requests in a short time | ✔ Recommended |
| Private repo | ✔ Required |

The anonymous GitHub API limit is **60 requests per hour per IP**. With a token it rises to **5,000 per hour**. Since `repoget` only makes 1–2 API calls per run, you are very unlikely to hit the limit with normal usage.

### How to get a token

1. Go to [github.com](https://github.com) and sign in
2. Click your profile photo → **Settings**
3. Scroll to the bottom → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)** → **Generate new token**
5. Give it a name (e.g. `repoget`)
6. For **public repos**: no scopes needed — just generate and copy
7. For **private repos**: check the `repo` scope

### How to use it

```bash
repoget https://github.com/owner/repo --token ghp_xxxxxxxxxxxx
```

The token is **never saved to disk** — it only exists for the duration of the command.

---

## Output folder structure

Files are always saved inside a folder named after the repository, preserving the original directory structure:

```
Desktop/
└── repoget/               ← repo name
    ├── src/
    │   ├── index.js
    │   └── browser.js
    └── README.md
```

This means files will never be scattered in the destination folder regardless of what path you choose.

---

## Project structure

```
repoget/
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md  ← PR template for contributors
├── bin/
│   └── repoget.js                ← CLI entry point with shebang
├── docs/
│   ├── en/
│   │   └── README.md             ← This file
│   └── es/
│       └── README.md             ← Spanish documentation
├── src/
│   ├── index.js                  ← Orchestration & argument parsing
│   ├── github.js                 ← GitHub API calls & URL parsing
│   ├── downloader.js             ← File fetching & writing to disk
│   ├── browser.js                ← Raw-terminal interactive file browser
│   └── ui.js                     ← Prompts, progress bar & output formatting
├── .gitignore
├── CONTRIBUTING.md
├── package.json
└── README.md
```

---

## Technical details

| Concern | Solution |
|---------|----------|
| HTTP requests | Native `fetch` (Node.js 18+) — no axios or node-fetch |
| File I/O | Native `fs` / `path` |
| Module system | ES Modules (`"type": "module"`) |
| Tree scan | Single call to `/repos/{owner}/{repo}/git/trees/{branch}?recursive=1` |
| Private repos | Falls back from raw URL to GitHub Contents API (base64 decode) |
| Large repos | Git Trees API truncation is detected and warned |
| Terminal UI | Raw mode via `process.stdin.setRawMode` — no ncurses dependency |
| Output folder | Always `<chosen-path>/<repo-name>/` — files never scatter |

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details on how to submit a PR.

---

## License

MIT — © Cristian Ramirez