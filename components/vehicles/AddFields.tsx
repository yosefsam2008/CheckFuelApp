// Small building blocks of the add-vehicle screen: a labelled field, a result message block, an entrance wrapper
import React from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type TextStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { useEnter } from '../../constants/motion';
import { LTR, NO_OUTLINE } from '../../constants/rtl';
import { colors, Heebo, radius } from '../../constants/theme';
import { PressableScale } from '../calculator/PressableScale';

interface FieldProps {
  label: string;
  value: string;
  onChange: (t: string) => void;
  /** unit shown inside the field at its end */
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
  /** numbers and Latin text read left to right */
  ltr?: boolean;
  placeholder?: string;
  maxLength?: number;
  onFocus?: () => void;
  /** animated style on the input itself (the consumption handoff fades it in) */
  inputStyle?: StyleProp<AnimatedStyle<StyleProp<TextStyle>>>;
  /** drawn exactly over the input text, never touchable */
  overlay?: React.ReactNode;
  /** after the suffix, at the inline end of the box */
  accessory?: React.ReactNode;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function Field({ label, value, onChange, suffix, keyboardType, ltr, placeholder, maxLength, onFocus, inputStyle, overlay, accessory }: FieldProps) {
  const input = (
    <AnimatedTextInput
      {...(ltr ? LTR.props : {})}
      value={value}
      onChangeText={onChange}
      onFocus={onFocus}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      maxLength={maxLength}
      style={[styles.input, NO_OUTLINE, ltr && LTR.style, inputStyle]}
      accessibilityLabel={suffix ? `${label}, ${suffix}` : label}
    />
  );
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        {overlay ? (
          <View style={styles.inputWrap}>
            {input}
            <View {...LTR.props} style={[styles.overlay, LTR.style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {overlay}
            </View>
          </View>
        ) : (
          input
        )}
        {!!suffix && <Text style={styles.suffix} numberOfLines={1}>{suffix}</Text>}
        {accessory}
      </View>
    </View>
  );
}

/** Fade + rise on mount, only when `play` is true at mount */
export function Enter({ delay, play, children }: { delay: number; play: boolean; children: React.ReactNode }) {
  return <Animated.View style={useEnter(delay, play)}>{children}</Animated.View>;
}

/** Icon, title, body and an optional link: not found, offline and duplicate all use it */
export function Message({ icon, title, body, link, onLink }: { icon: React.ReactNode; title: string; body?: string; link?: string; onLink?: () => void }) {
  const enter = useEnter(0);
  return (
    <Animated.View style={[styles.message, enter]} accessibilityLiveRegion="polite">
      {icon}
      <Text style={styles.msgTitle}>{title}</Text>
      {!!body && <Text style={styles.msgBody}>{body}</Text>}
      {!!link && (
        <PressableScale onPress={onLink} style={styles.linkBtn} accessibilityRole="link">
          <Text style={styles.link}>{link}</Text>
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 14 },
  label: { fontFamily: Heebo.semi, fontSize: 14, color: colors.textMuted, marginBottom: 6 },
  box: { height: 52, flexDirection: 'row', alignItems: 'center', borderRadius: radius.tile, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, paddingHorizontal: 14, gap: 8 },
  input: { flex: 1, minWidth: 0, height: '100%', fontFamily: Heebo.bold, fontSize: 17, color: colors.text },
  inputWrap: { flex: 1, minWidth: 0, height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center' },
  suffix: { flexShrink: 0, fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted }, // the input gives way, not the unit
  message: { marginTop: 16, padding: 16, borderRadius: radius.tile, backgroundColor: colors.bg, alignItems: 'flex-start', gap: 4 },
  msgTitle: { fontFamily: Heebo.bold, fontSize: 16, color: colors.text, marginTop: 4 },
  msgBody: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted },
  linkBtn: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: Heebo.bold, fontSize: 14, color: colors.guideText, textDecorationLine: 'underline' },
});
