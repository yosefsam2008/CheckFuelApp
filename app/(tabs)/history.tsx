import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>היסטוריה</Text>
      <Text style={styles.text}>כאן תוכל לראות את היסטוריית התדלוקים שלך.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00bfa5',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#555',
  },
});
