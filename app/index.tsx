import { Redirect } from 'expo-router';

export default function Index() {
  // Declarative redirect ensures navigation happens after the navigator mounts
  return <Redirect href="/dashboard" />;
}
