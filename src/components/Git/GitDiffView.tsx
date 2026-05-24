import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { readFile } from '../../services/fileSystem';
import { getHeadContent } from '../../services/git';
import { useEditorStore } from '../../store/editorStore';

type DiffLine = { type: 'add' | 'del' | 'ctx'; text: string; oldNo?: number; newNo?: number };

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText === '' ? [] : oldText.split('\n');
  const b = newText === '' ? [] : newText.split('\n');
  const m = a.length;
  const n = b.length;

  // LCS via DP — O(mn) but practical for typical code files
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0, j = 0, oldNo = 1, newNo = 1;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      result.push({ type: 'ctx', text: a[i], oldNo, newNo });
      i++; j++; oldNo++; newNo++;
    } else if (j < n && (i >= m || dp[i + 1][j] >= dp[i][j + 1])) {
      result.push({ type: 'add', text: b[j], newNo });
      j++; newNo++;
    } else {
      result.push({ type: 'del', text: a[i], oldNo });
      i++; oldNo++;
    }
  }
  return result;
}

// Show only hunks with context (±3 lines around changes)
function toHunks(lines: DiffLine[], ctx = 3): DiffLine[] {
  const changed = new Set<number>();
  lines.forEach((l, i) => { if (l.type !== 'ctx') changed.add(i); });

  const visible = new Set<number>();
  changed.forEach((idx) => {
    for (let k = Math.max(0, idx - ctx); k <= Math.min(lines.length - 1, idx + ctx); k++) {
      visible.add(k);
    }
  });

  const result: DiffLine[] = [];
  let prev = -1;
  [...visible].sort((a, b) => a - b).forEach((idx) => {
    if (prev !== -1 && idx > prev + 1) {
      result.push({ type: 'ctx', text: '⋯', oldNo: undefined, newNo: undefined });
    }
    result.push(lines[idx]);
    prev = idx;
  });
  return result;
}

type Props = { filePath: string; onClose: () => void };

export default function GitDiffView({ filePath, onClose }: Props) {
  const { currentWorkspace } = useEditorStore();
  const [lines, setLines] = useState<DiffLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileName = filePath.split('/').pop() ?? filePath;

  useEffect(() => {
    if (!currentWorkspace) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [headContent, workContent] = await Promise.all([
          getHeadContent(currentWorkspace, filePath),
          readFile(`${currentWorkspace}/${filePath}`).catch(() => ''),
        ]);
        const diff = computeDiff(headContent, workContent);
        setLines(toHunks(diff));
      } catch (e: any) {
        setError(e.message ?? 'Failed to compute diff');
      } finally {
        setLoading(false);
      }
    })();
  }, [filePath, currentWorkspace]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={16} color="#cccccc" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{fileName}</Text>
        <Text style={styles.subtitle}>HEAD vs Working</Text>
      </View>

      {loading && <ActivityIndicator color="#007acc" style={{ margin: 16 }} />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && lines.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No changes</Text>
        </View>
      )}

      {!loading && !error && lines.length > 0 && (
        <ScrollView style={styles.scroll} horizontal>
          <ScrollView nestedScrollEnabled>
            {lines.map((line, idx) => (
              <View
                key={idx}
                style={[
                  styles.line,
                  line.type === 'add' && styles.lineAdd,
                  line.type === 'del' && styles.lineDel,
                ]}
              >
                <Text style={styles.lineNo}>
                  {line.oldNo !== undefined ? String(line.oldNo).padStart(4) : '    '}
                </Text>
                <Text style={styles.lineNo}>
                  {line.newNo !== undefined ? String(line.newNo).padStart(4) : '    '}
                </Text>
                <Text style={styles.lineSig}>
                  {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                </Text>
                <Text
                  style={[
                    styles.lineText,
                    line.type === 'add' && styles.lineTextAdd,
                    line.type === 'del' && styles.lineTextDel,
                  ]}
                >
                  {line.text}
                </Text>
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 13, color: '#cccccc', fontFamily: 'Menlo' },
  subtitle: { fontSize: 11, color: '#858585' },
  scroll: { flex: 1 },
  line: {
    flexDirection: 'row',
    minHeight: 20,
    paddingVertical: 1,
  },
  lineAdd: { backgroundColor: 'rgba(0, 255, 0, 0.08)' },
  lineDel: { backgroundColor: 'rgba(255, 0, 0, 0.08)' },
  lineNo: {
    width: 36,
    fontSize: 11,
    fontFamily: 'Menlo',
    color: '#555555',
    textAlign: 'right',
    paddingRight: 4,
    lineHeight: 20,
  },
  lineSig: {
    width: 14,
    fontSize: 12,
    fontFamily: 'Menlo',
    color: '#858585',
    lineHeight: 20,
    textAlign: 'center',
  },
  lineText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Menlo',
    color: '#cccccc',
    lineHeight: 20,
    paddingLeft: 4,
  },
  lineTextAdd: { color: '#9fef9f' },
  lineTextDel: { color: '#ef9f9f' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: '#555555' },
  error: { padding: 12, fontSize: 13, color: '#f44747' },
});
