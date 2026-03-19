# Contributing to repoget

Hey, thanks for wanting to contribute! 🎉  
repoget is a small open project and any help is welcome — bug fixes, ideas, improvements, whatever you've got.

---

## How to contribute

### Found a bug?
Open an issue describing what happened, what you expected, and your OS + Node.js version. The more detail the better.

### Have an idea or suggestion?
Open an issue too. Describe what you'd like and why it would be useful. No pressure, just a conversation.

### Want to send a PR?
Awesome. Here's the flow:

1. **Fork** the repo
2. **Create a branch** with a descriptive name
   ```bash
   git checkout -b fix/browser-scroll-bug
   git checkout -b feat/add-regex-filter
   ```
3. **Make your changes** — try to keep each PR focused on one thing
4. **Test it** — run `npm install && npm install -g .` and make sure `repoget` still works end to end
5. **Open the PR** — fill out the template and describe what you changed and why

---

## Project structure (quick reference)

```
src/
  index.js      ← entry point & argument parsing
  github.js     ← GitHub API calls
  downloader.js ← writes files to disk
  browser.js    ← raw terminal file browser (the interactive UI)
  ui.js         ← prompts, progress bar, summary output
```

If you're touching the browser, the logic lives entirely in `browser.js`.  
If you're touching prompts or output formatting, that's `ui.js`.

---

## Code style

- ES Modules (`import/export`) — no CommonJS
- Native Node.js APIs where possible — avoid adding new dependencies
- Keep things readable over clever

---

## Questions?

Open an issue or reach out. Happy to help you get started.