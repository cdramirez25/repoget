# repoget

> Selective GitHub repository downloader — navigate folders and pick exactly the files you need.

```
  ██████╗ ███████╗██████╗  ██████╗  ██████╗ ███████╗████████╗
  ██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔════╝ ██╔════╝╚══██╔══╝
  ██████╔╝█████╗  ██████╔╝██║   ██║██║  ███╗█████╗     ██║   
  ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║██║   ██║██╔══╝     ██║   
  ██║  ██║███████╗██║     ╚██████╔╝╚██████╔╝███████╗   ██║   
  ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝  ╚═════╝ ╚══════╝   ╚═╝   
```

Created by **Cristian Ramirez**

[![npm version](https://img.shields.io/npm/v/repoget.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/repoget)
[![npm downloads](https://img.shields.io/npm/dm/repoget.svg?style=flat-square&color=green)](https://www.npmjs.com/package/repoget)
[![node version](https://img.shields.io/node/v/repoget.svg?style=flat-square&color=brightgreen)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/repoget.svg?style=flat-square&color=orange)](LICENSE)

---

🌐 **Language / Idioma**  
[🇺🇸 English](docs/en/README.md) · [🇪🇸 Español](docs/es/README.md)

> You are reading the default English version.  
> ¿Preferís leer esto en español? → [docs/es/README.md](docs/es/README.md)

---

## What is it?

`repoget` is a CLI tool that lets you download specific files from any public GitHub repository — without cloning the whole thing. You navigate the file tree interactively, select only what you need, and it downloads everything preserving the original folder structure.

---

## Features

- **Interactive file browser** — navigate folders with arrow keys, just like a file explorer
- **Single-call tree scan** — fetches the entire file tree in one API request
- **Preserves structure** — files are saved inside a folder named after the repo, keeping their original paths
- **Show all files** — flat view of every file in the repo, grouped by folder
- **Private repo support** — pass `--token` for authenticated access
- **Subpath URLs** — paste a `/tree/branch/folder` URL and browse only that subfolder
- **Zero bloat** — only 2 dependencies: `inquirer` and `chalk`. Everything else is native Node.js

---

## Requirements

- Node.js **18.0.0 or higher** (uses native `fetch`)

---

## Installation

### Global (recommended)

```bash
npm install -g repoget
```

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
# Launch interactive mode (recommended)
repoget

# Pass the URL directly and skip the prompt
repoget https://github.com/owner/repo

# Browse a specific branch
repoget https://github.com/owner/repo/tree/develop

# Browse a specific subfolder
repoget https://github.com/owner/repo/tree/main/src/components

# With a GitHub token (private repos or heavy usage)
repoget https://github.com/owner/repo --token ghp_xxxxxxxxxxxx

# Show help
repoget --help
```

---

## Interactive flow

```
repoget
  ↓
Paste the GitHub repository URL
  ↓
File browser opens
  ├── ↑ ↓  to move through folders and files
  ├── Space  to enter a folder or toggle a file
  ├── A      to select / deselect all visible files
  ├── Q      to go back to the parent folder
  ├── [ Show all files ]  for a flat view of everything
  └── Enter  when you are done selecting
  ↓
Choose where to save  (default: your Desktop)
  ↓
Files downloaded to  Desktop/<repo-name>/
  ↓
Summary — count, total size and absolute path
```

---

## Browser controls

| Key | Action |
|-----|--------|
| `↑` `↓` | Move cursor |
| `Space` | Enter a folder / select or deselect a file |
| `A` | Select all visible files — press again to deselect all |
| `Q` | Go back to the parent folder |
| `Enter` | Confirm selection and start download |
| `Ctrl+C` | Cancel |

---

## GitHub token

A token is **not required** for public repositories. You only need one if:

- The repository is **private**
- You use `repoget` many times in a short period (anonymous limit is 60 req/hr; with a token it rises to 5,000 req/hr)

**How to get one:**  
GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token  
No scopes needed for public repos. Add the `repo` scope for private repos.

```bash
repoget https://github.com/owner/repo --token ghp_xxxxxxxxxxxx
```

The token is **never stored on disk** — it only lives for the duration of the command.

---

## Project structure

```
repoget/
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md
├── bin/
│   └── repoget.js       ← CLI entry point (shebang)
├── docs/
│   ├── en/
│   │   └── README.md    ← Full docs in English
│   └── es/
│       └── README.md    ← Documentación completa en Español
├── src/
│   ├── index.js         ← Orchestration & argument parsing
│   ├── github.js        ← GitHub API calls & URL parsing
│   ├── downloader.js    ← File fetching & writing to disk
│   ├── browser.js       ← Raw-terminal interactive file browser
│   └── ui.js            ← Prompts, progress bar & output formatting
├── .gitignore
├── .npmignore
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
| Tree scan | Single request to `/repos/{owner}/{repo}/git/trees/{branch}?recursive=1` |
| Private repos | Falls back from raw URL to GitHub Contents API (base64 decode) |
| Large repos | Git Trees API truncation is detected and warned |
| Terminal UI | Raw mode via `process.stdin.setRawMode` — no ncurses dependency |
| Output folder | Always `<chosen-path>/<repo-name>/` — files never scatter |

---

## Contributing

Want to help improve repoget? Check out [CONTRIBUTING.md](CONTRIBUTING.md) — PRs are welcome.

---

## License

MIT — © Cristian Ramirez