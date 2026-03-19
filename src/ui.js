import chalk from 'chalk';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';

// ─── Welcome & decorative ────────────────────────────────────────────────────

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

// ─── Prompts ─────────────────────────────────────────────────────────────────

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

export async function askOutputDir(repoName) {
  const desktop = path.join(os.homedir(), 'Desktop');

  const { dir } = await inquirer.prompt([{
    type: 'input',
    name: 'dir',
    message: `Save inside ${chalk.gray('(folder "' + repoName + '" will be created here)')}:`,
    default: desktop,
    validate(input) {
      if (!input.trim()) return 'Please enter a valid path.';
      return true;
    },
  }]);

  // Always force <chosenDir>/<repoName> — files never scatter
  return path.join(dir.trim(), repoName);
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

// ─── Shared helpers (also used by browser.js) ────────────────────────────────

export function renderBar(pct, width = 24) {
  const filled = Math.round((pct / 100) * width);
  return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled));
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1_024)         return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(2)} MB`;
}