import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { createDirectory, createFile, deleteItem, readDirectory, readFile } from '../../services/fileSystem';
import { useEditorStore } from '../../store/editorStore';
import type { FileNode } from '../../types';

type FileItemProps = {
  node: FileNode;
  depth: number;
  onRefresh: () => void;
};

function FileItem({ node, depth, onRefresh }: FileItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileNode[]>([]);
  const { openTab } = useEditorStore();

  const handlePress = useCallback(async () => {
    if (node.type === 'directory') {
      if (!expanded) {
        const nodes = await readDirectory(node.path);
        setChildren(nodes);
      }
      setExpanded((e) => !e);
    } else {
      const content = await readFile(node.path);
      const { getLanguageFromPath } = await import('../../services/fileSystem');
      openTab({
        path: node.path,
        name: node.name,
        content,
        isDirty: false,
        language: getLanguageFromPath(node.path),
      });
    }
  }, [node, expanded, openTab]);

  const handleLongPress = useCallback(() => {
    Alert.alert(node.name, '', [
      {
        text: 'New File',
        onPress: async () => {
          Alert.prompt('File Name', '', async (name) => {
            if (name && node.type === 'directory') {
              await createFile(node.path, name);
              onRefresh();
            }
          });
        },
      },
      node.type === 'directory'
        ? {
            text: 'New Folder',
            onPress: () => {
              Alert.prompt('Folder Name', '', async (name) => {
                if (name) {
                  await createDirectory(node.path, name);
                  onRefresh();
                }
              });
            },
          }
        : { text: 'Open', onPress: () => handlePress() },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete', `Delete "${node.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await deleteItem(node.path);
                onRefresh();
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [node, handlePress, onRefresh]);

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
          name={node.type === 'directory' ? (expanded ? 'folder-open' : 'folder') : getFileIcon(node.name)}
          size={16}
          color={node.type === 'directory' ? '#dcb67a' : '#cccccc'}
          style={styles.icon}
        />
        <Text style={styles.label} numberOfLines={1}>
          {node.name}
        </Text>
      </TouchableOpacity>
      {expanded && children.map((child) => (
        <FileItem key={child.path} node={child} depth={depth + 1} onRefresh={onRefresh} />
      ))}
    </>
  );
}

function getFileIcon(name: string): keyof typeof Ionicons.glyphMap {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) return 'logo-javascript';
  if (['py'].includes(ext)) return 'logo-python';
  if (['json'].includes(ext)) return 'code-slash';
  if (['md'].includes(ext)) return 'document-text';
  if (['html', 'htm'].includes(ext)) return 'logo-html5';
  if (['css', 'scss'].includes(ext)) return 'logo-css3';
  return 'document';
}

export default function FileTreeView() {
  const { fileTree, setFileTree, currentWorkspace } = useEditorStore();
  const [refreshKey, setRefreshKey] = useState(0);

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
        <Text style={styles.emptyHint}>Open a folder to start editing</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {fileTree.map((node) => (
        <FileItem key={`${node.path}-${refreshKey}`} node={node} depth={0} onRefresh={refresh} />
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: '#858585' },
  emptyHint: { fontSize: 12, color: '#555555' },
});
