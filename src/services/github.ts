import { Octokit } from '@octokit/rest';

let _octokit: Octokit | null = null;

export function initGitHub(token: string): void {
  _octokit = new Octokit({ auth: token });
}

function octokit(): Octokit {
  if (!_octokit) throw new Error('GitHub not authenticated');
  return _octokit;
}

export type GitHubRepo = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  cloneUrl: string;
  defaultBranch: string;
  updatedAt: string;
};

export async function listUserRepos(): Promise<GitHubRepo[]> {
  const { data } = await octokit().repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 50,
  });
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    cloneUrl: r.clone_url,
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at ?? '',
  }));
}

export async function getAuthenticatedUser(): Promise<{ login: string; avatar: string }> {
  const { data } = await octokit().users.getAuthenticated();
  return { login: data.login, avatar: data.avatar_url };
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string> {
  const { data } = await octokit().repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(data) || data.type !== 'file') throw new Error('Not a file');
  return atob(data.content.replace(/\n/g, ''));
}

export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  await octokit().repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: btoa(content),
    sha,
  });
}
