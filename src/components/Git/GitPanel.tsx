import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { commit, getCurrentBranch, getStatus, stageAll, stageFile, unstageFile } from '../../services/git';
import { useEditorStore } from '../../store/editorStore';

export default function GitPanel() {
  const { currentWorkspace, gitStatus, setGitStatus } = useEditorStore();
  const [branch, setBranch] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const [status, br] = await Promise.all([
        getStatus(currentWorkspace),
        getCurrentBranch(currentWorkspace),
      ]);
      setGitStatus(status);
      setBranch(br ?? 'HEAD');
    } catch {}
  }, [currentWorkspace, setGitStatus]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleStageAll = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      await stageAll(currentWorkspace);
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, refresh]);

  const handleCommit = useCallback(async () => {
    if (!currentWorkspace || !commitMsg.trim()) {
      Alert.alert('Error', 'Commit message is required');
      return;
    }
    if (gitStatus.staged.length === 0) {
      Alert.alert('Nothing staged', 'Stage files before committing');
      return;
    }
    setLoading(true);
    try {
      await commit(currentWorkspace, commitMsg.trim(), {
        name: 'iPad VSCode',
        email: 'ipad@vscode.local',
      });
      setCommitMsg('');
      await refresh();
      Alert.alert('Success', 'Committed successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, commitMsg, gitStatus, refresh]);

  if (!currentWorkspace) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No workspace open</Text>
      </View>
    );
  }

  const { staged, unstaged, untracked } = gitStatus;
  const hasChanges = staged.length + unstaged.length + untracked.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.branchRow}>
        <Ionicons name="git-branch" size={14} color="#cccccc" />
        <Text style={styles.branchName}>{branch}</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={14} color="#858585" />
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#007acc" style={{ margin: 8 }} />}

      {!hasChanges && !loading && (
        <View style={styles.noChanges}>
          <Text style={styles.noChangesText}>No changes</Text>
        </View>
      )}

      <ScrollView style={styles.scroll}>
        {staged.length > 0 && (
          <Section title="Staged Changes" icon="checkmark-circle" color="#4ec9b0">
            {staged.map((f) => (
              <FileRow
                key={f}
                name={f}
                status="A"
                onPress={async () => { await unstageFile(currentWorkspace, f); refresh(); }}
                action="Unstage"
              />
            ))}
          </Section>
        )}

        {unstaged.length > 0 && (
          <Section title="Changes" icon="create" color="#e9c46a">
            {unstaged.map((f) => (
              <FileRow
                key={f}
                name={f}
                status="M"
                onPress={async () => { await stageFile(currentWorkspace, f); refresh(); }}
                action="Stage"
              />
            ))}
          </Section>
        )}

        {untracked.length > 0 && (
          <Section title="Untracked" icon="add-circle" color="#858585">
            {untracked.map((f) => (
              <FileRow
                key={f}
                name={f}
                status="U"
                onPress={async () => { await stageFile(currentWorkspace, f); refresh(); }}
                action="Stage"
              />
            ))}
          </Section>
        )}
      </ScrollView>

      <View style={styles.commitArea}>
        {unstaged.length + untracked.length > 0 && (
          <TouchableOpacity style={styles.stageAllBtn} onPress={handleStageAll}>
            <Text style={styles.stageAllText}>Stage All</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.commitInput}
          placeholder="Commit message..."
          placeholderTextColor="#555555"
          value={commitMsg}
          onChangeText={setCommitMsg}
          multiline
          numberOfLines={2}
        />
        <TouchableOpacity
          style={[styles.commitBtn, !commitMsg.trim() && styles.commitBtnDisabled]}
          onPress={handleCommit}
          disabled={!commitMsg.trim()}
        >
          <Ionicons name="checkmark" size={14} color="#ffffff" />
          <Text style={styles.commitBtnText}>Commit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={12} color={color} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FileRow({
  name,
  status,
  onPress,
  action,
}: {
  name: string;
  status: string;
  onPress: () => void;
  action: string;
}) {
  return (
    <TouchableOpacity style={styles.fileRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.fileStatus}>{status}</Text>
      <Text style={styles.fileName} numberOfLines={1}>{name}</Text>
      <Text style={styles.fileAction}>{action}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252526' },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#2d2d2d',
    gap: 6,
  },
  branchName: { flex: 1, fontSize: 13, color: '#cccccc' },
  refreshBtn: { padding: 4 },
  scroll: { flex: 1 },
  section: { marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  sectionTitle: { fontSize: 11, color: '#858585', fontWeight: '600', textTransform: 'uppercase' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  fileStatus: { fontSize: 11, color: '#4ec9b0', width: 14, fontWeight: '600' },
  fileName: { flex: 1, fontSize: 13, color: '#cccccc' },
  fileAction: { fontSize: 11, color: '#007acc' },
  noChanges: { flex: 1, alignItems: 'center', padding: 20 },
  noChangesText: { fontSize: 13, color: '#555555' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: '#555555' },
  commitArea: { padding: 8, gap: 6, borderTopWidth: 1, borderTopColor: '#3c3c3c' },
  stageAllBtn: {
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#3c3c3c',
    borderRadius: 3,
    padding: 6,
    alignItems: 'center',
  },
  stageAllText: { fontSize: 12, color: '#cccccc' },
  commitInput: {
    backgroundColor: '#3c3c3c',
    borderRadius: 4,
    padding: 8,
    fontSize: 13,
    color: '#cccccc',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  commitBtn: {
    flexDirection: 'row',
    backgroundColor: '#0e639c',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  commitBtnDisabled: { opacity: 0.5 },
  commitBtnText: { fontSize: 13, color: '#ffffff', fontWeight: '600' },
});
