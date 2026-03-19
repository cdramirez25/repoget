const GITHUB_API = 'https://api.github.com';

/**
 * Parses a GitHub URL into its components.
 * Supports:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/branch
 *   https://github.com/owner/repo/tree/branch/some/sub/path
 *
 * @param {string} rawUrl
 * @returns {{ owner: string, repo: string, branch: string|null, subPath: string|null }}
 */
export function parseGitHubUrl(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error(`"${rawUrl}" is not a valid URL.`);
  }

  if (u.hostname !== 'github.com') {
    throw new Error(`Not a GitHub URL. Hostname must be "github.com", got "${u.hostname}".`);
  }

  const parts = u.pathname.split('/').filter(Boolean);

  if (parts.length < 2) {
    throw new Error('URL must include at least an owner and a repository name.');
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, '');
  let branch = null;
  let subPath = null;

  // /owner/repo/tree/<branch>[/path...]
  if (parts[2] === 'tree' && parts.length >= 4) {
    branch = parts[3];
    if (parts.length > 4) {
      subPath = parts.slice(4).join('/');
    }
  }

  return { owner, repo, branch, subPath };
}

/**
 * Fetches the default branch name from the GitHub API.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string|null} token
 * @returns {Promise<string>}
 */
export async function getDefaultBranch(owner, repo, token) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: buildHeaders(token),
  });

  await assertOk(res, `repository "${owner}/${repo}"`);
  const data = await res.json();
  return data.default_branch;
}

/**
 * Fetches the complete recursive file tree of a repository branch.
 * Returns only blob (file) entries, not tree (directory) entries.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {string|null} token
 * @returns {Promise<Array<{ path: string, size: number, sha: string }>>}
 */
export async function getFileTree(owner, repo, branch, token) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(url, { headers: buildHeaders(token) });

  await assertOk(res, `branch "${branch}"`);
  const data = await res.json();

  if (data.truncated) {
    // Warn but continue — partial tree is still useful
    console.warn(
      '\n\x1b[33m⚠  Warning:\x1b[0m The repository tree was truncated by GitHub (too many files). ' +
      'Some files may not appear in the list.\n'
    );
  }

  return data.tree.filter((item) => item.type === 'blob');
}

/**
 * Builds the raw.githubusercontent.com URL for a specific file.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {string} filePath
 * @returns {string}
 */
export function getRawUrl(owner, repo, branch, filePath) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'repoget-cli/1.0',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
}

async function assertOk(res, context) {
  if (res.ok) return;

  const status = res.status;

  if (status === 404) {
    throw new Error(`Not found: ${context}. Check the URL and ensure you have access.`);
  }
  if (status === 401) {
    throw new Error('Authentication failed. Check your GitHub token.');
  }
  if (status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      const reset = res.headers.get('x-ratelimit-reset');
      const resetDate = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : 'soon';
      throw new Error(
        `GitHub API rate limit exceeded. Resets at ${resetDate}. ` +
        'Provide a GitHub token to increase the limit.'
      );
    }
    throw new Error(`Access forbidden (403). The repository may be private. Try providing a token.`);
  }
  if (status === 422) {
    throw new Error(`GitHub could not process the request (422). The branch or tree may be invalid.`);
  }

  throw new Error(`GitHub API error: ${status} ${res.statusText}`);
}
