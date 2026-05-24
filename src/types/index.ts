export type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isExpanded?: boolean;
  gitStatus?: 'M' | 'A' | 'U' | 'D'; // modified / added / untracked / deleted
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

export type GitSettings = {
  authorName: string;
  authorEmail: string;
  token: string;
};

export type Theme = 'vs-dark' | 'vs-light' | 'hc-black';

export type SidebarPanel = 'files' | 'git' | 'search' | 'settings';

export type TerminalSession = {
  id: string;
  title: string;
  type: 'local' | 'ssh';
  host?: string;
};

export type SearchResult = {
  file: string;
  filePath: string;
  line: number;
  text: string;
  matchStart: number;
  matchEnd: number;
};
