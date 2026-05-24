import * as FileSystem from 'expo-file-system';
import type { FileNode } from '../types';

const WORKSPACE_DIR = FileSystem.documentDirectory + 'workspaces/';

export async function ensureWorkspaceDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(WORKSPACE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(WORKSPACE_DIR, { intermediates: true });
  }
}

export async function listWorkspaces(): Promise<string[]> {
  await ensureWorkspaceDir();
  const items = await FileSystem.readDirectoryAsync(WORKSPACE_DIR);
  return items;
}

export async function createWorkspace(name: string): Promise<string> {
  const path = WORKSPACE_DIR + name;
  await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  return path;
}

export async function readDirectory(dirPath: string): Promise<FileNode[]> {
  const items = await FileSystem.readDirectoryAsync(dirPath);
  const nodes: FileNode[] = await Promise.all(
    items.map(async (name) => {
      const fullPath = dirPath.endsWith('/') ? dirPath + name : `${dirPath}/${name}`;
      const info = await FileSystem.getInfoAsync(fullPath);
      const isDir = info.isDirectory ?? false;
      return {
        name,
        path: fullPath,
        type: isDir ? 'directory' : 'file',
        isExpanded: false,
        children: isDir ? [] : undefined,
      } as FileNode;
    })
  );
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readFile(path: string): Promise<string> {
  return FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
}

export async function writeFile(path: string, content: string): Promise<void> {
  await FileSystem.writeAsStringAsync(path, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function createFile(dirPath: string, name: string): Promise<string> {
  const path = `${dirPath}/${name}`;
  await writeFile(path, '');
  return path;
}

export async function createDirectory(dirPath: string, name: string): Promise<string> {
  const path = `${dirPath}/${name}`;
  await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  return path;
}

export async function deleteItem(path: string): Promise<void> {
  await FileSystem.deleteAsync(path, { idempotent: true });
}

export async function renameItem(fromPath: string, toPath: string): Promise<void> {
  await FileSystem.moveAsync({ from: fromPath, to: toPath });
}

export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    kt: 'kotlin', swift: 'swift', cpp: 'cpp', c: 'c', cs: 'csharp',
    html: 'html', css: 'css', scss: 'scss', json: 'json', yaml: 'yaml',
    yml: 'yaml', md: 'markdown', sh: 'shell', bash: 'shell',
    xml: 'xml', sql: 'sql', php: 'php', dart: 'dart',
  };
  return map[ext] ?? 'plaintext';
}
