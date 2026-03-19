import chalk from 'chalk';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';

const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

// ─── Welcome & prints ────────────────────────────────────────────────────────

export function printWelcome() {
  console.log('');
  console.log(
    chalk.cyan('  ██████╗ ███████╗██████╗  ██████╗  ██████╗ ███████╗████████╗\n') +
    chalk.cyan('  ██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔════╝ ██╔════╝╚══██╔══╝\n') +
    chalk.cyan('  ██████╔╝█████╗  ██████╔╝██║   ██║██║  ███╗█████╗     ██║   \n') +
    chalk.cyan('  ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║██║   ██║██╔══╝     ██║   \n') +
    chalk.cyan('  ██║  ██║███████╗██║     ╚██████╔╝╚██████╔╝███████╗   ██║   \n') +
    chalk.cyan('  ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝  ╚═════╝ ╚══════╝   ╚═╝   ')
  );
  console.log(chalk.gray('  Selective GitHub repository downloader\n'));
  console.log(chalk.gray('  ' + '─'.repeat(56) + '\n'));
}

export function printError(msg) {
  console.error(chalk.red('\n  ✖  ') + chalk.red(msg));
}

export function printInfo(msg) {
  console.log(chalk.blue('  ℹ  ') + chalk.gray(msg));
}

// ─── Simple prompts (use inquirer — not inside raw mode) ─────────────────────

export async function askRepoUrl() {
  console.log(chalk.gray('  How to use:'));
  console.log(
    chalk.gray('    ') + chalk.cyan('https://github.com/') +
    chalk.white('owner') + chalk.gray('/') + chalk.white('repo')
  );
  console.log(
    chalk.gray('    ') + chalk.cyan('https://github.com/') +
    chalk.white('owner') + chalk.gray('/') + chalk.white('repo') +
    chalk.gray('/tree/') + chalk.white('branch') + chalk.gray('/') + chalk.white('subfolder')
  );
  console.log('');

  const { url } = await inquirer.prompt([{
    type: 'input',
    name: 'url',
    message: chalk.white('Paste the GitHub repository URL:'),
    validate(input) {
      if (!input.trim()) return chalk.red('Please enter a GitHub URL.');
      if (!input.trim().startsWith('https://github.com/'))
        return chalk.red('Must start with https://github.com/');
      return true;
    },
  }]);
  console.log('');
  return url.trim();
}

export async function askToken() {
  const { token } = await inquirer.prompt([{
    type: 'password',
    name: 'token',
    message: 'GitHub token ' + chalk.gray('(optional — press Enter to skip)') + ':',
    mask: '●',
  }]);
  return token ? token.trim() : null;
}

export async function askOutputDir(repoName) {
  // Ask for the PARENT folder — we always append repoName automatically
  const desktop = path.join(os.homedir(), 'Desktop');

  const { dir } = await inquirer.prompt([{
    type: 'input',
    name: 'dir',
    message: `Save inside (a folder "${repoName}" will be created here):`,
    default: desktop,
    validate(input) {
      if (!input.trim()) return 'Please enter a valid path.';
      return true;
    },
  }]);

  // Always force <chosenDir>/<repoName> so files are never scattered
  return path.join(dir.trim(), repoName);
}

// ─── File Browser ─────────────────────────────────────────────────────────────
//
//  Controls:
//    ↑ ↓          — move cursor
//    Space        — enter folder  /  toggle file selection
//    A            — select all visible files / deselect all
//    Q            — go back (exit folder → parent, or exit "all" → root)
//    Enter        — confirm selection & proceed to download
//    Ctrl+C       — cancel
//
//  Two modes:
//    'browse'  — classic folder tree navigation
//    'all'     — flat grouped view of every file in the repo

/**
 * Runs the interactive file browser.
 * @param {Array<{path:string, size:number}>} allFiles
 * @returns {Promise<Array<{path:string, size:number}> | null>}  null = cancelled
 */
