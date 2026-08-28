import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { HSV, hexToHsv, hsvToHex } from './color';
import { HueStrip, SVSquare } from './ColorPicker';
import { C } from '../theme';

export const QUICK_COLORS = [
  '#FFFFFF', '#111111', '#FC4C02', '#FF3B30', '#FF9500', '#FFD700', '#34C759', '#00FFAA',
  '#00D4FF', '#5AC8FA', '#4F46E5', '#7B2FFF', '#FF2D95', '#FF6B9D', '#A8FF3E', '#9CA3AF',
];

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <Text style={styles.dividerText}>{label}</Text>
    </View>
  );
}

export function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tabBtn}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
      <View style={[styles.tabBtnUnderline, active && styles.tabBtnUnderlineActive]} />
    </Pressable>
  );
}

export function ColorSwatch({ color, selected, onPress }: { color: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected]} />;
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.toggleRow}>
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
      <Text style={styles.toggleLabel}>{label}</Text>
    </Pressable>
  );
}

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [expanded, setExpanded] = useState(false);
  // hsv is tracked as its own state rather than derived from `value` on every
  // render: hex->hsv->hex is lossy at the edges (s or v at 0 makes hue
  // meaningless, so re-deriving would snap the hue thumb to red mid-drag).
  // Only resync from `value` when it changed from outside this picker.
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    setDraft(value);
    if (value !== lastEmitted.current) setHsv(hexToHsv(value));
  }, [value]);

  const commit = (text: string) => {
    setDraft(text);
    const normalized = text.startsWith('#') ? text : `#${text}`;
    if (HEX_RE.test(normalized)) {
      lastEmitted.current = normalized.toUpperCase();
      onChange(normalized.toUpperCase());
    }
  };

  const setFromHsv = (next: HSV) => {
    setHsv(next);
    const hex = hsvToHex(next);
    lastEmitted.current = hex;
    setDraft(hex);
    onChange(hex);
  };

  const pickSwatch = (c: string) => {
    lastEmitted.current = c;
    setDraft(c);
    setHsv(hexToHsv(c));
    onChange(c);
  };

  return (
    <View style={styles.colorField}>
      <Row style={styles.colorFieldRow}>
        <Text style={styles.colorFieldLabel}>{label}</Text>
        <Pressable onPress={() => setExpanded((e) => !e)}>
          <View style={[styles.colorFieldSwatch, { backgroundColor: value }]} />
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={commit}
          placeholder="#RRGGBB"
          placeholderTextColor={C.textMuted}
          style={styles.colorFieldInput}
          autoCapitalize="characters"
          maxLength={7}
        />
      </Row>
      {expanded && (
        <View style={styles.colorPickerPanel}>
          <SVSquare hsv={hsv} onChange={(s, v) => setFromHsv({ ...hsv, s, v })} />
          <HueStrip hue={hsv.h} onChange={(h) => setFromHsv({ ...hsv, h })} />
          <Row style={styles.quickSwatchRow}>
            {QUICK_COLORS.map((c) => (
              <ColorSwatch key={c} color={c} selected={value.toUpperCase() === c} onPress={() => pickSwatch(c)} />
            ))}
          </Row>
        </View>
      )}
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <Row style={styles.segmentRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.id}
          onPress={() => onChange(opt.id)}
          style={[styles.segmentBtn, value === opt.id && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentText, value === opt.id && styles.segmentTextActive]}>{opt.label}</Text>
        </Pressable>
      ))}
    </Row>
  );
}

// Like SegmentedControl, but wraps onto multiple lines instead of squeezing
// every option into one row — for option lists too long to fit a single row
// (e.g. entrance animation types).
export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <Row style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.id}
          onPress={() => onChange(opt.id)}
          style={[styles.chipBtn, value === opt.id && styles.chipBtnActive]}
        >
          <Text style={[styles.chipText, value === opt.id && styles.chipTextActive]}>{opt.label}</Text>
        </Pressable>
      ))}
    </Row>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  divider: {
    paddingTop: 12,
    paddingBottom: 8,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  tabBtnTextActive: {
    color: C.text,
  },
  tabBtnUnderline: {
    height: 2,
    width: '100%',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  tabBtnUnderlineActive: {
    backgroundColor: C.accent,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  toggleTrack: {
    width: 34,
    height: 19,
    borderRadius: 10,
    backgroundColor: C.border,
    borderWidth: 1,
    borderColor: C.borderStrong,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  toggleThumb: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginLeft: 2,
  },
  toggleThumbOn: {
    marginLeft: 18,
  },
  toggleLabel: {
    fontSize: 12,
    color: C.textSub,
  },
  segmentRow: {
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    alignItems: 'center',
  },
  segmentBtnActive: {
    borderColor: C.accent,
    backgroundColor: C.accentMuted,
  },
  segmentText: {
    fontSize: 11,
    color: C.textMuted,
    textTransform: 'capitalize',
  },
  segmentTextActive: {
    color: C.text,
  },
  colorField: {
    marginBottom: 10,
  },
  colorFieldRow: {},
  colorPickerPanel: {
    marginTop: 8,
    marginBottom: 4,
  },
  quickSwatchRow: {
    flexWrap: 'wrap',
    rowGap: 8,
  },
  colorFieldLabel: {
    fontSize: 12,
    color: C.textMuted,
    flex: 1,
  },
  colorFieldSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  colorFieldInput: {
    width: 74,
    fontSize: 12,
    color: C.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  chipRow: {
    flexWrap: 'wrap',
    rowGap: 8,
    marginBottom: 12,
  },
  chipBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  chipBtnActive: {
    backgroundColor: C.accentMuted,
    borderColor: C.accent,
  },
  chipText: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: C.text,
  },
});
