import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import EditorTabs from '../components/Editor/EditorTabs';
import MonacoEditor from '../components/Editor/MonacoEditor';
import StatusBar from '../components/StatusBar';
import { writeFile } from '../services/fileSystem';
import { useEditorStore } from '../store/editorStore';

type Props = {
  onQuickOpen?: () => void;
  onCommandPalette?: () => void;
  onToggleSidebar?: () => void;
  onToggleTerminal?: () => void;
};

export default function EditorScreen({
  onQuickOpen,
  onCommandPalette,
  onToggleSidebar,
  onToggleTerminal,
}: Props) {
  const { tabs, activeTabId, updateTabContent, saveTab, setSidebarPanel } = useEditorStore();
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleContentChange = useCallback(
    (content: string) => {
      if (activeTabId) updateTabContent(activeTabId, content);
    },
    [activeTabId, updateTabContent]
  );

  const handleCursorChange = useCallback((line: number, column: number) => {
    setCursor({ line, column });
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    try {
      await writeFile(activeTab.path, activeTab.content);
      saveTab(activeTab.id);
    } catch (e) {
      console.error('Save failed', e);
    }
  }, [activeTab, saveTab]);

  return (
    <View style={styles.container}>
      <EditorTabs onSave={handleSave} />
      {activeTab ? (
        <MonacoEditor
          key={activeTab.id}
          tabId={activeTab.id}
          content={activeTab.content}
          language={activeTab.language}
          onContentChange={handleContentChange}
          onCursorChange={handleCursorChange}
          onSave={handleSave}
          onQuickOpen={onQuickOpen}
          onCommandPalette={onCommandPalette}
          onToggleSidebar={onToggleSidebar}
          onToggleTerminal={onToggleTerminal}
        />
      ) : (
        <WelcomeScreen />
      )}
      <StatusBar line={cursor.line} column={cursor.column} />
    </View>
  );
}

function WelcomeScreen() {
  return (
    <View style={styles.welcome}>
      <Text style={styles.welcomeTitle}>iPad VSCode</Text>
      <Text style={styles.welcomeSubtitle}>Open a file from the explorer to start editing</Text>
      <View style={styles.shortcuts}>
        <ShortcutItem keys="⌘S" description="Save file" />
        <ShortcutItem keys="⌘P" description="Quick open file" />
        <ShortcutItem keys="⌘⇧P" description="Command palette" />
        <ShortcutItem keys="⌘B" description="Toggle sidebar" />
        <ShortcutItem keys="⌘`" description="Toggle terminal" />
        <ShortcutItem keys="⌘F" description="Find in file" />
        <ShortcutItem keys="⌘⇧F" description="Format document" />
      </View>
    </View>
  );
}

function ShortcutItem({ keys, description }: { keys: string; description: string }) {
  return (
    <View style={styles.shortcut}>
      <Text style={styles.shortcutKey}>{keys}</Text>
      <Text style={styles.shortcutDesc}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  welcomeTitle: { fontSize: 32, color: '#3c3c3c', fontWeight: '300' },
  welcomeSubtitle: { fontSize: 14, color: '#555555' },
  shortcuts: { marginTop: 16, gap: 8, width: 300 },
  shortcut: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d2d',
  },
  shortcutKey: { fontSize: 13, color: '#007acc', fontFamily: 'Menlo', width: 80 },
  shortcutDesc: { fontSize: 13, color: '#858585', flex: 1, textAlign: 'right' },
});
