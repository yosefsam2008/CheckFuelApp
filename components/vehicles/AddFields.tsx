// Small building blocks of the add-vehicle screen: a labelled field and a result message block
import React from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import Animated from 'react-native-reanimated';
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
}

export function Field({ label, value, onChange, suffix, keyboardType, ltr, placeholder, maxLength }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <TextInput
          {...(ltr ? LTR.props : {})}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          maxLength={maxLength}
          style={[styles.input, NO_OUTLINE, ltr && LTR.style]}
          accessibilityLabel={suffix ? `${label}, ${suffix}` : label}
        />
        {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
    </View>
  );
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
  box: { height: 52, flexDirection: 'row', alignItems: 'center', borderRadius: radius.tile, backgroundColor: colors.bg, paddingHorizontal: 14, gap: 8 },
  input: { flex: 1, height: '100%', fontFamily: Heebo.bold, fontSize: 17, color: colors.text },
  suffix: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted },
  message: { marginTop: 16, padding: 16, borderRadius: radius.tile, backgroundColor: colors.bg, alignItems: 'flex-start', gap: 4 },
  msgTitle: { fontFamily: Heebo.bold, fontSize: 16, color: colors.text, marginTop: 4 },
  msgBody: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted },
  linkBtn: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: Heebo.bold, fontSize: 14, color: colors.guideText, textDecorationLine: 'underline' },
});
