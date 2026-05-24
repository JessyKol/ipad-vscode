import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { cloneRepo, initRepo } from '../../services/git';
import { createWorkspace } from '../../services/fileSystem';
import { useEditorStore } from '../../store/editorStore';
import type { Theme } from '../../types';

export default function SettingsPanel() {
  const {
    gitSettings, setGitSettings,
    theme, setTheme,
    fontSize, setFontSize,
    currentWorkspace,
  } = useEditorStore();

  const [cloneUrl, setCloneUrl] = useState('');
  const [cloning, setCloning] = useState(false);

  const themes: { id: Theme; label: string }[] = [
    { id: 'vs-dark', label: 'Dark (VS Code)' },
    { id: 'vs-light', label: 'Light' },
    { id: 'hc-black', label: 'High Contrast' },
  ];

  const handleClone = async () => {
    if (!cloneUrl.trim()) return;
    const name = cloneUrl.split('/').pop()?.replace('.git', '') ?? 'repo';
    setCloning(true);
    try {
      const path = await createWorkspace(name);
      await cloneRepo(cloneUrl.trim(), path, gitSettings.token || undefined);
      const { setWorkspace, setFileTree } = useEditorStore.getState();
      const { readDirectory } = await import('../../services/fileSystem');
      setWorkspace(path);
      setFileTree(await readDirectory(path));
      setCloneUrl('');
      Alert.alert('Cloned', `Repository cloned to ${name}`);
    } catch (e: any) {
      Alert.alert('Clone failed', e.message);
    } finally {
      setCloning(false);
    }
  };

  const handleInitRepo = async () => {
    if (!currentWorkspace) {
      Alert.alert('No workspace', 'Open a workspace first');
      return;
    }
    try {
      await initRepo(currentWorkspace);
      Alert.alert('Success', 'Initialized git repository');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Git Author */}
      <Section title="GIT AUTHOR">
        <Field label="Name">
          <TextInput
            style={styles.input}
            value={gitSettings.authorName}
            onChangeText={(v) => setGitSettings({ authorName: v })}
            placeholder="Your Name"
            placeholderTextColor="#555555"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </Field>
        <Field label="Email">
          <TextInput
            style={styles.input}
            value={gitSettings.authorEmail}
            onChangeText={(v) => setGitSettings({ authorEmail: v })}
            placeholder="you@example.com"
            placeholderTextColor="#555555"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
      </Section>

      {/* GitHub Token */}
      <Section title="GITHUB TOKEN">
        <Text style={styles.hint}>
          Personal access token for push/pull/clone. Stored in app memory only.
        </Text>
        <Field label="Token">
          <TextInput
            style={styles.input}
            value={gitSettings.token}
            onChangeText={(v) => setGitSettings({ token: v })}
            placeholder="ghp_…"
            placeholderTextColor="#555555"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
      </Section>

      {/* Clone Repo */}
      <Section title="CLONE REPOSITORY">
        <Field label="URL">
          <TextInput
            style={styles.input}
            value={cloneUrl}
            onChangeText={setCloneUrl}
            placeholder="https://github.com/user/repo.git"
            placeholderTextColor="#555555"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
        <TouchableOpacity
          style={[styles.btn, cloning && styles.btnDisabled]}
          onPress={handleClone}
          disabled={cloning || !cloneUrl.trim()}
        >
          <Ionicons name="cloud-download-outline" size={14} color="#ffffff" />
          <Text style={styles.btnText}>{cloning ? 'Cloning…' : 'Clone'}</Text>
        </TouchableOpacity>
      </Section>

      {/* Init repo */}
      <Section title="WORKSPACE GIT">
        <TouchableOpacity style={styles.btn} onPress={handleInitRepo}>
          <Ionicons name="git-branch-outline" size={14} color="#ffffff" />
          <Text style={styles.btnText}>Init Repository in Current Workspace</Text>
        </TouchableOpacity>
      </Section>

      {/* Theme */}
      <Section title="EDITOR THEME">
        {themes.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.themeOption, theme === t.id && styles.themeOptionActive]}
            onPress={() => setTheme(t.id)}
          >
            <Text style={[styles.themeText, theme === t.id && styles.themeTextActive]}>
              {t.label}
            </Text>
            {theme === t.id && <Ionicons name="checkmark" size={14} color="#007acc" />}
          </TouchableOpacity>
        ))}
      </Section>

      {/* Font Size */}
      <Section title="FONT SIZE">
        <View style={styles.fontSizeRow}>
          <TouchableOpacity
            style={styles.fontBtn}
            onPress={() => setFontSize(Math.max(10, fontSize - 1))}
          >
            <Ionicons name="remove" size={18} color="#cccccc" />
          </TouchableOpacity>
          <Text style={styles.fontValue}>{fontSize}px</Text>
          <TouchableOpacity
            style={styles.fontBtn}
            onPress={() => setFontSize(Math.min(24, fontSize + 1))}
          >
            <Ionicons name="add" size={18} color="#cccccc" />
          </TouchableOpacity>
        </View>
      </Section>

      {/* iPad execution note */}
      <Section title="LOCAL EXECUTION">
        <Text style={styles.hint}>
          iOS sandboxing prevents running arbitrary processes. The terminal provides built-in commands and git operations via isomorphic-git. For full shell access, SSH into a remote server (add SSH support via Settings → SSH).
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252526' },
  content: { padding: 12, gap: 16, paddingBottom: 40 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 10, color: '#858585', fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  sectionBody: {
    backgroundColor: '#2d2d2d', borderRadius: 6,
    overflow: 'hidden', gap: 1,
  },
  field: { padding: 10, gap: 4 },
  fieldLabel: { fontSize: 11, color: '#858585' },
  input: {
    backgroundColor: '#3c3c3c', borderRadius: 4, paddingHorizontal: 10,
    paddingVertical: 8, fontSize: 13, color: '#cccccc', fontFamily: 'Menlo',
  },
  hint: { fontSize: 11, color: '#858585', lineHeight: 16, paddingHorizontal: 10, paddingVertical: 8 },
  btn: {
    flexDirection: 'row', backgroundColor: '#0e639c', borderRadius: 4,
    margin: 10, marginTop: 4, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 13, color: '#ffffff', fontWeight: '600' },
  themeOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#252526',
  },
  themeOptionActive: { backgroundColor: 'rgba(0,122,204,0.1)' },
  themeText: { fontSize: 13, color: '#cccccc' },
  themeTextActive: { color: '#007acc', fontWeight: '600' },
  fontSizeRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 16 },
  fontBtn: {
    width: 36, height: 36, backgroundColor: '#3c3c3c',
    borderRadius: 4, alignItems: 'center', justifyContent: 'center',
  },
  fontValue: { fontSize: 16, color: '#cccccc', width: 50, textAlign: 'center' },
});
