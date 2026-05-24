import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useEditorStore } from '../../store/editorStore';

export default function EditorTabs() {
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
              <Text style={[styles.tabName, isActive && styles.tabNameActive]} numberOfLines={1}>
                {tab.isDirty ? '● ' : ''}{tab.name}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => closeTab(tab.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close"
                  size={14}
                  color={isActive ? '#cccccc' : '#858585'}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 35,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
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
  },
  tabActive: {
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: '#007acc',
  },
  tabName: {
    flex: 1,
    fontSize: 13,
    color: '#8a8a8a',
    fontFamily: 'Menlo',
  },
  tabNameActive: { color: '#ffffff' },
  closeBtn: {
    marginLeft: 6,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
});
