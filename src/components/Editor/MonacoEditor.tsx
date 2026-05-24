import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { MONACO_HTML } from '../../assets/monacoHtml';
import { useEditorStore } from '../../store/editorStore';

type Props = {
  tabId: string;
  content: string;
  language: string;
  onContentChange: (content: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  onSave?: () => void;
  onQuickOpen?: () => void;
  onCommandPalette?: () => void;
  onToggleSidebar?: () => void;
  onToggleTerminal?: () => void;
};

export default function MonacoEditor({
  tabId,
  content,
  language,
  onContentChange,
  onCursorChange,
  onSave,
  onQuickOpen,
  onCommandPalette,
  onToggleSidebar,
  onToggleTerminal,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);
  const pendingInit = useRef<{ value: string; language: string } | null>(null);
  const { theme, fontSize } = useEditorStore();

  const postMessage = useCallback((msg: object) => {
    webViewRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  // When tab changes, re-initialise editor content
  useEffect(() => {
    if (isReady.current) {
      postMessage({ type: 'init', value: content, language, theme, fontSize });
    } else {
      pendingInit.current = { value: content, language };
    }
  }, [tabId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isReady.current) postMessage({ type: 'setTheme', theme });
  }, [theme]);

  useEffect(() => {
    if (isReady.current) postMessage({ type: 'setFontSize', size: fontSize });
  }, [fontSize]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        switch (msg.type) {
          case 'ready':
            isReady.current = true;
            postMessage({
              type: 'init',
              value: pendingInit.current?.value ?? content,
              language: pendingInit.current?.language ?? language,
              theme,
              fontSize,
            });
            pendingInit.current = null;
            break;
          case 'change':
            onContentChange(msg.value);
            break;
          case 'cursor':
            onCursorChange?.(msg.line, msg.column);
            break;
          case 'save':
            onSave?.();
            break;
          case 'quickOpen':
            onQuickOpen?.();
            break;
          case 'commandPalette':
            onCommandPalette?.();
            break;
          case 'toggleSidebar':
            onToggleSidebar?.();
            break;
          case 'toggleTerminal':
            onToggleTerminal?.();
            break;
        }
      } catch {}
    },
    [content, language, theme, fontSize, onContentChange, onCursorChange,
     onSave, onQuickOpen, onCommandPalette, onToggleSidebar, onToggleTerminal, postMessage]
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        // Inline HTML works on both iOS and Android; no local file path needed.
        source={{ html: MONACO_HTML }}
        style={styles.webview}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={false}
        allowsInlineMediaPlayback
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#1e1e1e' },
});
