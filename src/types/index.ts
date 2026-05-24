export type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isExpanded?: boolean;
};

export type EditorTab = {
  id: string;
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: string;
};

export type GitStatus = {
  staged: string[];
  unstaged: string[];
  untracked: string[];
};

export type GitCommit = {
  oid: string;
  message: string;
  author: string;
  timestamp: number;
};

export type GitRemote = {
  remote: string;
  url: string;
};

export type Theme = 'vs-dark' | 'vs-light' | 'hc-black';

export type SidebarPanel = 'files' | 'git' | 'search' | 'extensions';

export type TerminalSession = {
  id: string;
  title: string;
  type: 'local' | 'ssh';
  host?: string;
};