export function runBrowser(allFiles) {
  return new Promise((resolve) => {

    // ── State ────────────────────────────────────────────────────────────────
    const selected  = new Set();          // Set of selected file paths
    let stack       = [];                 // [{folderName, cursor}] nav history
    let cursor      = 0;
    let mode        = 'browse';           // 'browse' | 'all'
    let cursorBeforeAll = 0;              // restore cursor when leaving 'all'
    let renderedLines = 0;

    // ── Item builders ────────────────────────────────────────────────────────

    function getPrefix() {
      return stack.length > 0 ? stack.map(s => s.folderName).join('/') + '/' : '';
    }

    /**
     * Returns the list of "rows" to display.
     * Types:
     *   showall  — "Show all files" option (root only)
     *   back     — ".." row (inside a folder)
     *   folder   — a sub-directory
     *   file     — a selectable file
     *   dirlabel — non-selectable directory heading (only in 'all' mode)
     */
    function getItems() {
      if (mode === 'all') {
        const items = [];
        let lastDir = null;
        const sorted = [...allFiles].sort((a, b) => a.path.localeCompare(b.path));
        for (const f of sorted) {
          const dir = path.dirname(f.path);
          const dirLabel = dir === '.' ? '/' : dir + '/';
          if (dirLabel !== lastDir) {
            items.push({ type: 'dirlabel', label: dirLabel });
            lastDir = dirLabel;
          }
          items.push({ type: 'file', file: f });
        }
        return items;
      }

      // ── Browse mode ──────────────────────────────────────────────────────
      const prefix   = getPrefix();
      const folders  = new Set();
      const files    = [];

      for (const f of allFiles) {
        if (prefix && !f.path.startsWith(prefix)) continue;
        const rest  = prefix ? f.path.slice(prefix.length) : f.path;
        const parts = rest.split('/');
        if (parts.length === 1) {
          files.push(f);
        } else {
          folders.add(parts[0]);
        }
      }

      const items = [];
      if (stack.length === 0) {
        items.push({ type: 'showall' });
      } else {
        items.push({ type: 'back' });
      }

      for (const name of [...folders].sort()) {
        items.push({ type: 'folder', name, fullPath: prefix + name });
      }
      for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
        items.push({ type: 'file', file: f });
      }

      return items;
    }

    // Skip non-selectable dirlabel rows when moving cursor
    function nextSelectable(items, from, dir) {
      let i = from + dir;
      while (i >= 0 && i < items.length && items[i].type === 'dirlabel') i += dir;
      if (i < 0 || i >= items.length) return from;
      return i;
    }

    function firstSelectable(items) {
      const i = items.findIndex(it => it.type !== 'dirlabel');
      return i === -1 ? 0 : i;
    }

    // ── Render ───────────────────────────────────────────────────────────────

    function render() {
      const items      = getItems();
      const termH      = process.stdout.rows  || 30;
      const termW      = process.stdout.columns || 80;
      const maxVisible = Math.max(5, termH - 9);

      // Scroll viewport so cursor is always visible
      const viewStart = Math.max(
        0,
        Math.min(cursor - Math.floor(maxVisible / 2), items.length - maxVisible)
      );
      const viewEnd = Math.min(items.length, viewStart + maxVisible);

      const lines = [];

      // ── Header ────────────────────────────────────────────────────────────
      const breadcrumb = mode === 'all'
        ? 'All files'
        : (stack.length === 0 ? '/' : stack.map(s => s.folderName).join('/') + '/');

      lines.push('');
      lines.push('  ' + chalk.bold.cyan('📁 ') + chalk.bold.white(breadcrumb));
      lines.push('  ' + chalk.gray('─'.repeat(Math.min(termW - 4, 60))));

      // ── Items ─────────────────────────────────────────────────────────────
      for (let i = viewStart; i < viewEnd; i++) {
        const item      = items[i];
        const isCursor  = i === cursor;

        // Directory heading (non-selectable, no cursor arrow)
        if (item.type === 'dirlabel') {
          lines.push(
            chalk.gray('  ── ') + chalk.cyan(item.label) +
            chalk.gray('─'.repeat(Math.max(0, Math.min(termW - 8, 54) - item.label.length)))
          );
          continue;
        }

        const arrow = isCursor ? chalk.cyan('▶ ') : '  ';

        if (item.type === 'showall') {
          lines.push(arrow + chalk.white.italic('  [ Show all files ]'));

        } else if (item.type === 'back') {
          lines.push(arrow + chalk.gray('  ← ..  ') + chalk.dim('(press Q to go back)'));

        } else if (item.type === 'folder') {
          const hi = isCursor ? chalk.yellow.bold : chalk.yellow;
          lines.push(arrow + hi('📁 ') + (isCursor ? chalk.white.bold(item.name + '/') : chalk.white(item.name + '/')));

        } else if (item.type === 'file') {
          const isSel  = selected.has(item.file.path);
          const check  = isSel ? chalk.green('[✓]') : chalk.gray('[ ]');
          const nameFn = isSel
            ? (isCursor ? chalk.green.bold : chalk.green)
            : (isCursor ? chalk.white.bold : chalk.white);
          const name = nameFn(path.basename(item.file.path));
          const size = item.file.size ? chalk.gray('  ' + formatBytes(item.file.size)) : '';
          lines.push(arrow + check + ' ' + name + size);
        }
      }

      // Scroll hint
      if (items.filter(i => i.type !== 'dirlabel').length > maxVisible) {
        lines.push(chalk.gray(`    ↕  showing ${viewStart + 1}–${viewEnd} of ${items.length}`));
      }

      // ── Footer ────────────────────────────────────────────────────────────
      lines.push('  ' + chalk.gray('─'.repeat(Math.min(termW - 4, 60))));

      // Selection count
      const selCount = selected.size;
      const selSize  = [...selected].reduce((acc, p) => {
        const f = allFiles.find(f => f.path === p);
        return acc + (f?.size ?? 0);
      }, 0);
      const selLabel = selCount > 0
        ? chalk.yellow.bold(String(selCount)) + chalk.gray(' file(s) selected') +
          (selSize > 0 ? chalk.gray(` (~${formatBytes(selSize)})`) : '')
        : chalk.gray('No files selected yet');
      lines.push('  ' + selLabel);

      // Key legend
      lines.push(
        '  ' +
        chalk.gray('Space') + chalk.white('=select/enter  ') +
        chalk.gray('A') + chalk.white('=select all  ') +
        chalk.gray('Q') + chalk.white('=back  ') +
        chalk.gray('Enter') + chalk.white('=download')
      );
      lines.push('');

      // ── Draw ──────────────────────────────────────────────────────────────
      if (renderedLines > 0) {
        process.stdout.write(`\x1b[${renderedLines}A`);
      }
      for (const line of lines) {
        process.stdout.write('\x1b[2K\r' + line + '\n');
      }
      // Clear leftover lines if render shrank
      const extra = renderedLines - lines.length;
      if (extra > 0) {
        for (let i = 0; i < extra; i++) process.stdout.write('\x1b[2K\r\n');
        process.stdout.write(`\x1b[${extra}A`);
      }
      renderedLines = lines.length;
    }

    // ── Key handler ──────────────────────────────────────────────────────────

    function onKey(key) {
      const items = getItems();

      // Ctrl+C
      if (key === '\x03') {
        cleanup();
        console.log('\n');
        resolve(null);
        return;
      }

      // ↑ Up
      if (key === '\x1b[A') {
        cursor = nextSelectable(items, cursor, -1);
        render();
        return;
      }

      // ↓ Down
      if (key === '\x1b[B') {
        cursor = nextSelectable(items, cursor, +1);
        render();
        return;
      }

      // Space — enter folder or toggle file
      if (key === ' ') {
        const item = items[cursor];
        if (!item) return;

        if (item.type === 'file') {
          if (selected.has(item.file.path)) {
            selected.delete(item.file.path);
          } else {
            selected.add(item.file.path);
          }

        } else if (item.type === 'folder') {
          stack.push({ folderName: item.name, cursor });
          cursor = 0;

        } else if (item.type === 'showall') {
          cursorBeforeAll = cursor;
          mode   = 'all';
          cursor = firstSelectable(getItems());

        } else if (item.type === 'back') {
          doBack();
          return;
        }

        render();
        return;
      }

      // Q — go back
      if (key === 'q' || key === 'Q') {
        doBack();
        return;
      }

      // A — toggle all visible files
      if (key === 'a' || key === 'A') {
        const fileItems = items.filter(i => i.type === 'file');
        const allSel    = fileItems.length > 0 && fileItems.every(i => selected.has(i.file.path));
        if (allSel) {
          fileItems.forEach(i => selected.delete(i.file.path));
        } else {
          fileItems.forEach(i => selected.add(i.file.path));
        }
        render();
        return;
      }

      // Enter — confirm
      if (key === '\r' || key === '\n') {
        if (selected.size === 0) {
          // Nothing selected — do nothing (user must select something first)
          return;
        }
        cleanup();
        console.log('\n');
        resolve(allFiles.filter(f => selected.has(f.path)));
        return;
      }
    }

    function doBack() {
      if (mode === 'all') {
        mode   = 'browse';
        cursor = cursorBeforeAll;
      } else if (stack.length > 0) {
        const prev = stack.pop();
        cursor = prev.cursor;
      }
      render();
    }

    function cleanup() {
      process.stdout.write(SHOW_CURSOR);
      try { process.stdin.setRawMode(false); } catch {}
      process.stdin.pause();
      process.stdin.removeListener('data', onKey);
    }

    // ── Start ────────────────────────────────────────────────────────────────
    process.stdout.write(HIDE_CURSOR);
    try {
      process.stdin.setRawMode(true);
    } catch {
      // Not a real TTY (e.g. piped input) — can't use raw mode
      cleanup();
      resolve(null);
      return;
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', onKey);

    render();
  });
}

