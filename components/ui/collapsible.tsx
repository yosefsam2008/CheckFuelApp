import { useState, PropsWithChildren, createContext, useContext } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/* ---------------------------------------------
   Radix-Style API (for compatibility)
---------------------------------------------- */

// Context for Trigger & Content
const CollapsibleContext = createContext<{
  isOpen: boolean;
  toggle: () => void;
} | null>(null);

export const Collapsible = ({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: PropsWithChildren<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}>) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isOpen = open ?? internalOpen;

  const toggle = () => {
    const next = !isOpen;
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };

  return (
    <CollapsibleContext.Provider value={{ isOpen, toggle }}>
      {children}
    </CollapsibleContext.Provider>
  );
};

/* ---------------------------------------------
   Trigger Component (Radix-style)
---------------------------------------------- */

export const CollapsibleTrigger = ({
  children,
  title,
}: PropsWithChildren<{ title?: string }>) => {
  const context = useContext(CollapsibleContext);
  if (!context) throw new Error('CollapsibleTrigger must be used within Collapsible');
  const { isOpen, toggle } = context;
  const theme = useColorScheme() ?? 'light';

  return (
    <TouchableOpacity
      style={styles.heading}
      onPress={toggle}
      activeOpacity={0.8}
    >
      <IconSymbol
        name="chevron.right"
        size={18}
        weight="medium"
        color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
        style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
      />

      {title ? (
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

/* ---------------------------------------------
   Content Component (Radix-style)
---------------------------------------------- */

export const CollapsibleContent = ({ children }: PropsWithChildren) => {
  const context = useContext(CollapsibleContext);
  if (!context) throw new Error('CollapsibleContent must be used within Collapsible');
  const { isOpen } = context;

  if (!isOpen) return null;

  return <ThemedView style={styles.content}>{children}</ThemedView>;
};

/* ---------------------------------------------
   Styles
---------------------------------------------- */

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
