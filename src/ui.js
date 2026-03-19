import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';

export const BACK = '__BACK__';
export const CANCEL = '__CANCEL__';

// ─── Decorative output ───────────────────────────────────────────────────────

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

export function printWarning(msg) {
  console.log(chalk.yellow('  ⚠  ') + chalk.yellow(msg));
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

/**
 * Prints usage examples and asks the user to paste a GitHub URL.
 * @returns {Promise<string>}
 */
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

/**
 * Asks for an optional GitHub token.
 * @returns {Promise<string|null>}
 */
export async function askToken() {
  const { token } = await inquirer.prompt([{
    type: 'password',
    name: 'token',
    message: 'GitHub token ' + chalk.gray('(optional — press Enter to skip)') + ':',
    mask: '●',
  }]);
  return token ? token.trim() : null;
}

/**
 * Shows ALL files in a single grouped checkbox.
 * The user selects everything they want across all folders in one pass.
 *
 * Controls shown:
 *   Space  = toggle file
 *   Enter  = confirm selection
 *
 * Returns BACK or an array of selected files.
 *
 * @param {Array<{ path: string, size: number }>} files
 * @param {Array<{ path: string, size: number }>} previousSelection  — pre-checked files when re-entering
 * @returns {Promise<string | Array>}
 */
export async function askFileSelection(files, previousSelection = []) {
  const prevPaths = new Set(previousSelection.map((f) => f.path));

  console.log('');
  console.log(
    chalk.gray('  Space') + chalk.white(' = select/deselect  ') +
    chalk.gray('↑↓') + chalk.white(' = move  ') +
    chalk.gray('Enter') + chalk.white(' = confirm')
  );
  console.log('');

  const choices = buildFileChoices(files, prevPaths);

  const { selected } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selected',
    message: `Pick the files you want to download ${chalk.gray('(' + files.length + ' total)')}:`,
    choices,
    pageSize: 24,
  }]);

  // After checkbox, show a small action menu so the user can confirm or go back
  const hasFiles = selected.length > 0;
  const totalSize = selected.reduce((acc, f) => acc + (f.size ?? 0), 0);
  const countLabel = hasFiles
    ? chalk.yellow.bold(String(selected.length)) + chalk.white(' file(s) selected') +
      (totalSize > 0 ? chalk.gray(` (~${formatBytes(totalSize)})`) : '')
    : chalk.yellow('No files selected');

  console.log('');
  console.log('  ' + countLabel);
  console.log('');

  const actionChoices = [];
  if (hasFiles) {
    actionChoices.push({ name: chalk.green('⬇  Download selected files'), value: 'confirm' });
  }
  actionChoices.push({ name: chalk.gray('↩  Select again') + chalk.dim(' (go back to the list)'), value: 'reselect' });
  actionChoices.push({ name: chalk.gray('⬅  Change repository URL'), value: BACK });
  actionChoices.push({ name: chalk.red('✖  Cancel'), value: CANCEL });

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What do you want to do?',
    choices: actionChoices,
  }]);

  if (action === 'reselect') {
    // Re-run this function keeping the current selection pre-checked
    return askFileSelection(files, selected);
  }

  return action === 'confirm' ? selected : action;
}

/**
 * Asks the user where to save the downloaded files.
 * @returns {Promise<string>}
 */
export async function askOutputDir() {
  const { dir } = await inquirer.prompt([{
    type: 'input',
    name: 'dir',
    message: 'Save files to:',
    default: './repoget-output',
    validate(input) {
      if (!input.trim()) return 'Please enter a valid directory path.';
      return true;
    },
  }]);
  return dir.trim();
}

// ─── Progress & Summary ───────────────────────────────────────────────────────

export function printProgress(current, total, filePath) {
  const pct = Math.round((current / total) * 100);
  const bar = renderBar(pct);
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
    for (const f of failed) {
      console.log(chalk.red('       • ') + chalk.gray(f));
    }
  }
  console.log('');
  console.log(chalk.bold('  📁 Files saved to:'));
  console.log(chalk.cyan('     ' + absolutePath));
  console.log('');
  console.log(chalk.gray('  Open in terminal: ') + chalk.white(`cd "${absolutePath}"`));
  console.log('  ' + chalk.gray('─'.repeat(54)) + '\n');
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Builds grouped checkbox choices. Files are sorted and grouped by top-level folder.
 * Items in prevPaths are pre-checked.
 */
function buildFileChoices(files, prevPaths = new Set()) {
  const choices = [];
  let lastDir = null;

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sorted) {
    const dir = path.dirname(file.path);
    const dirLabel = dir === '.' ? '/ (root)' : dir;

    if (dirLabel !== lastDir) {
      choices.push(new inquirer.Separator(
        chalk.gray('── ') + chalk.cyan(dirLabel) +
        chalk.gray(' ' + '─'.repeat(Math.max(0, 44 - dirLabel.length)))
      ));
      lastDir = dirLabel;
    }

    const basename = path.basename(file.path);
    const size = file.size != null ? chalk.gray('  ' + formatBytes(file.size)) : '';

    choices.push({
      name: chalk.white(basename) + size,
      value: file,
      short: file.path,
      checked: prevPaths.has(file.path),
    });
  }

  return choices;
}

function renderBar(pct, width = 24) {
  const filled = Math.round((pct / 100) * width);
  return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled));
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(2)} MB`;
}