import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import LightningFS from 'lightning-fs';
import type { GitCommit, GitStatus } from '../types';

const fs = new LightningFS('ipad-vscode-fs');

export { fs };

export async function initRepo(dir: string): Promise<void> {
  await git.init({ fs, dir });
}

export async function cloneRepo(url: string, dir: string, token?: string): Promise<void> {
  await git.clone({
    fs,
    http,
    dir,
    url,
    singleBranch: true,
    depth: 50,
    onAuth: token ? () => ({ username: token, password: '' }) : undefined,
  });
}

export async function getStatus(dir: string): Promise<GitStatus> {
  const matrix = await git.statusMatrix({ fs, dir });
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];

  for (const [filepath, head, workdir, stage] of matrix) {
    if (head === 0 && workdir === 2 && stage === 0) {
      untracked.push(filepath);
    } else if (stage !== head) {
      staged.push(filepath);
    } else if (workdir !== head) {
      unstaged.push(filepath);
    }
  }
  return { staged, unstaged, untracked };
}

export async function stageFile(dir: string, filepath: string): Promise<void> {
  await git.add({ fs, dir, filepath });
}

export async function unstageFile(dir: string, filepath: string): Promise<void> {
  await git.resetIndex({ fs, dir, filepath });
}

export async function stageAll(dir: string): Promise<void> {
  await git.add({ fs, dir, filepath: '.' });
}

export async function commit(
  dir: string,
  message: string,
  author: { name: string; email: string }
): Promise<string> {
  return git.commit({ fs, dir, message, author });
}

export async function push(dir: string, token: string): Promise<void> {
  await git.push({
    fs,
    http,
    dir,
    onAuth: () => ({ username: token, password: '' }),
  });
}

export async function pull(dir: string, token?: string): Promise<void> {
  await git.pull({
    fs,
    http,
    dir,
    onAuth: token ? () => ({ username: token, password: '' }) : undefined,
    author: { name: 'iPad VSCode', email: 'ipad@vscode.local' },
  });
}

export async function listBranches(dir: string): Promise<string[]> {
  return git.listBranches({ fs, dir });
}

export async function getCurrentBranch(dir: string): Promise<string | void> {
  return git.currentBranch({ fs, dir });
}

export async function createBranch(dir: string, ref: string): Promise<void> {
  await git.branch({ fs, dir, ref, checkout: true });
}

export async function getLog(dir: string, depth = 20): Promise<GitCommit[]> {
  const commits = await git.log({ fs, dir, depth });
  return commits.map((c) => ({
    oid: c.oid,
    message: c.commit.message.trim(),
    author: c.commit.author.name,
    timestamp: c.commit.author.timestamp,
  }));
}

export async function getDiff(dir: string, filepath: string): Promise<string> {
  try {
    const [head] = await git.log({ fs, dir, depth: 1 });
    if (!head) return '';
    const headContent = await git.readBlob({
      fs,
      dir,
      oid: head.oid,
      filepath,
    });
    return new TextDecoder().decode(headContent.blob);
  } catch {
    return '';
  }
}
