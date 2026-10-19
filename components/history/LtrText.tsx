// Text that always reads left-to-right (numbers, ₪, vehicle names) inside the RTL layout
import React from 'react';
import { Text, type TextProps } from 'react-native';
import { LTR } from '../../constants/rtl';

export function LtrText({ style, ...rest }: TextProps) {
  return <Text {...LTR.props} {...rest} style={[style, LTR.style]} />;
}
