import { parseGitHubUrl, getDefaultBranch, getFileTree } from './github.js';
import {
  printWelcome,
  printError,
  printInfo,
  askRepoUrl,
  askToken,
  askOutputDir,
  runBrowser,
  printProgress,
  printSummary,
} from './ui.js';
import { downloadFiles } from './downloader.js';

export async function run(args) {
  printWelcome();

  if (args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  // ── 1. URL ────────────────────────────────────────────────────────────────
  const rawUrl = args[0] || await askRepoUrl();

  // ── 2. Token ──────────────────────────────────────────────────────────────
  const token = await askToken();

  // ── 3. Parse URL ──────────────────────────────────────────────────────────
  let owner, repo, branch, subPath;
  try {
    ({ owner, repo, branch = null, subPath = null } = parseGitHubUrl(rawUrl));
  } catch (err) {
    printError(err.message);
    process.exit(1);
  }

  printInfo(`Repository: ${owner}/${repo}`);
  if (subPath) printInfo(`Path filter: ${subPath}`);

  // ── 4. Resolve branch ─────────────────────────────────────────────────────
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

  // ── 5. Fetch file tree ────────────────────────────────────────────────────
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

  // ── 6. File browser ───────────────────────────────────────────────────────
  const selected = await runBrowser(files);

  if (!selected || selected.length === 0) {
    console.log('\n  Cancelled.\n');
    process.exit(0);
  }

  // ── 7. Output directory ───────────────────────────────────────────────────
  const outputDir = await askOutputDir(repo);

  // ── 8. Download ───────────────────────────────────────────────────────────
  console.log('');
  printInfo('Downloading…');
  console.log('');

  const results = await downloadFiles(
    selected, owner, repo, branch, outputDir, token,
    (current, total, filePath) => printProgress(current, total, filePath)
  );

  // ── 9. Summary ────────────────────────────────────────────────────────────
  printSummary(results.downloaded, results.failed, results.totalBytes, outputDir);
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