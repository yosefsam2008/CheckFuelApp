// Segmented control with one sliding indicator (Motion Primitives "Animated Background").
// RTL-safe: the indicator uses physical `left` + translateX from onLayout, which are both physical.
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { dur, haptic, spring } from '../../constants/motion';
import { colors, Heebo } from '../../constants/theme';
import { LTR, NO_TOUCH } from '../../constants/rtl';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  tag?: string; // small English line above the label
  tagColor?: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  height?: number;
  accessibilityLabel: string;
}

type Box = { x: number; width: number };

function Label({ option, selected }: { option: SegmentOption<string>; selected: boolean }) {
  const label = useAnimatedStyle(() => ({ color: withTiming(selected ? colors.selectedText : colors.textMuted, { duration: dur.micro }) }));
  const tag = useAnimatedStyle(() => ({
    color: withTiming(selected ? (option.tagColor ?? colors.selectedText) : colors.textMuted, { duration: dur.micro }),
  }));
  return (
    <>
      {option.tag && <Animated.Text style={[styles.tag, tag]}>{option.tag}</Animated.Text>}
      <Animated.Text style={[styles.label, label]} numberOfLines={1}>
        {option.label}
      </Animated.Text>
    </>
  );
}

export function SlidingSegment<T extends string>({ options, value, onChange, height = 44, accessibilityLabel }: Props<T>) {
  const [boxes, setBoxes] = useState<Record<number, Box>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const index = options.findIndex((o) => o.value === value);

  useEffect(() => {
    const box = boxes[index];
    if (!box) return;
    if (w.value === 0) {
      x.value = box.x; // first placement: no slide in from nowhere
      w.value = box.width;
    } else {
      x.value = withSpring(box.x, spring.snappy);
      w.value = withSpring(box.width, spring.snappy);
    }
  }, [index, boxes, x, w]);

  const indicator = useAnimatedStyle(() => ({ width: w.value, opacity: w.value ? 1 : 0, transform: [{ translateX: x.value }] }));

  const onItemLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x: bx, width } = e.nativeEvent.layout;
    setBoxes((b) => (b[i]?.x === bx && b[i]?.width === width ? b : { ...b, [i]: { x: bx, width } }));
  };

  return (
    <View style={styles.track} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      <View {...LTR.props} style={[StyleSheet.absoluteFill, LTR.style, NO_TOUCH]}>
        <Animated.View testID="segment-indicator" style={[styles.indicator, indicator]} />
      </View>
      {options.map((o, i) => (
        <Pressable
          key={o.value}
          style={[styles.item, { height }]}
          onLayout={onItemLayout(i)}
          onPress={() => {
            if (o.value === value) return;
            haptic.select();
            onChange(o.value);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.value === value }}
        >
          <Label option={o} selected={o.value === value} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 14, padding: 4 },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    borderRadius: 11,
    backgroundColor: colors.selectedFill,
    borderWidth: 1.5,
    borderColor: colors.selectedBorder,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tag: { fontFamily: Heebo.bold, fontSize: 11, letterSpacing: 0.8 },
  label: { fontFamily: Heebo.bold, fontSize: 15 },
});
