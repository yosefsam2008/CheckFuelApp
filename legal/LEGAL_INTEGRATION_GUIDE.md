# Legal Compliance Integration Guide

## 📚 Quick Start - How to Integrate Legal Components

This guide shows you exactly how to integrate the legal compliance components into your app.

---

## 1. File Organization

After implementation, your project should have these new files:

```
checkfuel/
├── PRIVACY_POLICY_HE.md              ← Hebrew privacy policy (for hosting)
├── PRIVACY_POLICY_EN.md              ← English privacy policy (for hosting)
├── TERMS_OF_SERVICE_HE.md            ← Hebrew terms (for hosting)
├── TERMS_OF_SERVICE_EN.md            ← English terms (for hosting)
├── LEGAL_UI_STRINGS_HE.ts            ← UI text strings (copy into app)
├── GOOGLE_PLAY_COMPLIANCE_CHECKLIST.md ← Submission guide
├── app/
│   ├── LegalScreen.tsx               ← Main legal component (CRITICAL)
│   ├── _layout.tsx                   ← App layout (needs update)
│   ├── (tabs)/
│   │   ├── calculator.tsx            ← Add disclaimer
│   │   ├── vehicles.tsx              ← No changes
│   │   ├── history.tsx               ← No changes
│   │   └── dashboard.tsx             ← No changes
│   └── settings.tsx or equivalent    ← Add legal navigation
└── ...
```

---

## 2. Basic Integration (5 Minutes)

### Step 1: Copy the Legal Screen Component
You already have `app/LegalScreen.tsx` - it's ready to use!

### Step 2: Show Legal Screen on First Launch
In your main App or navigation file (e.g., `app/_layout.tsx`):

```tsx
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LegalScreen from './LegalScreen';

export default function RootLayout() {
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLegalAcceptance();
  }, []);

  const checkLegalAcceptance = async () => {
    try {
      const accepted = await AsyncStorage.getItem('legal_acceptance');
      if (accepted === 'true') {
        setHasAcceptedLegal(true);
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // or a loading screen
  }

  if (!hasAcceptedLegal) {
    return (
      <LegalScreen
        requireAcceptance={true}
        onAccept={() => setHasAcceptedLegal(true)}
      />
    );
  }

  // Your normal app layout
  return (
    <Tabs>
      {/* Your existing screens */}
    </Tabs>
  );
}
```

---

## 3. Add Legal to Settings (10 Minutes)

### Option A: In Settings Tab/Screen

```tsx
// In your settings screen (e.g., app/settings.tsx or similar)
import { useNavigation } from '@react-native-router-native-stack';
import LegalScreen from './LegalScreen';

export default function SettingsScreen() {
  const [showLegal, setShowLegal] = useState(false);
  const [activeTab, setActiveTab] = useState('privacy');

  if (showLegal) {
    return (
      <LegalScreen
        requireAcceptance={false}
        showCloseButton={true}
        onClose={() => setShowLegal(false)}
      />
    );
  }

  return (
    <ScrollView>
      {/* Other settings... */}
      
      <TouchableOpacity
        onPress={() => {
          setActiveTab('privacy');
          setShowLegal(true);
        }}
        style={styles.settingItem}
      >
        <Text>🔒 מדיניות פרטיות / Privacy Policy</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setActiveTab('terms');
          setShowLegal(true);
        }}
        style={styles.settingItem}
      >
        <Text>📋 תנאי השירות / Terms of Service</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setActiveTab('about');
          setShowLegal(true);
        }}
        style={styles.settingItem}
      >
        <Text>ℹ️ אודות / About</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

### Option B: As a Drawer/Nested Screen
Use Expo Router to create a `app/(modals)/legal.tsx` screen and navigate to it.

---

## 4. Add Disclaimers to Calculator (5 Minutes)

In your calculator screen (e.g., `app/(tabs)/calculator.tsx`), add this near the results:

```tsx
// Add this import
import { LEGAL_UI_STRINGS } from '../../LEGAL_UI_STRINGS_HE';

// In your calculator results section, add:
<View style={styles.disclaimerBanner}>
  <Text style={styles.disclaimerIcon}>⚠️</Text>
  <Text style={styles.disclaimerText}>
    {LEGAL_UI_STRINGS.calculator.disclaimer}
  </Text>
</View>

// Add these styles:
const styles = StyleSheet.create({
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disclaimerIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
    fontWeight: '500',
  },
});
```

---

## 5. Add Attribution Footer (3 Minutes)

In your calculator or dashboard footer:

```tsx
import { LEGAL_UI_STRINGS } from '../../LEGAL_UI_STRINGS_HE';

// In your component:
<View style={styles.footer}>
  <Text style={styles.footerText}>
    {LEGAL_UI_STRINGS.attribution.footer}
  </Text>
</View>

