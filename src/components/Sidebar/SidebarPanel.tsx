import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useEditorStore } from '../../store/editorStore';
import FileTreeView from '../FileTree/FileTreeView';
import GitPanel from '../Git/GitPanel';
import type { SidebarPanel as PanelType } from '../../types';

const PANELS: Array<{ id: PanelType; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { id: 'files', icon: 'documents', label: 'Files' },
  { id: 'git', icon: 'git-branch', label: 'Git' },
  { id: 'search', icon: 'search', label: 'Search' },
];

export default function SidebarPanel() {
  const { sidebarPanel, setSidebarPanel } = useEditorStore();

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
              size={24}
              color={sidebarPanel === p.id ? '#cccccc' : '#858585'}
            />
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
        </View>
      </View>
    </View>
  );
}

function SearchPanel() {
  return (
    <View style={styles.comingSoon}>
      <Ionicons name="search" size={32} color="#3c3c3c" />
      <Text style={styles.comingSoonText}>Search coming soon</Text>
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
  panel: { flex: 1, backgroundColor: '#252526' },
  panelHeader: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
  },
  panelTitle: {
    fontSize: 11,
    color: '#bbbbbb',
    fontWeight: '600',
    letterSpacing: 1,
  },
  panelContent: { flex: 1 },
  comingSoon: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  comingSoonText: { fontSize: 13, color: '#555555' },
});
