# Google Play Store Compliance Checklist

## 📋 Complete Submission Checklist for Fuel Cost Calculator App

**Status:** Ready for Submission  
**Date:** December 2025  
**App Name:** Fuel Cost Calculator / מחשבון עלויות נסיעה

---

## ✅ CRITICAL REQUIREMENTS

### 1. Privacy Policy (REQUIRED)
- [x] Hebrew version created
- [x] English version created
- [x] Covers data storage (AsyncStorage - local only)
- [x] Covers data collection (license plates, vehicle details, trip history)
- [x] Covers APIs used (data.gov.il, Fuel Economy API)
- [x] Explains no third-party sharing
- [x] Explains user rights (access, delete)
- [x] Complies with Israeli Privacy Protection Law
- [x] Ready to host: Copy entire PRIVACY_POLICY_HE.md content

**Hosting Options:**
- Option A: Host on GitHub (free)
- Option B: Host on simple HTML page (Firebase Hosting, Vercel)
- Option C: In-app screen (recommended for user trust)
- **Recommended:** Use in-app LegalScreen.tsx component

**URL to Submit:** (when deployed)
```
https://your-domain.com/privacy-policy
```

---

### 2. Terms of Service (STRONGLY RECOMMENDED)
- [x] Hebrew version created
- [x] English version created
- [x] Includes disclaimer that calculations are estimates only
- [x] Includes liability limitations
- [x] Includes data usage terms
- [x] Includes trademark disclaimers
- [x] Includes government data disclaimers
- [x] Complies with Israeli law
- [x] Ready to host: Copy entire TERMS_OF_SERVICE_HE.md content

**Hosting:** Same as privacy policy

---

### 3. In-App Legal Component
- [x] React Native component created (LegalScreen.tsx)
- [x] Privacy Policy included (full text)
- [x] Terms of Service included (full text)
- [x] About & Attributions included
- [x] First-launch acceptance flow
- [x] Hebrew + English support
- [x] RTL layout support
- [x] No external dependencies (React Native core only)
- [x] Professional design matching app theme
- [x] AsyncStorage integration for acceptance tracking

**Integration Steps:**
```tsx
// In your app's main navigation or App.tsx:
import LegalScreen from './app/LegalScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// On first launch, show:
<LegalScreen 
  requireAcceptance={true}
  onAccept={() => {
    // User accepted - proceed to main app
  }}
/>

// Or as a screen in settings:
<LegalScreen 
  requireAcceptance={false}
  showCloseButton={true}
  onClose={() => navigation.goBack()}
/>
```

---

## 📊 Google Play Data Safety Section

### Before Submission, Complete These Fields:

#### 1. **Data Safety** → **Data Types Collected**

**What to select:**
- [ ] Name
- [x] License Plate Number ← SELECT THIS
- [ ] Phone Number
- [ ] Email Address
- [ ] User IDs
- [ ] Precise Location
- [ ] Approximate Location
- [ ] Photos or Videos
- [x] Vehicle Information ← SELECT THIS
- [ ] Web Activity
- [ ] App Activity
- [ ] Files
- [ ] Calendar Info
- [ ] Contacts
- [ ] SMS
- [ ] Other (specify below)

**Explanation:**
> "The app collects vehicle license plates (for government database lookup), vehicle details (make, model, year, fuel type, consumption), trip history, and calculation results. All data is stored only on the user's device using local AsyncStorage. No data is transmitted to external servers or shared with third parties."

---

#### 2. **Data Safety** → **How the Data Is Used**

**Primary Purpose:**
- [x] Calculate fuel/electricity costs for vehicles
- [x] Store vehicle details locally
- [x] Maintain trip history

**Secondary Purposes:**
- [x] Improve app functionality
- [x] Provide better user experience

**NOT Used For:**
- [ ] Advertising/marketing
- [ ] Third-party sharing
- [ ] Behavioral tracking
- [ ] Financial services

---

#### 3. **Data Safety** → **Data Retention**

**How long is data kept?**
```
"Data is retained indefinitely on the user's device or until 
manually deleted by the user. The user has full control over 
deletion. When the app is uninstalled, all data is automatically 
deleted from the system."
```

