import * as FileSystem from 'expo-file-system';

// Wraps expo-file-system as a POSIX-like fs interface for isomorphic-git.
// isomorphic-git operates on .git/ inside the workspace directory via this adapter.

interface StatResult {
  type: 'file' | 'dir';
  size: number;
  mode: number;
  mtimeMs: number;
  ctimeMs: number;
  ino: number;
  dev: number;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

function makeStat(isDir: boolean, size = 0): StatResult {
  const now = Date.now();
  return {
    type: isDir ? 'dir' : 'file',
    size,
    mode: isDir ? 0o40755 : 0o100644,
    mtimeMs: now,
    ctimeMs: now,
    ino: 1,
    dev: 1,
    isFile: () => !isDir,
    isDirectory: () => isDir,
    isSymbolicLink: () => false,
  };
}

function enoent(path: string): Error {
  return Object.assign(new Error(`ENOENT: no such file or directory '${path}'`), { code: 'ENOENT' });
}

const promises = {
  async readFile(path: string, options?: { encoding?: string }): Promise<string | Uint8Array> {
    const enc = typeof options === 'string' ? options : options?.encoding;
    try {
      if (enc === 'utf8' || enc === 'utf-8') {
        return FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
      }
      const b64 = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    } catch {
      throw enoent(path);
    }
  },

  async writeFile(path: string, data: string | Uint8Array, options?: any): Promise<void> {
    const enc = typeof options === 'string' ? options : options?.encoding;
    if (data instanceof Uint8Array) {
      let binary = '';
      for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
      await FileSystem.writeAsStringAsync(path, btoa(binary), {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      await FileSystem.writeAsStringAsync(path, data, { encoding: FileSystem.EncodingType.UTF8 });
    }
  },

  async unlink(path: string): Promise<void> {
    await FileSystem.deleteAsync(path, { idempotent: true });
  },

  async readdir(path: string): Promise<string[]> {
    try {
      return FileSystem.readDirectoryAsync(path);
    } catch {
      throw enoent(path);
    }
  },

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await FileSystem.makeDirectoryAsync(path, { intermediates: options?.recursive ?? false });
  },

  async rmdir(path: string): Promise<void> {
    await FileSystem.deleteAsync(path, { idempotent: true });
  },

  async stat(path: string): Promise<StatResult> {
    const info = await FileSystem.getInfoAsync(path, { size: true });
    if (!info.exists) throw enoent(path);
    return makeStat(info.isDirectory ?? false, (info as any).size ?? 0);
  },

  async lstat(path: string): Promise<StatResult> {
    return promises.stat(path);
  },

  // isomorphic-git calls readlink on symlinks; we don't support them but must not crash.
  async readlink(_path: string): Promise<string> {
    throw Object.assign(new Error('readlink not supported'), { code: 'ENOSYS' });
  },

  async symlink(_target: string, _path: string): Promise<void> {
    throw Object.assign(new Error('symlink not supported'), { code: 'ENOSYS' });
  },
};

export const expoFs = { promises };
