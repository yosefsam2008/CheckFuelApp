// app/modal.tsx - התיקון הסופי

import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

// 🟢 התיקון ל-ThemedText ו-ThemedView: 
// שימוש בייבוא ברירת מחדל (בהנחה שזה מה שמוגדר בקבצי המקור)
import {ThemedText} from '@/components/themed-text';
import {ThemedView} from '@/components/themed-view';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">This is a modal</ThemedText>
    </ThemedView>
  );
}