// ─── Progress & Summary ───────────────────────────────────────────────────────

export function printProgress(current, total, filePath) {
  const pct   = Math.round((current / total) * 100);
  const bar   = renderBar(pct);
  const label = filePath.length > 45 ? '…' + filePath.slice(-44) : filePath;
  process.stdout.write(
    `\r  ${bar} ${chalk.gray(String(pct).padStart(3) + '%')}  ${chalk.white(label)}` + ' '.repeat(5)
  );
  if (current === total) process.stdout.write('\n');
}

export function printSummary(downloaded, failed, totalBytes, outputDir) {
  const absolutePath = path.resolve(outputDir);
  console.log('\n  ' + chalk.gray('─'.repeat(54)));
  console.log(
    chalk.green.bold(`  ✔  Downloaded: ${downloaded} file(s)`) +
    (totalBytes > 0 ? chalk.green(` (${formatBytes(totalBytes)})`) : '')
  );
  if (failed.length > 0) {
    console.log(chalk.red(`  ✖  Failed:     ${failed.length} file(s)`));
    for (const f of failed) console.log(chalk.red('       • ') + chalk.gray(f));
  }
  console.log('');
  console.log(chalk.bold('  📁 Files saved to:'));
  console.log(chalk.cyan('     ' + absolutePath));
  console.log('');
  console.log(chalk.gray('  Open in terminal: ') + chalk.white(`cd "${absolutePath}"`));
  console.log('  ' + chalk.gray('─'.repeat(54)) + '\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderBar(pct, width = 24) {
  const filled = Math.round((pct / 100) * width);
  return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled));
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1_024)         return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(2)} MB`;
}