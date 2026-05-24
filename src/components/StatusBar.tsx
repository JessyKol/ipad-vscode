import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useEditorStore } from '../store/editorStore';

type Props = {
  line?: number;
  column?: number;
  onBranchPress?: () => void;
};

export default function StatusBar({ line, column, onBranchPress }: Props) {
  const { tabs, activeTabId, gitStatus, activeBranch, setSidebarPanel } = useEditorStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const totalChanges = gitStatus.staged.length + gitStatus.unstaged.length + gitStatus.untracked.length;

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <TouchableOpacity
          style={styles.item}
          onPress={() => { setSidebarPanel('git'); onBranchPress?.(); }}
        >
          <Ionicons name="git-branch" size={12} color="#ffffff" />
          <Text style={styles.text}>{activeBranch || 'main'}</Text>
        </TouchableOpacity>
        {totalChanges > 0 && (
          <TouchableOpacity
            style={styles.item}
            onPress={() => setSidebarPanel('git')}
          >
            <Ionicons name="alert-circle" size={12} color="#ffffff" />
            <Text style={styles.text}>
              {totalChanges} change{totalChanges > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.right}>
        {activeTab && (
          <>
            <Text style={styles.text}>{activeTab.language}</Text>
            <Text style={styles.separator}>|</Text>
          </>
        )}
        {line !== undefined && (
          <>
            <Text style={styles.text}>Ln {line}, Col {column}</Text>
            <Text style={styles.separator}>|</Text>
          </>
        )}
        <Text style={styles.text}>UTF-8</Text>
        <Text style={styles.separator}>|</Text>
        <Text style={styles.text}>LF</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 22,
    backgroundColor: '#007acc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontSize: 12, color: '#ffffff' },
  separator: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});
