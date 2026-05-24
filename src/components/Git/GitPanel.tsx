import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  checkoutBranch,
  commit,
  createBranch,
  getCurrentBranch,
  getRemotes,
  getStatus,
  listBranches,
  pull,
  push,
  stageAll,
  stageFile,
  unstageFile,
} from '../../services/git';
import { useEditorStore } from '../../store/editorStore';
import GitDiffView from './GitDiffView';
import GitHistoryView from './GitHistoryView';

type View = 'main' | 'diff' | 'history' | 'branches';

export default function GitPanel() {
  const { currentWorkspace, gitStatus, setGitStatus, activeBranch, setActiveBranch, gitSettings } =
    useEditorStore();
  const [commitMsg, setCommitMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>('main');
  const [diffFile, setDiffFile] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [hasRemote, setHasRemote] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const [status, br, remotes] = await Promise.all([
        getStatus(currentWorkspace),
        getCurrentBranch(currentWorkspace),
        getRemotes(currentWorkspace).catch(() => []),
      ]);
      setGitStatus(status);
      setActiveBranch(br ?? 'HEAD');
      setHasRemote(remotes.length > 0);
    } catch {}
  }, [currentWorkspace, setGitStatus, setActiveBranch]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleStageAll = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try { await stageAll(currentWorkspace); await refresh(); } finally { setLoading(false); }
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
    if (!gitSettings.authorName || !gitSettings.authorEmail) {
      Alert.alert('Author required', 'Set your name and email in Settings first');
      return;
    }
    setLoading(true);
    try {
      await commit(currentWorkspace, commitMsg.trim(), {
        name: gitSettings.authorName,
        email: gitSettings.authorEmail,
      });
      setCommitMsg('');
      await refresh();
      Alert.alert('Success', 'Committed successfully');
    } catch (e: any) {
      Alert.alert('Commit failed', e.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, commitMsg, gitStatus, gitSettings, refresh]);

  const handlePush = useCallback(async () => {
    if (!currentWorkspace) return;
    if (!gitSettings.token) {
      Alert.alert('Token required', 'Add a GitHub token in Settings to push');
      return;
    }
    setLoading(true);
    try {
      await push(currentWorkspace, gitSettings.token);
      Alert.alert('Pushed', `Pushed to remote successfully`);
    } catch (e: any) {
      Alert.alert('Push failed', e.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, gitSettings]);

  const handlePull = useCallback(async () => {
    if (!currentWorkspace) return;
    if (!gitSettings.authorName || !gitSettings.authorEmail) {
      Alert.alert('Author required', 'Set your name and email in Settings first');
      return;
    }
    setLoading(true);
    try {
      await pull(
        currentWorkspace,
        { name: gitSettings.authorName, email: gitSettings.authorEmail },
        gitSettings.token || undefined
      );
      await refresh();
      Alert.alert('Pulled', 'Up to date');
    } catch (e: any) {
      Alert.alert('Pull failed', e.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, gitSettings, refresh]);

  const openBranches = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const list = await listBranches(currentWorkspace);
      setBranches(list);
      setView('branches');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [currentWorkspace]);

  const handleCheckout = useCallback(
    async (branch: string) => {
      if (!currentWorkspace) return;
      setLoading(true);
      try {
        await checkoutBranch(currentWorkspace, branch);
        await refresh();
        setView('main');
      } catch (e: any) {
        Alert.alert('Checkout failed', e.message);
      } finally {
        setLoading(false);
      }
    },
    [currentWorkspace, refresh]
  );

  const handleNewBranch = useCallback(() => {
    Alert.prompt('New Branch', 'Branch name:', async (name) => {
      if (!name?.trim() || !currentWorkspace) return;
      setLoading(true);
      try {
        await createBranch(currentWorkspace, name.trim());
        await refresh();
        setView('main');
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    });
  }, [currentWorkspace, refresh]);

  if (!currentWorkspace) {
    return (
      <View style={styles.empty}>
        <Ionicons name="git-branch-outline" size={32} color="#3c3c3c" />
        <Text style={styles.emptyText}>No workspace open</Text>
      </View>
    );
  }

  // Sub-views
  if (view === 'diff') {
    return <GitDiffView filePath={diffFile} onClose={() => setView('main')} />;
  }
  if (view === 'history') {
    return <GitHistoryView onClose={() => setView('main')} />;
  }
  if (view === 'branches') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setView('main')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={16} color="#cccccc" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>BRANCHES</Text>
          <TouchableOpacity onPress={handleNewBranch} style={styles.iconBtn}>
            <Ionicons name="add" size={18} color="#858585" />
          </TouchableOpacity>
        </View>
        <ScrollView>
          {branches.map((b) => (
            <TouchableOpacity
              key={b}
              style={[styles.branchItem, b === activeBranch && styles.branchItemActive]}
              onPress={() => handleCheckout(b)}
            >
              <Ionicons name="git-branch" size={14} color={b === activeBranch ? '#007acc' : '#858585'} />
              <Text style={[styles.branchItemText, b === activeBranch && styles.branchItemTextActive]}>
                {b}
              </Text>
              {b === activeBranch && (
                <Ionicons name="checkmark" size={14} color="#007acc" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  const { staged, unstaged, untracked } = gitStatus;
  const hasChanges = staged.length + unstaged.length + untracked.length > 0;

  return (
    <View style={styles.container}>
      {/* Branch + actions row */}
      <View style={styles.branchRow}>
        <TouchableOpacity style={styles.branchBtn} onPress={openBranches}>
          <Ionicons name="git-branch" size={14} color="#cccccc" />
          <Text style={styles.branchName} numberOfLines={1}>{activeBranch || 'HEAD'}</Text>
          <Ionicons name="chevron-down" size={12} color="#858585" />
        </TouchableOpacity>
        <View style={styles.rowActions}>
          {hasRemote && (
            <>
              <TouchableOpacity onPress={handlePull} style={styles.iconBtn}>
                <Ionicons name="cloud-download-outline" size={16} color="#858585" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePush} style={styles.iconBtn}>
                <Ionicons name="cloud-upload-outline" size={16} color="#858585" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => setView('history')} style={styles.iconBtn}>
            <Ionicons name="time-outline" size={16} color="#858585" />
          </TouchableOpacity>
          <TouchableOpacity onPress={refresh} style={styles.iconBtn}>
            <Ionicons name="refresh" size={16} color="#858585" />
          </TouchableOpacity>
        </View>
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
                statusChar="A"
                statusColor="#4ec9b0"
                onPress={async () => { await unstageFile(currentWorkspace, f); refresh(); }}
                onDiff={() => { setDiffFile(f); setView('diff'); }}
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
                statusChar="M"
                statusColor="#e9c46a"
                onPress={async () => { await stageFile(currentWorkspace, f); refresh(); }}
                onDiff={() => { setDiffFile(f); setView('diff'); }}
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
                statusChar="U"
                statusColor="#858585"
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
            <Text style={styles.stageAllText}>Stage All ({unstaged.length + untracked.length})</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.commitInput}
          placeholder="Commit message…"
          placeholderTextColor="#555555"
          value={commitMsg}
          onChangeText={setCommitMsg}
          multiline
          numberOfLines={2}
        />
        <View style={styles.commitActions}>
          <TouchableOpacity
            style={[styles.commitBtn, !commitMsg.trim() && styles.commitBtnDisabled]}
            onPress={handleCommit}
            disabled={!commitMsg.trim() || loading}
          >
            <Ionicons name="checkmark" size={14} color="#ffffff" />
            <Text style={styles.commitBtnText}>Commit</Text>
          </TouchableOpacity>
          {hasRemote && (
            <TouchableOpacity style={styles.pushBtn} onPress={handlePush} disabled={loading}>
              <Ionicons name="cloud-upload-outline" size={14} color="#007acc" />
              <Text style={styles.pushBtnText}>Push</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function Section({
  title, icon, color, children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setCollapsed((c) => !c)}>
        <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={12} color="#858585" />
        <Ionicons name={icon} size={12} color={color} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </TouchableOpacity>
      {!collapsed && children}
    </View>
  );
}

function FileRow({
  name, statusChar, statusColor, onPress, onDiff, action,
}: {
  name: string;
  statusChar: string;
  statusColor: string;
  onPress: () => void;
  onDiff?: () => void;
  action: string;
}) {
  return (
    <View style={styles.fileRow}>
      <Text style={[styles.fileStatus, { color: statusColor }]}>{statusChar}</Text>
      <TouchableOpacity style={styles.fileNameBtn} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.fileName} numberOfLines={1}>{name}</Text>
        <Text style={styles.fileAction}>{action}</Text>
      </TouchableOpacity>
      {onDiff && (
        <TouchableOpacity onPress={onDiff} style={styles.diffBtn}>
          <Ionicons name="code-slash" size={14} color="#858585" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252526' },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
    gap: 4,
  },
  branchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3c3c3c', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4,
  },
  branchName: { flex: 1, fontSize: 13, color: '#cccccc' },
  rowActions: { flexDirection: 'row', gap: 2 },
  iconBtn: { padding: 6 },
  scroll: { flex: 1 },
  section: { marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 5, gap: 6,
  },
  sectionTitle: { fontSize: 11, color: '#858585', fontWeight: '600', textTransform: 'uppercase' },
  fileRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 24, paddingRight: 8, paddingVertical: 3,
  },
  fileNameBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileStatus: { fontSize: 11, width: 14, fontWeight: '700', marginRight: 6 },
  fileName: { flex: 1, fontSize: 12, color: '#cccccc', fontFamily: 'Menlo' },
  fileAction: { fontSize: 11, color: '#007acc' },
  diffBtn: { padding: 4 },
  noChanges: { flex: 1, alignItems: 'center', padding: 20 },
  noChangesText: { fontSize: 13, color: '#555555' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: '#555555' },
  commitArea: { padding: 8, gap: 6, borderTopWidth: 1, borderTopColor: '#3c3c3c' },
  stageAllBtn: {
    backgroundColor: '#2d2d2d', borderWidth: 1, borderColor: '#3c3c3c',
    borderRadius: 3, padding: 6, alignItems: 'center',
  },
  stageAllText: { fontSize: 12, color: '#cccccc' },
  commitInput: {
    backgroundColor: '#3c3c3c', borderRadius: 4, padding: 8,
    fontSize: 13, color: '#cccccc', minHeight: 50, textAlignVertical: 'top',
  },
  commitActions: { flexDirection: 'row', gap: 6 },
  commitBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: '#0e639c',
    borderRadius: 4, padding: 8, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  commitBtnDisabled: { opacity: 0.5 },
  commitBtnText: { fontSize: 13, color: '#ffffff', fontWeight: '600' },
  pushBtn: {
    flexDirection: 'row', borderWidth: 1, borderColor: '#007acc',
    borderRadius: 4, padding: 8, alignItems: 'center', gap: 6,
  },
  pushBtnText: { fontSize: 13, color: '#007acc' },
  subHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 8,
    borderBottomWidth: 1, borderBottomColor: '#3c3c3c', gap: 8,
  },
  backBtn: { padding: 4 },
  subHeaderTitle: { flex: 1, fontSize: 11, color: '#bbbbbb', fontWeight: '600', letterSpacing: 1 },
  branchItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  branchItemActive: { backgroundColor: 'rgba(0, 122, 204, 0.1)' },
  branchItemText: { flex: 1, fontSize: 13, color: '#cccccc' },
  branchItemTextActive: { color: '#007acc', fontWeight: '600' },
});
