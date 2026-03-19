import { parseGitHubUrl, getDefaultBranch, getFileTree } from './github.js';
import { printWelcome, printError, printInfo, askRepoUrl, askOutputDir, printProgress, printSummary } from './ui.js';
import { runBrowser } from './browser.js';
import { downloadFiles } from './downloader.js';

/**
 * CLI args accepted:
 *   repoget                                   interactive
 *   repoget <url>                             skip URL prompt
 *   repoget <url> --token <ghp_xxx>           authenticated (private repos / high rate limit)
 *   repoget --token <ghp_xxx>                 token only, URL asked interactively
 */
export async function run(args) {
  printWelcome();

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  // ── Parse args ────────────────────────────────────────────────────────────
  const tokenIdx = args.indexOf('--token');
  const token    = tokenIdx !== -1 ? args[tokenIdx + 1] ?? null : null;

  // Remove --token <value> from args so the rest is just [url?]
  const cleanArgs = args.filter((_, i) => i !== tokenIdx && i !== tokenIdx + 1);
  const rawUrl    = cleanArgs[0] || await askRepoUrl();

  if (token) {
    printInfo('Using provided GitHub token.');
  }

  // ── Parse URL ─────────────────────────────────────────────────────────────
  let owner, repo, branch, subPath;
  try {
    ({ owner, repo, branch = null, subPath = null } = parseGitHubUrl(rawUrl));
  } catch (err) {
    printError(err.message);
    process.exit(1);
  }

  printInfo(`Repository: ${owner}/${repo}`);
  if (subPath) printInfo(`Path filter: ${subPath}`);

  // ── Resolve branch ────────────────────────────────────────────────────────
  if (!branch) {
    printInfo('Fetching repository info…');
    try {
      branch = await getDefaultBranch(owner, repo, token);
      printInfo(`Default branch: ${branch}`);
    } catch (err) {
      printError(err.message);
      process.exit(1);
    }
  } else {
    printInfo(`Branch: ${branch}`);
  }

  // ── Fetch file tree ───────────────────────────────────────────────────────
  printInfo('Scanning file tree…');
  let allFiles;
  try {
    allFiles = await getFileTree(owner, repo, branch, token);
  } catch (err) {
    printError(err.message);
    process.exit(1);
  }

  const files = subPath
    ? allFiles.filter(f => f.path === subPath || f.path.startsWith(subPath + '/'))
    : allFiles;

  if (files.length === 0) {
    printError(subPath ? `No files found under "${subPath}".` : 'Repository appears to be empty.');
    process.exit(1);
  }

  printInfo(`Found ${files.length} file(s).\n`);

  // ── File browser ──────────────────────────────────────────────────────────
  const selected = await runBrowser(files);

  if (!selected || selected.length === 0) {
    console.log('\n  Cancelled.\n');
    process.exit(0);
  }

  // ── Output directory ──────────────────────────────────────────────────────
  const outputDir = await askOutputDir(repo);

  // ── Download ──────────────────────────────────────────────────────────────
  console.log('');
  printInfo('Downloading…');
  console.log('');

  const results = await downloadFiles(
    selected, owner, repo, branch, outputDir, token,
    (current, total, filePath) => printProgress(current, total, filePath)
  );

  printSummary(results.downloaded, results.failed, results.totalBytes, outputDir);
}

function printUsage() {
  console.log('  Usage:');
  console.log('    repoget');
  console.log('    repoget <github-url>');
  console.log('    repoget <github-url> --token <your-github-token>\n');
  console.log('  Examples:');
  console.log('    repoget');
  console.log('    repoget https://github.com/owner/repo');
  console.log('    repoget https://github.com/owner/repo --token repoget_xxxxxxxxxxxx');
  console.log('    repoget https://github.com/owner/repo/tree/main/src\n');
  console.log('  Options:');
  console.log('    --token <token>   GitHub personal access token');
  console.log('                      (only needed for private repos or heavy usage)');
  console.log('    -h, --help        Show this help\n');
}