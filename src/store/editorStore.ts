import { create } from 'zustand';
import type { EditorTab, FileNode, GitSettings, GitStatus, SidebarPanel, Theme } from '../types';

type EditorStore = {
  tabs: EditorTab[];
  activeTabId: string | null;
  fileTree: FileNode[];
  currentWorkspace: string | null;
  gitStatus: GitStatus;
  activeBranch: string;
  sidebarPanel: SidebarPanel;
  sidebarVisible: boolean;
  theme: Theme;
  fontSize: number;
  gitSettings: GitSettings;

  openTab: (tab: Omit<EditorTab, 'id'>) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  saveTab: (id: string) => void;
  setFileTree: (nodes: FileNode[]) => void;
  setWorkspace: (path: string | null) => void;
  setGitStatus: (status: GitStatus) => void;
  setActiveBranch: (branch: string) => void;
  setSidebarPanel: (panel: SidebarPanel) => void;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  setGitSettings: (settings: Partial<GitSettings>) => void;
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  fileTree: [],
  currentWorkspace: null,
  gitStatus: { staged: [], unstaged: [], untracked: [] },
  activeBranch: '',
  sidebarPanel: 'files',
  sidebarVisible: true,
  theme: 'vs-dark',
  fontSize: 14,
  gitSettings: { authorName: '', authorEmail: '', token: '' },

  openTab: (tab) => {
    const existing = get().tabs.find((t) => t.path === tab.path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    const id = `${Date.now()}-${tab.path}`;
    set((s) => ({ tabs: [...s.tabs, { ...tab, id }], activeTabId: id }));
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    const remaining = tabs.filter((t) => t.id !== id);
    let nextActive = activeTabId;
    if (activeTabId === id) {
      nextActive = remaining[Math.min(idx, remaining.length - 1)]?.id ?? null;
    }
    set({ tabs: remaining, activeTabId: nextActive });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabContent: (id, content) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, content, isDirty: true } : t)),
    })),

  saveTab: (id) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, isDirty: false } : t)),
    })),

  setFileTree: (nodes) => set({ fileTree: nodes }),
  setWorkspace: (path) => set({ currentWorkspace: path }),
  setGitStatus: (status) => set({ gitStatus: status }),
  setActiveBranch: (branch) => set({ activeBranch: branch }),
  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setTheme: (theme) => set({ theme }),
  setFontSize: (size) => set({ fontSize: size }),
  setGitSettings: (settings) =>
    set((s) => ({ gitSettings: { ...s.gitSettings, ...settings } })),
}));
