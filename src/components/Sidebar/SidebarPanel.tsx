import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SearchPanel from '../Search/SearchPanel';
import SettingsPanel from '../Settings/SettingsPanel';
import { useEditorStore } from '../../store/editorStore';
import FileTreeView from '../FileTree/FileTreeView';
import GitPanel from '../Git/GitPanel';
import type { SidebarPanel as PanelType } from '../../types';

const PANELS: Array<{ id: PanelType; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { id: 'files', icon: 'documents', label: 'Files' },
  { id: 'git', icon: 'git-branch', label: 'Source Control' },
  { id: 'search', icon: 'search', label: 'Search' },
  { id: 'settings', icon: 'settings-outline', label: 'Settings' },
];

export default function SidebarPanel() {
  const { sidebarPanel, setSidebarPanel, gitStatus } = useEditorStore();
  const gitBadge = gitStatus.staged.length + gitStatus.unstaged.length + gitStatus.untracked.length;

  return (
    <View style={styles.container}>
      <View style={styles.activityBar}>
        {PANELS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.activityItem, sidebarPanel === p.id && styles.activityItemActive]}
            onPress={() => setSidebarPanel(p.id)}
          >
            <Ionicons
              name={p.icon}
              size={22}
              color={sidebarPanel === p.id ? '#cccccc' : '#858585'}
            />
            {p.id === 'git' && gitBadge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{gitBadge > 99 ? '99+' : gitBadge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>
            {PANELS.find((p) => p.id === sidebarPanel)?.label.toUpperCase()}
          </Text>
        </View>
        <View style={styles.panelContent}>
          {sidebarPanel === 'files' && <FileTreeView />}
          {sidebarPanel === 'git' && <GitPanel />}
          {sidebarPanel === 'search' && <SearchPanel />}
          {sidebarPanel === 'settings' && <SettingsPanel />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  activityBar: {
    width: 48,
    backgroundColor: '#333333',
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  activityItem: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  activityItemActive: { borderLeftColor: '#cccccc' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#007acc',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: '#ffffff', fontWeight: '700' },
  panel: { flex: 1, backgroundColor: '#252526' },
  panelHeader: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#3c3c3c' },
  panelTitle: { fontSize: 11, color: '#bbbbbb', fontWeight: '600', letterSpacing: 1 },
  panelContent: { flex: 1 },
});
