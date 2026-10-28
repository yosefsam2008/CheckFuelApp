// Hidden check screen for RollingNumber (open checkfuel:///dev/rolling). Not linked from the app.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RollingNumber } from '../../components/motion/RollingNumber';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';

const START = [0, 7, 70, 140, 1234, 7.77, 18.1];

export default function RollingDev() {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState(START);
  const apply = (f: (v: number) => number) => setValues((vs) => vs.map((v) => Math.round(f(v) * 100) / 100));

  return (
    <ScrollView style={{ backgroundColor: colors.surfaceInverse }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, gap: 14 }}>
      <View style={styles.buttons}>
        {([['+1', (v: number) => v + 1], ['-1', (v: number) => v - 1], ['x2', (v: number) => v * 2], ['reset', null]] as const).map(([label, f]) => (
          <Pressable key={label} style={styles.btn} onPress={() => (f ? apply(f) : setValues(START))}>
            <Text style={styles.btnText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {values.map((v, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{START[i]}</Text>
          <RollingNumber value={v} decimals={Number.isInteger(START[i]) ? 0 : 2} prefix="₪" fontSize={i === 4 ? 72 : 44} fontFamily={Rubik.extra} color={colors.textInverse} dimColor={colors.inkFaint} />
        </View>
      ))}
      <View style={styles.row}>
        <Text style={styles.label}>NaN</Text>
        <RollingNumber value={NaN} fontSize={44} color={colors.textInverse} dimColor={colors.inkFaint} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: 8 },
  btn: { backgroundColor: colors.surfaceRaised, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  btnText: { fontFamily: Rubik.bold, color: colors.text, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { color: colors.inkFaint, width: 48, fontSize: 12 },
});
