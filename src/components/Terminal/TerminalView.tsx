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
import { getLanguageFromPath, readDirectory, readFile, writeFile } from '../../services/fileSystem';
import {
  commit,
  createBranch,
  getCurrentBranch,
  getLog,
  getStatus,
  listBranches,
  pull,
  push,
  stageAll,
  stageFile,
} from '../../services/git';
import { useEditorStore } from '../../store/editorStore';

type Line = { text: string; type: 'input' | 'output' | 'error' | 'info' };

export default function TerminalView() {
  const { currentWorkspace, setGitStatus, setActiveBranch, gitSettings, openTab } = useEditorStore();
  const [lines, setLines] = useState<Line[]>([
    { text: 'iPad VSCode Terminal — type "help" for commands', type: 'info' },
    { text: '', type: 'output' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const cwd = currentWorkspace ?? '/workspace';

  const append = useCallback((text: string, type: Line['type'] = 'output') => {
    setLines((l) => [...l, { text, type }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 30);
  }, []);

  const appendLines = useCallback(
    (texts: string[], type: Line['type'] = 'output') => {
      setLines((l) => [...l, ...texts.map((text) => ({ text, type }))]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 30);
    },
    []
  );

  const runCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      append(`$ ${trimmed}`, 'input');
      setHistory((h) => [trimmed, ...h.slice(0, 99)]);
      setHistoryIdx(-1);

      const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
      const cmd = parts[0]?.toLowerCase() ?? '';
      const args = parts.slice(1).map((a) => a.replace(/^["']|["']$/g, ''));

      setLoading(true);
      try {
        await dispatch(cmd, args);
      } catch (e: any) {
        append(e.message ?? String(e), 'error');
      } finally {
        setLoading(false);
      }
    },
    [currentWorkspace, gitSettings, append, appendLines] // eslint-disable-line react-hooks/exhaustive-deps
  );

  async function dispatch(cmd: string, args: string[]) {
    const dir = currentWorkspace;

    switch (cmd) {
      case 'help':
        appendLines([
          'Built-in commands:',
          '  help                    Show this help',
          '  clear                   Clear terminal',
          '  pwd                     Print working directory',
          '  echo [text]             Print text',
          '  date                    Current date/time',
          '  ls [path]               List files',
          '  cat [file]              Show file contents',
          '  open [file]             Open file in editor',
          '',
          'Git commands (require open workspace):',
          '  git status              Show working tree status',
          '  git log [--n=20]        Show commit log',
          '  git branch              List branches',
          '  git checkout [branch]   Switch branch',
          '  git add .               Stage all changes',
          '  git add [file]          Stage specific file',
          '  git commit -m [msg]     Commit staged changes',
          '  git push                Push to remote',
          '  git pull                Pull from remote',
          '',
          'Note: iOS sandboxing prevents running native processes.',
          'For full shell, SSH into a server.',
        ]);
        break;

      case 'clear':
        setLines([]);
        break;

      case 'pwd':
        append(cwd);
        break;

      case 'echo':
        append(args.join(' '));
        break;

      case 'date':
        append(new Date().toString());
        break;

      case 'ls': {
        const target = args[0] ? `${cwd}/${args[0]}` : cwd;
        try {
          const items = await readDirectory(target);
          const names = items.map((f) => (f.type === 'directory' ? `${f.name}/` : f.name));
          appendLines(names.length > 0 ? names : ['(empty)']);
        } catch {
          append(`ls: ${args[0] ?? ''}: No such directory`, 'error');
        }
        break;
      }

      case 'cat': {
        if (!args[0]) { append('Usage: cat <file>', 'error'); break; }
        const path = args[0].startsWith('/') ? args[0] : `${cwd}/${args[0]}`;
        try {
          const content = await readFile(path);
          appendLines(content.split('\n').slice(0, 100));
          if (content.split('\n').length > 100) append('… (truncated at 100 lines)');
        } catch {
          append(`cat: ${args[0]}: No such file`, 'error');
        }
        break;
      }

      case 'open': {
        if (!args[0]) { append('Usage: open <file>', 'error'); break; }
        const path = args[0].startsWith('/') ? args[0] : `${cwd}/${args[0]}`;
        try {
          const content = await readFile(path);
          const name = path.split('/').pop() ?? args[0];
          openTab({ path, name, content, isDirty: false, language: getLanguageFromPath(path) });
          append(`Opened ${name}`);
        } catch {
          append(`open: ${args[0]}: Not found`, 'error');
        }
        break;
      }

      case 'git': {
        if (!dir) { append('No workspace open', 'error'); break; }
        const sub = args[0];

        if (sub === 'status') {
          const s = await getStatus(dir);
          setGitStatus(s);
          const br = await getCurrentBranch(dir);
          setActiveBranch(br ?? 'HEAD');
          appendLines([
            `On branch ${br ?? 'HEAD'}`,
            ...(s.staged.length > 0 ? ['', 'Changes to be committed:',
              ...s.staged.map((f) => `  new file: ${f}`)] : []),
            ...(s.unstaged.length > 0 ? ['', 'Changes not staged:',
              ...s.unstaged.map((f) => `  modified: ${f}`)] : []),
            ...(s.untracked.length > 0 ? ['', 'Untracked files:',
              ...s.untracked.map((f) => `  ${f}`)] : []),
            ...(s.staged.length + s.unstaged.length + s.untracked.length === 0
              ? ['nothing to commit, working tree clean'] : []),
          ]);
          break;
        }

        if (sub === 'log') {
          const n = parseInt(args.find((a) => a.startsWith('--n='))?.replace('--n=', '') ?? '10');
          const commits = await getLog(dir, n);
          if (commits.length === 0) { append('No commits yet'); break; }
          appendLines(
            commits.flatMap((c) => [
              `\x1b[33mcommit ${c.oid.slice(0, 7)}\x1b[0m`,
              `Author: ${c.author}`,
              `Date:   ${new Date(c.timestamp * 1000).toLocaleString()}`,
              `\n    ${c.message}\n`,
            ])
          );
          break;
        }

        if (sub === 'branch') {
          const bs = await listBranches(dir);
          const current = await getCurrentBranch(dir);
          appendLines(bs.map((b) => (b === current ? `* ${b}` : `  ${b}`)));
          break;
        }

        if (sub === 'checkout') {
          const { checkoutBranch } = await import('../../services/git');
          const target = args[1];
          if (!target) { append('Usage: git checkout <branch>', 'error'); break; }
          await checkoutBranch(dir, target);
          const br = await getCurrentBranch(dir);
          setActiveBranch(br ?? target);
          append(`Switched to branch '${target}'`);
          break;
        }

        if (sub === 'add') {
          const target = args[1] ?? '.';
          if (target === '.') {
            await stageAll(dir);
            append('Staged all changes');
          } else {
            await stageFile(dir, target);
            append(`Staged ${target}`);
          }
          const s = await getStatus(dir);
          setGitStatus(s);
          break;
        }

        if (sub === 'commit') {
          const mIdx = args.indexOf('-m');
          const msg = mIdx !== -1 ? args.slice(mIdx + 1).join(' ') : '';
          if (!msg) { append('Usage: git commit -m "message"', 'error'); break; }
          if (!gitSettings.authorName) {
            append('Set git author in Settings first', 'error'); break;
          }
          const oid = await commit(dir, msg, {
            name: gitSettings.authorName,
            email: gitSettings.authorEmail,
          });
          append(`[${oid.slice(0, 7)}] ${msg}`);
          const s = await getStatus(dir);
          setGitStatus(s);
          break;
        }

        if (sub === 'push') {
          if (!gitSettings.token) { append('Set GitHub token in Settings first', 'error'); break; }
          append('Pushing…', 'info');
          await push(dir, gitSettings.token);
          append('Push successful');
          break;
        }

        if (sub === 'pull') {
          if (!gitSettings.authorName) {
            append('Set git author in Settings first', 'error'); break;
          }
          append('Pulling…', 'info');
          await pull(dir, { name: gitSettings.authorName, email: gitSettings.authorEmail },
            gitSettings.token || undefined);
          const s = await getStatus(dir);
          setGitStatus(s);
          append('Pull complete');
          break;
        }

        append(`git: '${sub}' is not a supported command`, 'error');
        append('Type "help" to see available git commands');
        break;
      }

      default:
        append(`${cmd}: command not found (type "help" for available commands)`, 'error');
    }
  }

  const handleSubmit = useCallback(() => {
    const raw = input;
    setInput('');
    runCommand(raw);
  }, [input, runCommand]);

  const handleKeyPress = useCallback(({ nativeEvent }: any) => {
    if (nativeEvent.key === 'ArrowUp') {
      setHistoryIdx((i) => {
        const next = Math.min(i + 1, history.length - 1);
        setInput(history[next] ?? '');
        return next;
      });
    } else if (nativeEvent.key === 'ArrowDown') {
      setHistoryIdx((i) => {
        const next = Math.max(i - 1, -1);
        setInput(next === -1 ? '' : history[next] ?? '');
        return next;
      });
    }
  }, [history]);

  const prompt = `${cwd.split('/').pop() ?? cwd} $`;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Ionicons name="terminal" size={14} color="#cccccc" />
        <Text style={styles.headerTitle}>TERMINAL</Text>
        <TouchableOpacity onPress={() => setLines([])} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={14} color="#858585" />
        </TouchableOpacity>
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
              line.type === 'info' && styles.lineInfo,
            ]}
            selectable
          >
            {line.text}
          </Text>
        ))}
        {loading && <Text style={styles.lineInfo}>…</Text>}
      </ScrollView>

      <View style={styles.inputRow}>
        <Text style={styles.prompt}>{prompt}</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
          onKeyPress={handleKeyPress}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          placeholderTextColor="#555555"
          placeholder="Enter command…"
          editable={!loading}
        />
        <TouchableOpacity onPress={handleSubmit} style={styles.runBtn} disabled={loading}>
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
  headerTitle: { flex: 1, fontSize: 11, color: '#858585', fontWeight: '600', letterSpacing: 1 },
  clearBtn: { padding: 2 },
  output: { flex: 1, padding: 8 },
  line: { fontFamily: 'Menlo', fontSize: 12, color: '#cccccc', lineHeight: 18 },
  lineInput: { color: '#569cd6' },
  lineError: { color: '#f44747' },
  lineInfo: { color: '#4ec9b0' },
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
