import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ACTIVITIES } from '../data/activities';
import { fmt } from '../data/format';
import { importGpxActivity } from '../data/gpxImport';
import { C } from './theme';

export function ActivityPicker({ activityId, onSelect }: { activityId: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const current = ACTIVITIES.find((a) => a.id === activityId);

  const handleImport = async () => {
    setImporting(true);
    try {
      const activity = await importGpxActivity();
      if (activity) {
        onSelect(activity.id);
        setOpen(false);
      }
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={styles.triggerText}>{current?.name || 'Activity'}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {ACTIVITIES.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => { onSelect(a.id); setOpen(false); }}
                style={[styles.item, a.id === activityId && styles.itemActive]}
              >
                <Text style={styles.itemName}>{a.name}</Text>
                <Text style={styles.itemMeta}>{a.activityType} · {fmt.dist(a.distance, false)}</Text>
              </Pressable>
            ))}
            <Pressable onPress={handleImport} disabled={importing} style={styles.importItem}>
              <Text style={styles.importText}>{importing ? 'Importing…' : '+ Import GPX'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderStrong,
    backgroundColor: '#181818',
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
  },
  chevron: {
    fontSize: 10,
    color: C.textMuted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'flex-end',
    padding: 16,
  },
  menu: {
    marginTop: 48,
    minWidth: 220,
    backgroundColor: '#141414',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    overflow: 'hidden',
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  itemActive: {
    backgroundColor: C.accentMuted,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
  },
  itemMeta: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 2,
  },
  importItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  importText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.accent,
  },
});
