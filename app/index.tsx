import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import SidebarPanel from '../src/components/Sidebar/SidebarPanel';
import TerminalView from '../src/components/Terminal/TerminalView';
import EditorScreen from '../src/screens/EditorScreen';
import { readDirectory } from '../src/services/fileSystem';
import { useEditorStore } from '../src/store/editorStore';

const SIDEBAR_WIDTH = 300;
const TERMINAL_HEIGHT = 220;

export default function MainLayout() {
  const { sidebarVisible, toggleSidebar, setWorkspace, setFileTree, currentWorkspace } =
    useEditorStore();
  const [terminalVisible, setTerminalVisible] = useState(false);

  const openFolder = async () => {
    Alert.prompt('Open Workspace', 'Enter workspace name (will be created if needed):', async (name) => {
      if (!name?.trim()) return;
      const { createWorkspace } = await import('../src/services/fileSystem');
      const path = await createWorkspace(name.trim());
      const tree = await readDirectory(path);
      setWorkspace(path);
      setFileTree(tree);
    });
  };

  useEffect(() => {
    if (currentWorkspace) {
      readDirectory(currentWorkspace).then(setFileTree);
    }
  }, [currentWorkspace]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TitleBar
        onToggleSidebar={toggleSidebar}
        onOpenFolder={openFolder}
        onToggleTerminal={() => setTerminalVisible((v) => !v)}
        terminalVisible={terminalVisible}
      />

      <View style={styles.body}>
        {sidebarVisible && (
          <View style={styles.sidebar}>
            <SidebarPanel />
          </View>
        )}
        <View style={styles.mainArea}>
          <EditorScreen />
          {terminalVisible && (
            <View style={styles.terminal}>
              <TerminalView />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function TitleBar({
  onToggleSidebar,
  onOpenFolder,
  onToggleTerminal,
  terminalVisible,
}: {
  onToggleSidebar: () => void;
  onOpenFolder: () => void;
  onToggleTerminal: () => void;
  terminalVisible: boolean;
}) {
  const { currentWorkspace } = useEditorStore();
  const workspaceName = currentWorkspace?.split('/').pop() ?? 'No Folder';

  return (
    <View style={styles.titleBar}>
      <TouchableOpacity onPress={onToggleSidebar} style={styles.titleBtn}>
        <Ionicons name="menu" size={20} color="#cccccc" />
      </TouchableOpacity>

      <View style={styles.titleCenter}>
        <Ionicons name="code-slash" size={16} color="#007acc" />
        <Text style={styles.titleText}>{workspaceName}</Text>
      </View>

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
  },
  titleText: { fontSize: 14, color: '#cccccc', fontWeight: '500' },
  titleRight: { flexDirection: 'row', gap: 4 },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    borderRightColor: '#3c3c3c',
  },
  mainArea: { flex: 1 },
  terminal: {
    height: TERMINAL_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: '#3c3c3c',
  },
});
