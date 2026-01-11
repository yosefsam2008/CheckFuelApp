import React from 'react';
import {
    GestureResponderEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

interface ActionButtonProps {
  label: string;
  subLabel?: string;
  icon?: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  subLabel,
  icon,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  testID,
}) => {
  const variantStyles = {
    primary: [styles.btnPrimary],
    secondary: [styles.btnSecondary],
    tertiary: [styles.btnTertiary],
  };

  const textStyles = {
    primary: styles.textPrimary,
    secondary: styles.textSecondary,
    tertiary: styles.textTertiary,
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles[variant],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      testID={testID}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.label, textStyles[variant]]} numberOfLines={1}>
        {label}
      </Text>
      {subLabel && (
        <Text style={[styles.subLabel, textStyles[variant]]} numberOfLines={1}>
          {subLabel}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  
  /* Variants */
  btnPrimary: {
    backgroundColor: '#00897b',
  },
  btnSecondary: {
    backgroundColor: '#26a69a',
  },
  btnTertiary: {
    backgroundColor: '#80cbc4',
  },

  /* Text styles */
  label: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  textPrimary: {
    color: '#fff',
  },
  textSecondary: {
    color: '#fff',
  },
  textTertiary: {
    color: '#fff',
  },

  subLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.9,
  },

  icon: {
    fontSize: 24,
    marginBottom: 4,
  },

  disabled: {
    opacity: 0.5,
  },
});
