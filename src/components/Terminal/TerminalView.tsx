import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Line = { text: string; type: 'input' | 'output' | 'error' };

const BUILT_INS: Record<string, (args: string[], cwd: string) => string> = {
  help: () =>
    'Available: help, clear, echo, pwd, date, node (limited)\nFor full terminal, connect via SSH.',
  echo: (args) => args.join(' '),
  pwd: (_, cwd) => cwd,
  date: () => new Date().toString(),
  clear: () => '__CLEAR__',
};

export default function TerminalView() {
  const [lines, setLines] = useState<Line[]>([
    { text: 'iPad VSCode Terminal v1.0', type: 'output' },
    { text: 'Type "help" for available commands', type: 'output' },
    { text: '', type: 'output' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [cwd] = useState('/workspace');
  const scrollRef = useRef<ScrollView>(null);

  const append = useCallback((text: string, type: Line['type']) => {
    setLines((l) => [...l, { text, type }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const runCommand = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      append(`$ ${trimmed}`, 'input');
      setHistory((h) => [trimmed, ...h.slice(0, 49)]);
      setHistoryIdx(-1);

      const [cmd, ...args] = trimmed.split(/\s+/);
      const fn = BUILT_INS[cmd.toLowerCase()];
      if (fn) {
        const result = fn(args, cwd);
        if (result === '__CLEAR__') {
          setLines([]);
        } else if (result) {
          append(result, 'output');
        }
      } else {
        append(`${cmd}: command not found`, 'error');
        append('Tip: SSH into a server for full shell access', 'output');
      }
    },
    [append, cwd]
  );

  const handleSubmit = useCallback(() => {
    runCommand(input);
    setInput('');
  }, [input, runCommand]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Ionicons name="terminal" size={14} color="#cccccc" />
        <Text style={styles.headerTitle}>TERMINAL</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.output}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {lines.map((line, i) => (
          <Text
            key={i}
            style={[
              styles.line,
              line.type === 'input' && styles.lineInput,
              line.type === 'error' && styles.lineError,
            ]}
            selectable
          >
            {line.text}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <Text style={styles.prompt}>{cwd} $</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          placeholderTextColor="#555555"
          placeholder="Enter command..."
        />
        <TouchableOpacity onPress={handleSubmit} style={styles.runBtn}>
          <Ionicons name="return-down-back" size={16} color="#007acc" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
  },
  headerTitle: { fontSize: 11, color: '#858585', fontWeight: '600', letterSpacing: 1 },
  output: { flex: 1, padding: 8 },
  line: {
    fontFamily: 'Menlo',
    fontSize: 13,
    color: '#cccccc',
    lineHeight: 20,
  },
  lineInput: { color: '#569cd6' },
  lineError: { color: '#f44747' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252526',
    borderTopWidth: 1,
    borderTopColor: '#3c3c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  prompt: { fontFamily: 'Menlo', fontSize: 12, color: '#4ec9b0', marginRight: 8 },
  input: {
    flex: 1,
    fontFamily: 'Menlo',
    fontSize: 13,
    color: '#cccccc',
    height: 36,
  },
  runBtn: { padding: 8 },
});