---

#### 4. **Data Safety** → **Data Security**

**Encryption:**
- [x] Data in transit: HTTPS (API calls only)
- [x] Data at rest: OS-level encryption (AsyncStorage uses device encryption)

**Statement:**
```
"All data is stored locally on the user's device using 
AsyncStorage, which relies on the operating system's native 
encryption. External API calls (data.gov.il) use HTTPS. 
No user data is stored on external servers."
```

---

#### 5. **Data Safety** → **Data Sharing**

**Third-party sharing:**
- [x] We do NOT share data with third parties
- [x] We do NOT sell data
- [x] We do NOT allow behavioral tracking

**APIs that receive data:**
- data.gov.il: Vehicle license plate ONLY (government lookup)
- Fuel Economy API: Vehicle details ONLY (make, model, year)

**Statement:**
```
"Data is never shared with third parties. External APIs 
(data.gov.il, Fuel Economy) receive only essential information 
for lookups (license plate or vehicle details). These APIs are 
public services; they do not correlate data with user identity. 
No personal identification is transmitted."
```

---

## 🔐 Privacy & Security Questionnaire

### Policy/Legal Documents

**1. Do you have a privacy policy?**
- [x] Yes
- [ ] No

**Privacy Policy URL:**
```
[Will fill after hosting]
https://your-domain.com/privacy-policy
```

**2. Do you have Terms of Service?**
- [x] Yes
- [ ] No

**Terms URL:**
```
[Will fill after hosting]
https://your-domain.com/terms-of-service
```

### Data Practices

**3. Does your app collect or transmit any data?**
- [x] Yes
- [ ] No

**If yes, is it:**
- [x] Only stored on device
- [ ] Uploaded to servers
- [ ] Shared with third parties

**4. Does your app comply with Israeli law?**
- [x] Yes - Complies with:
  - Privacy Protection Law (1981)
  - Consumer Protection Law
  - Google Play Policies

**5. Do users have the ability to delete their data?**
- [x] Yes
- [ ] No

**How:** Users can delete individual vehicles, calculations, or all data by uninstalling the app.

---

## 🎯 Content Rating Questionnaire

### Required Answers:

**1. Does your app contain any violence, profanity, or inappropriate content?**
- [x] No

**2. Is the app intended for children under 13?**
- [x] No - Target: Adult Israeli drivers

**3. Does it collect personal information from minors?**
- [x] No

**4. Does the app comply with GDPR (if applicable)?**
- [x] N/A (Israeli app, data stored locally)

**Suggested Rating:** 
```
PEGI 3 / Google Play: Unrated (calculated content, no mature themes)
```

---

## 🚀 Pre-Submission Checklist

### Content Preparation
- [x] Privacy Policy (Hebrew + English) - Ready
- [x] Terms of Service (Hebrew + English) - Ready
- [x] In-app Legal Component - Ready
- [x] Data Attribution - Ready
- [x] Disclaimers - Ready

### Legal Documents to Host
**Before you submit, you MUST host these somewhere:**

**Option 1 (RECOMMENDED): GitHub + GitHub Pages**
1. Create a GitHub repo: `checkfuel-legal`
2. Create `docs/` folder
3. Add `privacy-policy.md`, `terms-of-service.md`
4. Enable GitHub Pages (docs/ folder)
5. URLs become:
   ```
   https://[your-username].github.io/checkfuel-legal/privacy-policy
   https://[your-username].github.io/checkfuel-legal/terms-of-service
   ```

**Option 2: Firebase Hosting**
1. Create Firebase project
2. Deploy docs to Hosting
3. URLs: `https://[project].web.app/legal/privacy-policy`

**Option 3: Simple Web Hosting**
1. Create simple HTML pages wrapping the markdown
2. Upload to your hosting provider

### Google Play Console Setup
- [ ] Create app listing
- [ ] Upload APK or AAB file
- [ ] Add app screenshots
- [ ] Add app description:
  ```
  English: "Calculate fuel and electricity costs for your vehicle. 
  Store vehicle details and trip history locally. Based on 
  Israeli government vehicle data."
  
  Hebrew: "חשב עלויות דלק וחשמל לרכב שלך. אחסן פרטי רכב 
  והיסטוריה בהתקן בלבד. מבוסס על נתוני רכבים ממשלתיים."
  ```

