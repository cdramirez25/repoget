/**
 * browser.js — Interactive raw-terminal file browser.
 *
 * Controls:
 *   ↑ ↓     move cursor
 *   Space   enter folder / toggle file selection
 *   A       select all visible files (press again to deselect all)
 *   Q       go back (folder → parent, "all files" view → root)
 *   Enter   confirm selection and proceed
 *   Ctrl+C  cancel
 */

import chalk from 'chalk';
import path from 'path';
import { formatBytes } from './ui.js';

const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

/**
 * Runs the interactive file browser.
 *
 * @param {Array<{ path: string, size: number }>} allFiles
 * @returns {Promise<Array<{ path: string, size: number }> | null>}  null = cancelled
 */
export function runBrowser(allFiles) {
  return new Promise((resolve) => {

    // ── State ─────────────────────────────────────────────────────────────────
    const selected       = new Set();   // paths of selected files
    let stack            = [];          // [{ folderName, cursor }]  navigation history
    let cursor           = 0;
    let mode             = 'browse';    // 'browse' | 'all'
    let cursorBeforeAll  = 0;
    let renderedLines    = 0;

    // ── Item builders ─────────────────────────────────────────────────────────

    function getPrefix() {
      return stack.length > 0 ? stack.map(s => s.folderName).join('/') + '/' : '';
    }

    /**
     * Builds the list of rows to display.
     * Row types:
     *   showall   — "Show all files" entry (root only)
     *   back      — ".." entry (inside a folder)
     *   folder    — sub-directory
     *   file      — selectable file
     *   dirlabel  — non-selectable directory heading (only in 'all' mode)
     */
    function getItems() {
      if (mode === 'all') {
        const items  = [];
        let lastDir  = null;
        const sorted = [...allFiles].sort((a, b) => a.path.localeCompare(b.path));
        for (const f of sorted) {
          const dir      = path.dirname(f.path);
          const dirLabel = dir === '.' ? '/' : dir + '/';
          if (dirLabel !== lastDir) {
            items.push({ type: 'dirlabel', label: dirLabel });
            lastDir = dirLabel;
          }
          items.push({ type: 'file', file: f });
        }
        return items;
      }

      // browse mode
      const prefix  = getPrefix();
      const folders = new Set();
      const files   = [];

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

    // Skip non-interactive dirlabel rows when moving the cursor
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

    // ── Render ────────────────────────────────────────────────────────────────

    function render() {
      const items      = getItems();
      const termH      = process.stdout.rows    || 30;
      const termW      = process.stdout.columns || 80;
      const maxVisible = Math.max(5, termH - 9);

      // Scroll viewport so cursor stays visible
      const viewStart = Math.max(
        0,
        Math.min(cursor - Math.floor(maxVisible / 2), items.length - maxVisible)
      );
      const viewEnd = Math.min(items.length, viewStart + maxVisible);

      const lines = [];

      // Header
      const breadcrumb = mode === 'all'
        ? 'All files'
        : (stack.length === 0 ? '/' : stack.map(s => s.folderName).join('/') + '/');

      lines.push('');
      lines.push('  ' + chalk.bold.cyan('📁 ') + chalk.bold.white(breadcrumb));
      lines.push('  ' + chalk.gray('─'.repeat(Math.min(termW - 4, 60))));

      // Items
      for (let i = viewStart; i < viewEnd; i++) {
        const item     = items[i];
        const isCursor = i === cursor;

        // Non-selectable directory heading (only in 'all' mode)
        if (item.type === 'dirlabel') {
          lines.push(
            chalk.gray('  ── ') + chalk.cyan(item.label) +
            chalk.gray('─'.repeat(Math.max(0, Math.min(termW - 8, 54) - item.label.length)))
          );
          continue;
        }

        const arrow = isCursor ? chalk.cyan('▶ ') : '  ';

        if (item.type === 'showall') {
          lines.push(arrow + (isCursor
            ? chalk.white.bold.italic('  [ Show all files ]')
            : chalk.white.italic('  [ Show all files ]')
          ));

        } else if (item.type === 'back') {
          lines.push(arrow + chalk.gray('  ..') + chalk.dim('  (Q to go back)'));

        } else if (item.type === 'folder') {
          const hi = isCursor ? chalk.yellow.bold : chalk.yellow;
          lines.push(
            arrow + hi('📁 ') +
            (isCursor ? chalk.white.bold(item.name + '/') : chalk.white(item.name + '/'))
          );

        } else if (item.type === 'file') {
          const isSel  = selected.has(item.file.path);
          const check  = isSel ? chalk.green('[✓]') : chalk.gray('[ ]');
          const nameFn = isSel
            ? (isCursor ? chalk.green.bold : chalk.green)
            : (isCursor ? chalk.white.bold : chalk.white);
          const size   = item.file.size ? chalk.gray('  ' + formatBytes(item.file.size)) : '';
          lines.push(arrow + check + ' ' + nameFn(path.basename(item.file.path)) + size);
        }
      }

      // Scroll hint
      const totalInteractive = items.filter(i => i.type !== 'dirlabel').length;
      if (totalInteractive > maxVisible) {
        lines.push(chalk.gray(`    ↕  ${viewStart + 1}–${viewEnd} of ${items.length}`));
      }

      // Footer
      lines.push('  ' + chalk.gray('─'.repeat(Math.min(termW - 4, 60))));

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
      lines.push(
        '  ' +
        chalk.gray('Space') + chalk.white('=select/enter  ') +
        chalk.gray('A') + chalk.white('=select all  ') +
        chalk.gray('Q') + chalk.white('=back  ') +
        chalk.gray('Enter') + chalk.white('=download')
      );
      lines.push('');

      // Draw — overwrite previous render in-place
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

    // ── Key handler ───────────────────────────────────────────────────────────

    function onKey(key) {
      const items = getItems();

      // Ctrl+C — cancel
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

      // Space — enter folder / toggle file / trigger showall
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

      // Enter — confirm (only if something is selected)
      if (key === '\r' || key === '\n') {
        if (selected.size === 0) return;
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
        cursor     = prev.cursor;
      }
      render();
    }

    function cleanup() {
      process.stdout.write(SHOW_CURSOR);
      try { process.stdin.setRawMode(false); } catch {}
      process.stdin.pause();
      process.stdin.removeListener('data', onKey);
    }

    // ── Start ─────────────────────────────────────────────────────────────────
    process.stdout.write(HIDE_CURSOR);
    try {
      process.stdin.setRawMode(true);
    } catch {
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