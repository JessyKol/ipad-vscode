import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SidebarPanel from '../src/components/Sidebar/SidebarPanel';
import TerminalView from '../src/components/Terminal/TerminalView';
import EditorScreen from '../src/screens/EditorScreen';
import { getLanguageFromPath, listWorkspaces, readDirectory } from '../src/services/fileSystem';
import { useEditorStore } from '../src/store/editorStore';

const SIDEBAR_WIDTH = 300;
const TERMINAL_HEIGHT = 240;

export default function MainLayout() {
  const {
    sidebarVisible,
    toggleSidebar,
    setWorkspace,
    setFileTree,
    currentWorkspace,
    tabs,
    openTab,
  } = useEditorStore();
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [allFiles, setAllFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [qoQuery, setQoQuery] = useState('');

  const openFolder = async () => {
    const workspaces = await listWorkspaces().catch(() => [] as string[]);
    if (workspaces.length > 0) {
      Alert.alert(
        'Open Workspace',
        'Choose an existing workspace or create a new one:',
        [
          ...workspaces.map((w) => ({
            text: w,
            onPress: async () => {
              const { createWorkspace } = await import('../src/services/fileSystem');
              const path = await createWorkspace(w);
              const tree = await readDirectory(path);
              setWorkspace(path);
              setFileTree(tree);
            },
          })),
          {
            text: 'New…',
            onPress: () =>
              Alert.prompt('New Workspace', 'Enter workspace name:', async (name) => {
                if (!name?.trim()) return;
                const { createWorkspace } = await import('../src/services/fileSystem');
                const path = await createWorkspace(name.trim());
                setWorkspace(path);
                setFileTree([]);
              }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.prompt('Open Workspace', 'Enter workspace name (will be created if needed):', async (name) => {
        if (!name?.trim()) return;
        const { createWorkspace } = await import('../src/services/fileSystem');
        const path = await createWorkspace(name.trim());
        const tree = await readDirectory(path);
        setWorkspace(path);
        setFileTree(tree);
      });
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      readDirectory(currentWorkspace).then(setFileTree);
    }
  }, [currentWorkspace]);

  // Flatten file tree for Quick Open
  const flattenTree = useCallback(async (dirPath: string) => {
    const files: Array<{ name: string; path: string }> = [];
    async function walk(path: string) {
      try {
        const items = await readDirectory(path);
        for (const item of items) {
          if (item.type === 'file') {
            files.push({ name: item.name, path: item.path });
          } else if (item.type === 'directory' && !item.name.startsWith('.')) {
            await walk(item.path);
          }
        }
      } catch {}
    }
    await walk(dirPath);
    return files;
  }, []);

  const openQuickOpen = useCallback(async () => {
    if (!currentWorkspace) return;
    const files = await flattenTree(currentWorkspace);
    setAllFiles(files);
    setQoQuery('');
    setQuickOpenVisible(true);
  }, [currentWorkspace, flattenTree]);

  const openFileFromQO = useCallback(
    async (file: { name: string; path: string }) => {
      setQuickOpenVisible(false);
      try {
        const { readFile } = await import('../src/services/fileSystem');
        const content = await readFile(file.path);
        openTab({
          path: file.path,
          name: file.name,
          content,
          isDirty: false,
          language: getLanguageFromPath(file.path),
        });
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    },
    [openTab]
  );

  const filteredFiles = qoQuery
    ? allFiles.filter((f) => f.name.toLowerCase().includes(qoQuery.toLowerCase()))
    : allFiles;

  return (
    <SafeAreaView style={styles.safeArea}>
      <TitleBar
        onToggleSidebar={toggleSidebar}
        onOpenFolder={openFolder}
        onToggleTerminal={() => setTerminalVisible((v) => !v)}
        terminalVisible={terminalVisible}
        onQuickOpen={openQuickOpen}
      />

      <View style={styles.body}>
        {sidebarVisible && (
          <View style={styles.sidebar}>
            <SidebarPanel />
          </View>
        )}
        <View style={styles.mainArea}>
          <EditorScreen
            onQuickOpen={openQuickOpen}
            onCommandPalette={() => Alert.alert('Command Palette', 'Coming soon')}
            onToggleSidebar={toggleSidebar}
            onToggleTerminal={() => setTerminalVisible((v) => !v)}
          />
          {terminalVisible && (
            <View style={styles.terminal}>
              <TerminalView />
            </View>
          )}
        </View>
      </View>

      {/* Quick Open Modal */}
      <Modal
        visible={quickOpenVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickOpenVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setQuickOpenVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.quickOpenBox}>
            <View style={styles.qoSearch}>
              <Ionicons name="search" size={16} color="#858585" />
              <TextInput
                style={styles.qoInput}
                placeholder="Search files…"
                placeholderTextColor="#555555"
                value={qoQuery}
                onChangeText={setQoQuery}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!!qoQuery && (
                <TouchableOpacity onPress={() => setQoQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#555555" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.qoList} keyboardShouldPersistTaps="handled">
              {filteredFiles.slice(0, 50).map((f) => (
                <TouchableOpacity
                  key={f.path}
                  style={styles.qoItem}
                  onPress={() => openFileFromQO(f)}
                >
                  <Ionicons name="document-outline" size={14} color="#858585" />
                  <View style={styles.qoItemText}>
                    <Text style={styles.qoName}>{f.name}</Text>
                    <Text style={styles.qoPath} numberOfLines={1}>
                      {f.path.replace(currentWorkspace ?? '', '')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {filteredFiles.length === 0 && (
                <Text style={styles.qoEmpty}>No files found</Text>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function TitleBar({
  onToggleSidebar,
  onOpenFolder,
  onToggleTerminal,
  terminalVisible,
  onQuickOpen,
}: {
  onToggleSidebar: () => void;
  onOpenFolder: () => void;
  onToggleTerminal: () => void;
  terminalVisible: boolean;
  onQuickOpen: () => void;
}) {
  const { currentWorkspace } = useEditorStore();
  const workspaceName = currentWorkspace?.split('/').pop() ?? 'No Folder';

  return (
    <View style={styles.titleBar}>
      <TouchableOpacity onPress={onToggleSidebar} style={styles.titleBtn}>
        <Ionicons name="menu" size={20} color="#cccccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.titleCenter} onPress={onQuickOpen} activeOpacity={0.8}>
        <Ionicons name="code-slash" size={16} color="#007acc" />
        <Text style={styles.titleText}>{workspaceName}</Text>
        <Ionicons name="search" size={14} color="#555555" />
      </TouchableOpacity>

      <View style={styles.titleRight}>
        <TouchableOpacity onPress={onOpenFolder} style={styles.titleBtn}>
          <Ionicons name="folder-open" size={20} color="#cccccc" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onToggleTerminal}
          style={[styles.titleBtn, terminalVisible && styles.titleBtnActive]}
        >
          <Ionicons name="terminal" size={20} color={terminalVisible ? '#007acc' : '#cccccc'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1e1e1e' },
  titleBar: {
    height: 44,
    backgroundColor: '#323233',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#252526',
    paddingHorizontal: 8,
  },
  titleBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  titleBtnActive: { backgroundColor: 'rgba(0, 122, 204, 0.2)' },
  titleCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3c3c3c',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 8,
  },
  titleText: { flex: 1, fontSize: 13, color: '#cccccc', fontWeight: '500', textAlign: 'center' },
  titleRight: { flexDirection: 'row', gap: 4 },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: { width: SIDEBAR_WIDTH, borderRightWidth: 1, borderRightColor: '#3c3c3c' },
  mainArea: { flex: 1 },
  terminal: { height: TERMINAL_HEIGHT, borderTopWidth: 1, borderTopColor: '#3c3c3c' },

  // Quick Open Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: 80,
  },
  quickOpenBox: {
    width: '70%',
    maxWidth: 600,
    backgroundColor: '#252526',
    borderRadius: 8,
    overflow: 'hidden',
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#3c3c3c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  qoSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
  },
  qoInput: {
    flex: 1,
    fontSize: 15,
    color: '#cccccc',
    fontFamily: 'Menlo',
    height: 30,
  },
  qoList: { maxHeight: 340 },
  qoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  qoItemText: { flex: 1 },
  qoName: { fontSize: 13, color: '#cccccc' },
  qoPath: { fontSize: 11, color: '#555555', fontFamily: 'Menlo', marginTop: 2 },
  qoEmpty: { padding: 16, fontSize: 13, color: '#555555', textAlign: 'center' },
});
