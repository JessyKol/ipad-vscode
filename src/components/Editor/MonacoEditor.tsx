import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useEditorStore } from '../../store/editorStore';

type Props = {
  tabId: string;
  content: string;
  language: string;
  onContentChange: (content: string) => void;
  onCursorChange?: (line: number, column: number) => void;
};

export default function MonacoEditor({
  tabId,
  content,
  language,
  onContentChange,
  onCursorChange,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);
  const pendingInit = useRef<{ value: string; language: string } | null>(null);
  const { theme, fontSize } = useEditorStore();

  const postMessage = useCallback((msg: object) => {
    webViewRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    if (isReady.current) {
      postMessage({ type: 'setValue', value: content });
      postMessage({ type: 'setLanguage', language });
    } else {
      pendingInit.current = { value: content, language };
    }
  }, [tabId]);

  useEffect(() => {
    if (isReady.current) {
      postMessage({ type: 'setTheme', theme });
    }
  }, [theme]);

  useEffect(() => {
    if (isReady.current) {
      postMessage({ type: 'setFontSize', size: fontSize });
    }
  }, [fontSize]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'ready') {
          isReady.current = true;
          const init = pendingInit.current;
          postMessage({
            type: 'init',
            value: init?.value ?? content,
            language: init?.language ?? language,
            options: { theme, fontSize },
          });
          pendingInit.current = null;
        } else if (msg.type === 'change') {
          onContentChange(msg.value);
        } else if (msg.type === 'cursor') {
          onCursorChange?.(msg.line, msg.column);
        }
      } catch {}
    },
    [content, language, theme, fontSize, onContentChange, onCursorChange, postMessage]
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'file:///android_asset/monaco/index.html' }}
        style={styles.webview}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        originWhitelist={['*']}
        scrollEnabled={false}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#1e1e1e' },
});
