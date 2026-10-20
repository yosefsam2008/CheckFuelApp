// Small bottom sheet with one input: used for the destination search and the manual km fallback
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { Clock } from 'lucide-react-native';
import React, { RefObject, useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NO_OUTLINE } from '../../constants/rtl';
import { colors, Heebo, radius } from '../../constants/theme';
import { PressableScale } from './PressableScale';

interface Props {
  sheetRef: RefObject<BottomSheetModal | null>;
  title: string;
  placeholder: string;
  initial: string;
  numeric?: boolean;
  suffix?: string;
  cta: string;
  /** return an error message to keep the sheet open */
  onSubmit: (text: string) => string | null;
  recent?: string[];
}

// gorhom's keyboard-aware input calls a native-only API and crashes on react-native-web
const SheetInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

export function InputSheet({ sheetRef, title, placeholder, initial, numeric, suffix, cta, onSubmit, recent = [] }: Props) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<React.ElementRef<typeof BottomSheetTextInput>>(null);
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />,
    [],
  );

  const submit = (value: string) => {
    const err = onSubmit(value);
    setError(err);
    if (!err) sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
      onChange={(i) => {
        if (i < 0) return;
        setText(initial);
        setError(null);
        // focus only once the sheet has settled; autoFocus opens the keyboard mid-animation and the sheet misses its height
        inputRef.current?.focus();
      }}
    >
      <BottomSheetView style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.field}>
          <SheetInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            keyboardType={numeric ? 'decimal-pad' : 'default'}
            returnKeyType={numeric ? 'done' : 'search'}
            onSubmitEditing={() => submit(text)}
            style={styles.input}
            ref={inputRef}
            accessibilityLabel={title}
          />
          {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}

        {recent.length > 0 && (
          <View style={styles.chips}>
            {recent.map((r) => (
              <Pressable key={r} style={styles.chip} onPress={() => submit(r)} accessibilityRole="button">
                <Clock size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.chipText} numberOfLines={1}>
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <PressableScale style={styles.cta} onPress={() => submit(text)} accessibilityRole="button">
          <Text style={styles.ctaText}>{cta}</Text>
        </PressableScale>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { backgroundColor: colors.divider, width: 40, height: 4 },
  body: { padding: 20, paddingBottom: 32, gap: 12 },
  title: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.tile, paddingHorizontal: 14, minHeight: 52 },
  input: { flex: 1, minWidth: 0, ...NO_OUTLINE, fontFamily: Heebo.bold, fontSize: 17, color: colors.text, paddingVertical: 12, textAlign: 'right' },
  suffix: { fontFamily: Heebo.bold, fontSize: 15, color: colors.textMuted, marginStart: 8 },
  error: { fontFamily: Heebo.medium, fontSize: 13, color: colors.error },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, maxWidth: 200, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.bg },
  chipText: { fontFamily: Heebo.medium, fontSize: 13, color: colors.text, flexShrink: 1 },
  cta: { height: 52, borderRadius: radius.pill, backgroundColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaText: { fontFamily: Heebo.extra, fontSize: 16, color: colors.white },
});
