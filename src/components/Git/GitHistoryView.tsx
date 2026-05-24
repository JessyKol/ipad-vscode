import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getLog } from '../../services/git';
import { useEditorStore } from '../../store/editorStore';
import type { GitCommit } from '../../types';

type Props = { onClose: () => void };

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GitHistoryView({ onClose }: Props) {
  const { currentWorkspace } = useEditorStore();
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentWorkspace) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const log = await getLog(currentWorkspace, 50);
        setCommits(log);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load history');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentWorkspace]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={16} color="#cccccc" />
        </TouchableOpacity>
        <Text style={styles.title}>COMMIT HISTORY</Text>
      </View>

      {loading && <ActivityIndicator color="#007acc" style={{ margin: 16 }} />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && commits.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No commits yet</Text>
        </View>
      )}

      <ScrollView style={styles.scroll}>
        {commits.map((commit, idx) => (
          <View key={commit.oid} style={[styles.commit, idx === 0 && styles.commitFirst]}>
            <View style={styles.timeline}>
              <View style={[styles.dot, idx === 0 && styles.dotHead]} />
              {idx < commits.length - 1 && <View style={styles.line} />}
            </View>
            <View style={styles.info}>
              <Text style={styles.message} numberOfLines={2}>{commit.message}</Text>
              <View style={styles.meta}>
                <Ionicons name="person-outline" size={11} color="#858585" />
                <Text style={styles.metaText}>{commit.author}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{formatDate(commit.timestamp)}</Text>
              </View>
              <Text style={styles.oid}>{commit.oid.slice(0, 7)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252526' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 11, color: '#bbbbbb', fontWeight: '600', letterSpacing: 1 },
  scroll: { flex: 1 },
  commit: {
    flexDirection: 'row',
    paddingRight: 12,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  commitFirst: {},
  timeline: { width: 28, alignItems: 'center', paddingTop: 2 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#555555',
    marginTop: 2,
  },
  dotHead: { backgroundColor: '#007acc' },
  line: { width: 2, flex: 1, backgroundColor: '#3c3c3c', marginTop: 4, marginBottom: -4 },
  info: { flex: 1, paddingBottom: 10 },
  message: { fontSize: 13, color: '#cccccc', lineHeight: 18 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metaText: { fontSize: 11, color: '#858585' },
  metaDot: { fontSize: 11, color: '#555555' },
  oid: {
    marginTop: 4,
    fontSize: 11,
    color: '#569cd6',
    fontFamily: 'Menlo',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { fontSize: 13, color: '#555555' },
  error: { padding: 12, fontSize: 13, color: '#f44747' },
});
