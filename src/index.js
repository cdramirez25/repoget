import { parseGitHubUrl, getDefaultBranch, getFileTree } from './github.js';
import {
  BACK,
  CANCEL,
  printWelcome,
  printError,
  printInfo,
  printWarning,
  askRepoUrl,
  askToken,
  askFileSelection,
  askOutputDir,
  printProgress,
  printSummary,
} from './ui.js';
import { downloadFiles } from './downloader.js';

/**
 * States:
 *   url → token → tree → files → output → download
 *
 * From the files screen the user can go back to url, or cancel entirely.
 */
export async function run(args) {
  printWelcome();

  if (args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  let state    = args[0] ? 'token' : 'url';
  let rawUrl   = args[0] ?? null;
  let token    = null;
  let owner, repo, branch, subPath;
  let files    = null;
  let selected = null;
  let outputDir = null;

  while (true) {

    // ── url ───────────────────────────────────────────────────────────────────
    if (state === 'url') {
      rawUrl = await askRepoUrl();
      files  = null;
      token  = null;
      state  = 'token';
      continue;
    }

    // ── token ─────────────────────────────────────────────────────────────────
    if (state === 'token') {
      token = await askToken();
      state = 'tree';
      continue;
    }

    // ── tree ──────────────────────────────────────────────────────────────────
    if (state === 'tree') {
      try {
        ({ owner, repo, branch = null, subPath = null } = parseGitHubUrl(rawUrl));
      } catch (err) {
        printError(err.message);
        state = 'url';
        continue;
      }

      printInfo(`Repository: ${owner}/${repo}`);
      if (subPath) printInfo(`Path filter: ${subPath}`);

      if (!branch) {
        printInfo('Fetching repository info…');
        try {
          branch = await getDefaultBranch(owner, repo, token);
          printInfo(`Default branch: ${branch}`);
        } catch (err) {
          printError(err.message);
          state = 'url';
          continue;
        }
      } else {
        printInfo(`Branch: ${branch}`);
      }

      printInfo('Scanning file tree…');
      let allFiles;
      try {
        allFiles = await getFileTree(owner, repo, branch, token);
      } catch (err) {
        printError(err.message);
        state = 'url';
        continue;
      }

      files = subPath
        ? allFiles.filter((f) => f.path === subPath || f.path.startsWith(subPath + '/'))
        : allFiles;

      if (files.length === 0) {
        printError(subPath
          ? `No files found under "${subPath}".`
          : 'This repository appears to be empty.');
        state = 'url';
        continue;
      }

      printInfo(`Found ${files.length} file(s).\n`);
      selected = null;
      state    = 'files';
      continue;
    }

    // ── files ─────────────────────────────────────────────────────────────────
    if (state === 'files') {
      const result = await askFileSelection(files, selected ?? []);

      if (result === CANCEL) {
        printWarning('Cancelled.');
        process.exit(0);
      }
      if (result === BACK) {
        state = 'url';
        continue;
      }

      selected = result;
      state    = 'output';
      continue;
    }

    // ── output ────────────────────────────────────────────────────────────────
    if (state === 'output') {
      outputDir = await askOutputDir();
      state     = 'download';
      continue;
    }

    // ── download ──────────────────────────────────────────────────────────────
    if (state === 'download') {
      console.log('');
      printInfo('Downloading…');
      console.log('');

      const results = await downloadFiles(
        selected, owner, repo, branch, outputDir, token,
        (current, total, filePath) => printProgress(current, total, filePath)
      );

      printSummary(results.downloaded, results.failed, results.totalBytes, outputDir);
      break;
    }
  }
}

function printUsage() {
  console.log('  Usage:');
  console.log('    repoget                  ← interactive mode');
  console.log('    repoget <github-url>     ← skip URL prompt\n');
  console.log('  Examples:');
  console.log('    repoget');
  console.log('    repoget https://github.com/owner/repo');
  console.log('    repoget https://github.com/owner/repo/tree/main/src\n');
  console.log('  Options:');
  console.log('    -h, --help    Show this help\n');
}