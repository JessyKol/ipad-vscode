import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useEditorStore } from '../../store/editorStore';

type Props = { onSave?: () => void };

export default function EditorTabs({ onSave }: Props) {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore();

  if (tabs.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              {tab.isDirty && (
                <View style={styles.dirtyDot} />
              )}
              <Text style={[styles.tabName, isActive && styles.tabNameActive]} numberOfLines={1}>
                {tab.name}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => closeTab(tab.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={tab.isDirty ? 'ellipse' : 'close'}
                  size={tab.isDirty ? 8 : 14}
                  color={isActive ? '#cccccc' : '#858585'}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {onSave && (
        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
          <Ionicons name="save-outline" size={16} color="#858585" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 35,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
    flexDirection: 'row',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 35,
    borderRightWidth: 1,
    borderRightColor: '#1e1e1e',
    backgroundColor: '#2d2d2d',
    minWidth: 100,
    maxWidth: 180,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: '#007acc',
  },
  dirtyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cccccc',
  },
  tabName: {
    flex: 1,
    fontSize: 13,
    color: '#8a8a8a',
    fontFamily: 'Menlo',
  },
  tabNameActive: { color: '#ffffff' },
  closeBtn: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  saveBtn: {
    width: 36,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#3c3c3c',
  },
});
