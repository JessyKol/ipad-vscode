import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { readFile } from '../../services/fileSystem';
import { useEditorStore } from '../../store/editorStore';
import type { FileNode, SearchResult } from '../../types';

async function searchInTree(
  nodes: FileNode[],
  query: string,
  caseSensitive: boolean,
  results: SearchResult[],
  maxResults = 200
): Promise<void> {
  for (const node of nodes) {
    if (results.length >= maxResults) return;
    if (node.type === 'file') {
      try {
        const content = await readFile(node.path);
        const lines = content.split('\n');
        const q = caseSensitive ? query : query.toLowerCase();
        for (let i = 0; i < lines.length; i++) {
          if (results.length >= maxResults) return;
          const lineText = lines[i];
          const searchIn = caseSensitive ? lineText : lineText.toLowerCase();
          const idx = searchIn.indexOf(q);
          if (idx !== -1) {
            results.push({
              file: node.name,
              filePath: node.path,
              line: i + 1,
              text: lineText.trim(),
              matchStart: idx,
              matchEnd: idx + query.length,
            });
          }
        }
      } catch {}
    } else if (node.children) {
      await searchInTree(node.children, query, caseSensitive, results, maxResults);
    }
  }
}

export default function SearchPanel() {
  const { fileTree, openTab } = useEditorStore();
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef(false);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim() || fileTree.length === 0) return;
    abortRef.current = true;
    await new Promise((r) => setTimeout(r, 0));
    abortRef.current = false;
    setLoading(true);
    setResults([]);
    setSearched(true);
    const found: SearchResult[] = [];
    try {
      await searchInTree(fileTree, q, caseSensitive, found);
      setResults(found);
    } finally {
      setLoading(false);
    }
  }, [fileTree, caseSensitive]);

  const openResult = useCallback(async (r: SearchResult) => {
    try {
      const content = await readFile(r.filePath);
      const { getLanguageFromPath } = await import('../../services/fileSystem');
      openTab({
        path: r.filePath,
        name: r.file,
        content,
        isDirty: false,
        language: getLanguageFromPath(r.filePath),
      });
    } catch {}
  }, [openTab]);

  // Group results by file
  const byFile = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.filePath] = acc[r.filePath] ?? []).push(r);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={14} color="#858585" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search in files…"
          placeholderTextColor="#555555"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => runSearch(query)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!query && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={16} color="#555555" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.options}>
        <TouchableOpacity
          style={[styles.optBtn, caseSensitive && styles.optBtnActive]}
          onPress={() => setCaseSensitive((c) => !c)}
        >
          <Text style={[styles.optText, caseSensitive && styles.optTextActive]}>Aa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchBtn} onPress={() => runSearch(query)}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#007acc" style={{ margin: 12 }} />}

      {searched && !loading && results.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No results for "{query}"</Text>
        </View>
      )}

      {results.length > 0 && (
        <Text style={styles.summary}>
          {results.length} result{results.length !== 1 ? 's' : ''} in {Object.keys(byFile).length} file{Object.keys(byFile).length !== 1 ? 's' : ''}
          {results.length >= 200 ? ' (capped)' : ''}
        </Text>
      )}

      <ScrollView style={styles.results}>
        {Object.entries(byFile).map(([path, fileResults]) => (
          <View key={path} style={styles.fileGroup}>
            <View style={styles.fileHeader}>
              <Ionicons name="document-text-outline" size={13} color="#858585" />
              <Text style={styles.fileName} numberOfLines={1}>
                {fileResults[0].file}
              </Text>
              <Text style={styles.fileCount}>{fileResults.length}</Text>
            </View>
            {fileResults.map((r) => (
              <TouchableOpacity
                key={`${r.line}-${r.matchStart}`}
                style={styles.resultRow}
                onPress={() => openResult(r)}
                activeOpacity={0.7}
              >
                <Text style={styles.lineNo}>{r.line}</Text>
                <Text style={styles.resultText} numberOfLines={1}>{r.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252526' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3c3c3c',
    borderRadius: 4,
    margin: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    height: 34,
    fontSize: 13,
    color: '#cccccc',
    fontFamily: 'Menlo',
  },
  options: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 6, gap: 6 },
  optBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    backgroundColor: '#3c3c3c',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optBtnActive: { borderColor: '#007acc' },
  optText: { fontSize: 12, color: '#858585', fontFamily: 'Menlo', fontWeight: '600' },
  optTextActive: { color: '#007acc' },
  searchBtn: {
    flex: 1, backgroundColor: '#0e639c', borderRadius: 4,
    paddingVertical: 6, alignItems: 'center',
  },
  searchBtnText: { fontSize: 13, color: '#ffffff', fontWeight: '600' },
  summary: { fontSize: 11, color: '#858585', paddingHorizontal: 12, paddingBottom: 6 },
  results: { flex: 1 },
  fileGroup: { marginBottom: 4 },
  fileHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 5,
    backgroundColor: '#2d2d2d', gap: 6,
  },
  fileName: { flex: 1, fontSize: 12, color: '#cccccc', fontWeight: '600' },
  fileCount: {
    fontSize: 11, color: '#007acc', backgroundColor: 'rgba(0,122,204,0.15)',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 16, paddingRight: 8, paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  lineNo: { width: 36, fontSize: 11, color: '#555555', fontFamily: 'Menlo', textAlign: 'right', marginRight: 8 },
  resultText: { flex: 1, fontSize: 12, color: '#cccccc', fontFamily: 'Menlo' },
  empty: { flex: 1, alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 13, color: '#555555' },
});
