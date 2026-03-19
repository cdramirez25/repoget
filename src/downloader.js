import fs from 'fs';
import path from 'path';
import { getRawUrl } from './github.js';

/**
 * Downloads an array of files from a GitHub repository and saves them to disk,
 * preserving the original directory structure.
 *
 * @param {Array<{ path: string, size: number }>} files
 * @param {string}   owner
 * @param {string}   repo
 * @param {string}   branch
 * @param {string}   outputDir
 * @param {string|null} token      — optional, used for private repos
 * @param {Function} onProgress   — callback(current: number, total: number, filePath: string)
 * @returns {Promise<{ downloaded: number, failed: string[], totalBytes: number }>}
 */
export async function downloadFiles(files, owner, repo, branch, outputDir, token, onProgress) {
  const results = {
    downloaded: 0,
    failed: [],
    totalBytes: 0,
  };

  // Ensure the root output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    onProgress(i + 1, files.length, file.path);

    try {
      const bytes = await fetchFileBytes(owner, repo, branch, file.path, token);

      const destPath = path.join(outputDir, file.path);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, bytes);

      results.downloaded++;
      results.totalBytes += bytes.length;
    } catch (err) {
      results.failed.push(`${file.path}  (${err.message})`);
    }
  }

  return results;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * Fetches a single file and returns its content as a Buffer.
 * Falls back to the GitHub contents API if the raw URL fails (e.g., for LFS pointers).
 *
 * @param {string}      owner
 * @param {string}      repo
 * @param {string}      branch
 * @param {string}      filePath
 * @param {string|null} token
 * @returns {Promise<Buffer>}
 */
async function fetchFileBytes(owner, repo, branch, filePath, token) {
  const rawUrl = getRawUrl(owner, repo, branch, filePath);

  const headers = { 'User-Agent': 'repoget-cli/1.0' };
  if (token) headers['Authorization'] = `token ${token}`;

  const res = await fetch(rawUrl, { headers });

  if (!res.ok) {
    // For private repos the raw URL returns 404; fall back to contents API
    if (res.status === 404 && token) {
      return fetchViaContentsApi(owner, repo, branch, filePath, token);
    }
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Downloads a file through the GitHub Contents API (supports private repos).
 * The API returns base64-encoded content.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {string} filePath
 * @param {string} token
 * @returns {Promise<Buffer>}
 */
async function fetchViaContentsApi(owner, repo, branch, filePath, token) {
  const url =
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`,
      'User-Agent': 'repoget-cli/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();

  if (data.encoding !== 'base64' || !data.content) {
    throw new Error('Unexpected response format from GitHub Contents API');
  }

  // The API wraps content in newlines — strip them before decoding
  const base64 = data.content.replace(/\n/g, '');
  return Buffer.from(base64, 'base64');
}
