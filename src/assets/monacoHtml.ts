// Monaco Editor HTML loaded as an inline string so it works on both iOS and Android.
// Loaded from CDN — requires network access.

export const MONACO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;">
  <title>Monaco Editor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1e1e1e; }
    #editor-container { width: 100%; height: 100%; }
    #diff-container { width: 100%; height: 100%; display: none; }
    .loading {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: #858585; font-family: -apple-system, sans-serif; font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="editor-container"><div class="loading">Loading editor…</div></div>
  <div id="diff-container"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
  <script>
    var editor = null;
    var diffEditor = null;
    var mode = 'edit'; // 'edit' | 'diff'
    var pendingInit = null;

    function rn(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }

    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

    require(['vs/editor/editor.main'], function () {
      monaco.editor.defineTheme('vscode-dark', {
        base: 'vs-dark', inherit: true, rules: [],
        colors: {
          'editor.background': '#1e1e1e',
          'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#c6c6c6',
          'editor.selectionBackground': '#264f78',
        }
      });
      monaco.editor.defineTheme('vscode-light', {
        base: 'vs', inherit: true, rules: [],
        colors: { 'editor.background': '#ffffff' }
      });

      editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: '',
        language: 'plaintext',
        theme: 'vscode-dark',
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'off',
        tabSize: 2,
        insertSpaces: true,
        renderWhitespace: 'selection',
        cursorBlinking: 'blink',
        smoothScrolling: true,
        contextmenu: true,
        mouseWheelZoom: true,
        formatOnPaste: true,
        formatOnType: false,
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: false },
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        padding: { top: 4 },
        overviewRulerLanes: 3,
        foldingStrategy: 'indentation',
        showFoldingControls: 'mouseover',
        renderLineHighlight: 'line',
      });

      // ⌘S / Ctrl+S → save
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
        rn({ type: 'save' });
      });
      // ⌘P → quick open
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, function () {
        rn({ type: 'quickOpen' });
      });
      // ⌘⇧P → command palette
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, function () {
        rn({ type: 'commandPalette' });
      });
      // ⌘B → toggle sidebar
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, function () {
        rn({ type: 'toggleSidebar' });
      });
      // ⌘\` → toggle terminal
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, function () {
        rn({ type: 'toggleTerminal' });
      });

      editor.onDidChangeModelContent(function () {
        rn({ type: 'change', value: editor.getValue() });
      });

      editor.onDidChangeCursorPosition(function (e) {
        rn({ type: 'cursor', line: e.position.lineNumber, column: e.position.column });
      });

      if (pendingInit) {
        applyInit(pendingInit);
        pendingInit = null;
      }
      rn({ type: 'ready' });
    });

    function applyInit(msg) {
      if (msg.value !== undefined) editor.setValue(msg.value);
      if (msg.language) monaco.editor.setModelLanguage(editor.getModel(), msg.language);
      if (msg.theme) monaco.editor.setTheme(toMonacoTheme(msg.theme));
      if (msg.fontSize) editor.updateOptions({ fontSize: msg.fontSize });
    }

    function toMonacoTheme(t) {
      if (t === 'vs-light') return 'vscode-light';
      if (t === 'hc-black') return 'hc-black';
      return 'vscode-dark';
    }

    function showDiff(original, modified, language) {
      document.getElementById('editor-container').style.display = 'none';
      document.getElementById('diff-container').style.display = 'block';
      mode = 'diff';

      if (diffEditor) diffEditor.dispose();
      diffEditor = monaco.editor.createDiffEditor(document.getElementById('diff-container'), {
        theme: 'vscode-dark',
        fontSize: 13,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        readOnly: true,
        automaticLayout: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
      });
      diffEditor.setModel({
        original: monaco.editor.createModel(original, language || 'plaintext'),
        modified: monaco.editor.createModel(modified, language || 'plaintext'),
      });
    }

    function hideDiff() {
      document.getElementById('editor-container').style.display = 'block';
      document.getElementById('diff-container').style.display = 'none';
      mode = 'edit';
      if (diffEditor) { diffEditor.dispose(); diffEditor = null; }
    }

    function handleMessage(msg) {
      if (!editor && msg.type !== 'init') {
        pendingInit = msg;
        return;
      }
      switch (msg.type) {
        case 'init':
          if (!editor) { pendingInit = msg; return; }
          applyInit(msg);
          break;
        case 'setValue':
          if (editor && editor.getValue() !== msg.value) editor.setValue(msg.value);
          break;
        case 'setLanguage':
          if (editor) monaco.editor.setModelLanguage(editor.getModel(), msg.language);
          break;
        case 'setTheme':
          monaco.editor.setTheme(toMonacoTheme(msg.theme));
          break;
        case 'setFontSize':
          if (editor) editor.updateOptions({ fontSize: msg.size });
          break;
        case 'format':
          if (editor) editor.getAction('editor.action.formatDocument').run();
          break;
        case 'find':
          if (editor) editor.getAction('actions.find').run();
          break;
        case 'undo':
          if (editor) editor.trigger('keyboard', 'undo', null);
          break;
        case 'redo':
          if (editor) editor.trigger('keyboard', 'redo', null);
          break;
        case 'focus':
          if (editor) editor.focus();
          break;
        case 'showDiff':
          showDiff(msg.original, msg.modified, msg.language);
          break;
        case 'hideDiff':
          hideDiff();
          break;
        case 'revealLine':
          if (editor) editor.revealLineInCenter(msg.line);
          break;
      }
    }

    window.addEventListener('message', function (e) {
      try { handleMessage(JSON.parse(e.data)); } catch (_) {}
    });
    document.addEventListener('message', function (e) {
      try { handleMessage(JSON.parse(e.data)); } catch (_) {}
    });
  </script>
</body>
</html>`;