### Data Safety Declaration
- [ ] Fill all fields in Data Safety section (see above)
- [ ] Upload screenshots showing:
  - [x] Privacy Policy available in settings
  - [x] Legal screen on first launch
  - [x] Local data storage only

### Pricing & Distribution
- [ ] Price: Free ✓
- [ ] Countries: Select at least "Israel" ✓
- [ ] Content rating: Complete questionnaire

### Final Review
- [ ] All permissions justified:
  - Internet: For API calls only
  - Read/Write Storage: For AsyncStorage
- [ ] No intrusive ads
- [ ] No malware/security issues
- [ ] Complies with all policies

---

## 📝 Legal Copy-Paste For Submission

### Privacy Policy Statement
**Use this text in Google Play:**

```
Our app collects vehicle license plates, vehicle details 
(make/model/year), and trip calculation history. All data 
is stored exclusively on your device using local storage. 
We do not transmit, share, or sell any personal data to 
third parties. You can delete any data at any time. 
For full details, see our Privacy Policy.
```

### Terms of Service Statement
**Use this text in Google Play:**

```
Calculations provided by this app are estimates only. 
Fuel consumption and costs may vary based on driving 
conditions and market prices. We are not responsible 
for decisions based on app data. Vehicle data is provided 
by the Israeli government database (data.gov.il) and may 
not be current. For full details, see our Terms of Service.
```

---

## ✋ Things NOT to Do

❌ Do NOT claim real-time fuel price updates if you don't provide them  
❌ Do NOT ask for permissions you don't use  
❌ Do NOT transmit location data  
❌ Do NOT track users across apps  
❌ Do NOT change privacy policy after launch without notifying users  
❌ Do NOT ignore user deletion requests  
❌ Do NOT hide legal documents  
❌ Do NOT claim data encryption if not actually encrypted  

---

## 📞 Support & Contact Info

**For Google Play issues:**
1. Keep support email updated: `[your-email@domain.com]`
2. Respond to policy violation notices within 7 days
3. Have someone review compliance before resubmission

**For user questions:**
- Add "Help & Feedback" link in settings
- Point to Privacy Policy for data questions
- Point to Terms for calculation accuracy questions

---

## 🎯 Final Submission Steps

1. **Verify all documents are hosted:**
   ```
   [ ] Privacy Policy URL works
   [ ] Terms of Service URL works
   [ ] Both accessible without login
   [ ] Both in Hebrew and English
   ```

2. **Test in-app legal screen:**
   ```
   [ ] First launch shows acceptance dialog
   [ ] All tabs work (Privacy, Terms, About)
   [ ] Language toggle works
   [ ] Checkbox works
   [ ] Accept button saves preference
   ```

3. **Complete Google Play submission:**
   ```
   [ ] All required fields filled
   [ ] Data Safety section completed
   [ ] Privacy/Terms URLs added
   [ ] Screenshots uploaded
   [ ] Description is accurate
   [ ] Content rating selected
   ```

4. **Before hitting "Submit":**
   ```
   [ ] Review all text for typos
   [ ] Verify no forbidden permissions
   [ ] Test app one more time
   [ ] Check file sizes (APK/AAB)
   [ ] Confirm you own all assets used
   ```

5. **Submit and wait:**
   ```
   Google typically reviews within 2-4 hours for updates,
   24 hours for new apps. Be patient for approval.
   ```

---

## 🏆 Success Criteria

Your app is ready for Google Play when:

✅ Privacy Policy is live and accessible  
✅ Terms of Service is live and accessible  
✅ All disclaimers are in-app (estimates only)  
✅ Data Safety section is 100% filled  
✅ Legal screen shows on first launch  
✅ All text is clear and accurate  
✅ No misleading claims about features  
✅ No hidden permissions  
✅ Data is actually stored locally only  

---

**Good luck with your submission! 🚀**

*For questions about Google Play policies, visit:*  
https://support.google.com/googleplay/android-developer

*For Israeli compliance questions, refer to:*  
https://data.gov.il (data usage terms)
