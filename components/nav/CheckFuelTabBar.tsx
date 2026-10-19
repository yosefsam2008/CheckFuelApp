// Bottom tab bar with one pill that slides to the active tab (RTL-safe: physical left + onLayout x).
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic, spring } from '../../constants/motion';
import { colors, Heebo } from '../../constants/theme';
import { LTR, NO_TOUCH } from '../../constants/rtl';

const BAR = 64;
const PILL_H = 48;

type Box = { x: number; width: number };

function Tab({ focused, label, icon, onPress, onLayout, accessibilityLabel }: {
  focused: boolean;
  label: string;
  icon: (color: string) => React.ReactNode;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  accessibilityLabel?: string;
}) {
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(focused ? 1.12 : 1, spring.bouncy) }] }));
  const on = useAnimatedStyle(() => ({ opacity: withTiming(focused ? 1 : 0, { duration: 200 }) }));
  const off = useAnimatedStyle(() => ({ opacity: withTiming(focused ? 0 : 1, { duration: 200 }) }));
  const text = useAnimatedStyle(() => ({ color: withTiming(focused ? colors.selectedText : colors.textMuted, { duration: 200 }) }));
  return (
    <Pressable style={styles.tab} onPress={onPress} onLayout={onLayout} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={accessibilityLabel ?? label}>
      <Animated.View style={[styles.iconBox, scale]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, off]}>{icon(colors.textMuted)}</Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, on]}>{icon(colors.selectedText)}</Animated.View>
      </Animated.View>
      <Animated.Text style={[styles.label, text]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export function CheckFuelTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [boxes, setBoxes] = useState<Record<number, Box>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  useEffect(() => {
    const box = boxes[state.index];
    if (!box) return;
    const target = box.x + 10;
    if (w.value === 0) {
      x.value = target;
      w.value = box.width - 20;
    } else {
      x.value = withSpring(target, spring.snappy);
      w.value = withSpring(box.width - 20, spring.snappy);
    }
  }, [state.index, boxes, x, w]);

  const pill = useAnimatedStyle(() => ({ width: w.value, opacity: w.value ? 1 : 0, transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.bar, { height: BAR + insets.bottom, paddingBottom: insets.bottom }]}>
      <View {...LTR.props} style={[StyleSheet.absoluteFill, LTR.style, NO_TOUCH]}>
        <Animated.View testID="tab-pill" style={[styles.pill, pill]} />
      </View>
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const focused = state.index === i;
        const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);
        return (
          <Tab
            key={route.key}
            focused={focused}
            label={label}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            icon={(color) => options.tabBarIcon?.({ focused, color, size: 24 })}
            onLayout={(e) => {
              const { x: bx, width } = e.nativeEvent.layout;
              setBoxes((b) => (b[i]?.x === bx && b[i]?.width === width ? b : { ...b, [i]: { x: bx, width } }));
            }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptic.select();
                navigation.navigate(route.name, route.params);
              }
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  pill: { position: 'absolute', left: 0, top: (BAR - PILL_H) / 2, height: PILL_H, borderRadius: 16, backgroundColor: colors.selectedFill },
  tab: { flex: 1, height: BAR, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconBox: { width: 28, height: 26 },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Heebo.bold, fontSize: 12, lineHeight: 15 },
});