// Styles:
const styles = StyleSheet.create({
  footer: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 20,
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
});
```

---

## 6. Host Legal Documents Online

### Quick Setup with GitHub Pages (Free):

1. Create a new GitHub repo: `checkfuel-legal`
2. Create `docs/` folder
3. Add files:
   ```
   docs/
   ├── privacy-policy.md
   ├── terms-of-service.md
   └── index.html (optional, for linking)
   ```

4. In GitHub repo settings:
   - Enable GitHub Pages
   - Set source to: `docs/` folder
   - Save

5. Your URLs are now:
   ```
   https://[your-username].github.io/checkfuel-legal/privacy-policy.md
   https://[your-username].github.io/checkfuel-legal/terms-of-service.md
   ```

6. Use these URLs in Google Play submission

---

## 7. First-Launch Flow (Optional)

If you want users to accept terms on first launch:

```tsx
const [showLegal, setShowLegal] = useState(false);

useEffect(() => {
  const checkFirstLaunch = async () => {
    const launched = await AsyncStorage.getItem('app_first_launch');
    if (!launched) {
      setShowLegal(true);
      await AsyncStorage.setItem('app_first_launch', 'true');
    }
  };
  checkFirstLaunch();
}, []);

return (
  <>
    {showLegal && (
      <LegalScreen
        requireAcceptance={true}
        onAccept={() => setShowLegal(false)}
      />
    )}
    {/* Your app */}
  </>
);
```

---

## 8. Customization

### Change Colors
Edit `COLORS` in `LegalScreen.tsx`:

```tsx
const COLORS = {
  primary: '#009688',  // Change this to match your app
  primaryDark: '#00796b',
  // ... other colors
};
```

### Change Text
Edit `PRIVACY_POLICY_HE` and `TERMS_OF_SERVICE_HE` in `LegalScreen.tsx`:

```tsx
const PRIVACY_POLICY_HE = `
Your updated text here...
`;
```

### Multilingual Support
The component already supports Hebrew + English. To add more languages:

1. Add constants: `PRIVACY_POLICY_AR`, `PRIVACY_POLICY_ES`, etc.
2. Modify the `renderContent()` function
3. Add language toggle button

---

## 9. Testing Checklist

Before submitting to Google Play:

```
[ ] First-launch legal screen shows
[ ] Privacy tab displays correctly
[ ] Terms tab displays correctly
[ ] About tab displays correctly
[ ] Language toggle works (HE ↔ EN)
[ ] Checkbox works (first launch)
[ ] Accept button saves preference
[ ] Disclaimer shows on calculator results
[ ] Attribution footer displays
[ ] Legal documents hosted online
[ ] URLs are accessible
[ ] No console errors
[ ] RTL layout works (Hebrew text)
[ ] Professional appearance on iOS and Android
```

---

## 10. Google Play Submission

When submitting, include:

1. **Privacy Policy URL:**
   ```
   https://[your-github-username].github.io/checkfuel-legal/privacy-policy.md
   ```

2. **Terms of Service URL (optional but recommended):**
   ```
   https://[your-github-username].github.io/checkfuel-legal/terms-of-service.md
   ```

3. **Data Safety Section:** Fill completely (see checklist)

4. **Screenshot of legal screen:** Include screenshot showing:
   - First-launch legal acceptance
   - Settings menu with legal options

---

## 11. Common Issues & Solutions

### Issue: Text appears cut off in Hebrew
**Solution:** The RTL direction is set in `contentContainer`:
```tsx
contentContainer={[
  styles.contentContainer,
  isHebrewMode && { direction: 'rtl' },
]}
```
This is already in the code. If still broken, check your View wrapper.

### Issue: Component doesn't save acceptance
**Solution:** Check AsyncStorage is installed:
```bash
npm install @react-native-async-storage/async-storage
# or with expo:
expo install @react-native-async-storage/async-storage
```

### Issue: URLs don't work in Google Play
**Solution:** Make sure:
1. GitHub Pages is enabled (Settings → Pages)
2. Files are in `docs/` folder
3. Wait 5 minutes for GitHub to rebuild
4. Test URL in browser first

### Issue: Component looks bad on web
**Solution:** Add to `LegalScreen.tsx`:
```tsx
const { width } = useWindowDimensions();
const maxWidth = width > 600 ? 600 : width;

// Wrap content in:
<View style={{ maxWidth, alignSelf: 'center', flex: 1 }}>
  {/* your content */}
</View>
```

---

## 12. Next Steps

1. ✅ Copy `LegalScreen.tsx` to your project
2. ✅ Integrate into first-launch flow
3. ✅ Host markdown documents online (GitHub Pages recommended)
4. ✅ Add disclaimer to calculator
5. ✅ Add legal links to settings
6. ✅ Test thoroughly on iOS & Android
7. ✅ Fill Google Play Data Safety section
8. ✅ Submit to Google Play!

---

## 📞 Support Files

All files are in your project root:
- `PRIVACY_POLICY_HE.md` - Full Hebrew privacy policy
- `PRIVACY_POLICY_EN.md` - Full English privacy policy
- `TERMS_OF_SERVICE_HE.md` - Full Hebrew terms
- `TERMS_OF_SERVICE_EN.md` - Full English terms
- `LEGAL_UI_STRINGS_HE.ts` - Ready-to-use UI strings
- `GOOGLE_PLAY_COMPLIANCE_CHECKLIST.md` - Complete submission guide
- `app/LegalScreen.tsx` - React Native component

---

**Everything is ready to use. Just copy and paste!** 🚀
