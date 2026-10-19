import { Redirect } from 'expo-router';

export default function Index() {
  // כולם נכנסים למחשבון. אתחול הפרסומות נעשה פעם אחת ב-_layout.tsx
  return <Redirect href="/calculator" />;
}
