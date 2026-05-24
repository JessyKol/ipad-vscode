import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  createDirectory,
  createFile,
  deleteItem,
  getLanguageFromPath,
  readDirectory,
  readFile,
  renameItem,
} from '../../services/fileSystem';
import { useEditorStore } from '../../store/editorStore';
import type { FileNode } from '../../types';

const GIT_COLORS: Record<string, string> = {
  M: '#e9c46a',
  A: '#4ec9b0',
  U: '#858585',
  D: '#f44747',
};

type FileItemProps = {
  node: FileNode;
  depth: number;
  onRefresh: () => void;
  gitMap: Record<string, string>;
};

function FileItem({ node, depth, onRefresh, gitMap }: FileItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileNode[]>([]);
  const { openTab, tabs, setActiveTab } = useEditorStore();

  const gitStatus = gitMap[node.name] ?? gitMap[node.path.split('/').pop() ?? ''];

  const handlePress = useCallback(async () => {
    if (node.type === 'directory') {
      if (!expanded) {
        const nodes = await readDirectory(node.path);
        setChildren(nodes);
      }
      setExpanded((e) => !e);
    } else {
      // If already open, just switch to it
      const existing = tabs.find((t) => t.path === node.path);
      if (existing) {
        setActiveTab(existing.id);
        return;
      }
      try {
        const content = await readFile(node.path);
        openTab({
          path: node.path,
          name: node.name,
          content,
          isDirty: false,
          language: getLanguageFromPath(node.path),
        });
      } catch (e: any) {
        Alert.alert('Error', `Cannot read file: ${e.message}`);
      }
    }
  }, [node, expanded, openTab, tabs, setActiveTab]);

  const handleLongPress = useCallback(() => {
    const options: Array<{ text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }> = [];

    if (node.type === 'directory') {
      options.push({
        text: 'New File',
        onPress: () => Alert.prompt('File Name', '', async (name) => {
          if (name?.trim()) { await createFile(node.path, name.trim()); onRefresh(); }
        }),
      });
      options.push({
        text: 'New Folder',
        onPress: () => Alert.prompt('Folder Name', '', async (name) => {
          if (name?.trim()) { await createDirectory(node.path, name.trim()); onRefresh(); }
        }),
      });
    }

    options.push({
      text: 'Rename',
      onPress: () => Alert.prompt('Rename', 'New name:', async (newName) => {
        if (!newName?.trim()) return;
        const parent = node.path.substring(0, node.path.lastIndexOf('/'));
        const newPath = `${parent}/${newName.trim()}`;
        try {
          await renameItem(node.path, newPath);
          onRefresh();
        } catch (e: any) {
          Alert.alert('Error', e.message);
        }
      }, 'plain-text', node.name),
    });

    options.push({
      text: 'Delete',
      style: 'destructive',
      onPress: () => Alert.alert('Delete', `Delete "${node.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => { await deleteItem(node.path); onRefresh(); },
        },
      ]),
    });

    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(node.name, '', options);
  }, [node, onRefresh]);

  return (
    <>
      <TouchableOpacity
        style={[styles.item, { paddingLeft: 12 + depth * 16 }]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {node.type === 'directory' ? (
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={12}
            color="#858585"
            style={styles.chevron}
          />
        ) : (
          <View style={styles.chevron} />
        )}
        <Ionicons
          name={
            node.type === 'directory'
              ? expanded
                ? 'folder-open'
                : 'folder'
              : getFileIcon(node.name)
          }
          size={16}
          color={node.type === 'directory' ? '#dcb67a' : getFileColor(node.name)}
          style={styles.icon}
        />
        <Text style={styles.label} numberOfLines={1}>
          {node.name}
        </Text>
        {gitStatus && (
          <Text style={[styles.gitBadge, { color: GIT_COLORS[gitStatus] ?? '#858585' }]}>
            {gitStatus}
          </Text>
        )}
      </TouchableOpacity>
      {expanded &&
        children.map((child) => (
          <FileItem
            key={child.path}
            node={child}
            depth={depth + 1}
            onRefresh={onRefresh}
            gitMap={gitMap}
          />
        ))}
    </>
  );
}

function getFileIcon(name: string): keyof typeof Ionicons.glyphMap {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['ts', 'tsx'].includes(ext)) return 'logo-react';
  if (['js', 'jsx', 'mjs'].includes(ext)) return 'logo-javascript';
  if (['py'].includes(ext)) return 'logo-python';
  if (['json'].includes(ext)) return 'code-slash';
  if (['md', 'mdx'].includes(ext)) return 'document-text';
  if (['html', 'htm'].includes(ext)) return 'logo-html5';
  if (['css', 'scss', 'sass'].includes(ext)) return 'logo-css3';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image-outline';
  if (['sh', 'bash', 'zsh'].includes(ext)) return 'terminal-outline';
  if (['go'].includes(ext)) return 'logo-google';
  return 'document-outline';
}

function getFileColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['ts', 'tsx'].includes(ext)) return '#4ec9b0';
  if (['js', 'jsx', 'mjs'].includes(ext)) return '#f0db4f';
  if (['py'].includes(ext)) return '#3572a5';
  if (['json'].includes(ext)) return '#cbcb41';
  if (['md', 'mdx'].includes(ext)) return '#cccccc';
  if (['html', 'htm'].includes(ext)) return '#e34c26';
  if (['css', 'scss', 'sass'].includes(ext)) return '#563d7c';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return '#a0c4ff';
  return '#cccccc';
}

export default function FileTreeView() {
  const { fileTree, setFileTree, currentWorkspace, gitStatus } = useEditorStore();
  const [refreshKey, setRefreshKey] = useState(0);

  // Build a quick-lookup map: filename → git status character
  const gitMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    gitStatus.staged.forEach((f) => { m[f.split('/').pop() ?? f] = 'A'; });
    gitStatus.unstaged.forEach((f) => { m[f.split('/').pop() ?? f] = 'M'; });
    gitStatus.untracked.forEach((f) => { m[f.split('/').pop() ?? f] = 'U'; });
    return m;
  }, [gitStatus]);

  const refresh = useCallback(async () => {
    if (currentWorkspace) {
      const nodes = await readDirectory(currentWorkspace);
      setFileTree(nodes);
      setRefreshKey((k) => k + 1);
    }
  }, [currentWorkspace, setFileTree]);

  if (!currentWorkspace) {
    return (
      <View style={styles.empty}>
        <Ionicons name="folder-open-outline" size={48} color="#3c3c3c" />
        <Text style={styles.emptyText}>No folder open</Text>
        <Text style={styles.emptyHint}>Use "Open Folder" or clone a repo in Settings</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {fileTree.map((node) => (
        <FileItem
          key={`${node.path}-${refreshKey}`}
          node={node}
          depth={0}
          onRefresh={refresh}
          gitMap={gitMap}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingRight: 8,
  },
  chevron: { width: 14, marginRight: 2 },
  icon: { marginRight: 6 },
  label: { flex: 1, fontSize: 13, color: '#cccccc', fontFamily: 'Menlo' },
  gitBadge: { fontSize: 10, fontWeight: '700', width: 14, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  emptyText: { fontSize: 14, color: '#858585' },
  emptyHint: { fontSize: 12, color: '#555555', textAlign: 'center' },
});
