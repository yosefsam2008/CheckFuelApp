// app/UserGuideScreen.tsx - Comprehensive User Guide with Tab Navigation
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Unified Lucide Icons
import {
  Target,
  Car,
  Calculator,
  BarChart3,
  Fuel,
  Rocket,
  Smartphone,
  Search,
  PenTool,
  Ruler,
  TrendingUp,
  DollarSign,
  Trash2,
  ChevronDown,
  ChevronLeft,
  X,
  Lightbulb,
  AlertTriangle,
  Info,
  Map,
  History,
  CheckCircle2,
  Table
} from 'lucide-react-native';

interface UserGuideScreenProps {
  onClose: () => void;
}

type TabType = 'basics' | 'vehicles' | 'calculations' | 'history';

interface SectionProps {
  title: string;
  content?: React.ReactNode;
  iconNode?: React.ReactNode;
  children?: React.ReactNode;
}

const Colors = {
  primary: '#009688',
  primaryLight: '#26a69a',
  primaryDark: '#00796b',
  accent: '#00897b',
  background: '#f5f9f8',
  card: '#ffffff',
  cardBorder: 'rgba(0, 150, 136, 0.1)',
  textDark: '#1a2e2a',
  textGray: '#5a6f6b',
  textLight: 'rgba(255, 255, 255, 0.9)',
  shadow: 'rgba(0, 150, 136, 0.15)',
};

const Section: React.FC<SectionProps> = ({ title, content, iconNode, children }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionIconWrapper}>{iconNode}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.expandIconWrapper}>
          {expanded ? <ChevronDown size={14} color={Colors.primary} /> : <ChevronLeft size={14} color={Colors.primary} />}
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.sectionContent}>
          {content || children}
        </View>
      )}
    </View>
  );
};

const InfoBox: React.FC<{ children: React.ReactNode; type?: 'tip' | 'warning' | 'info' }> = ({
  children,
  type = 'info'
}) => {
  const bgColors = {
    tip: '#e8f5e9',
    warning: '#fff3e0',
    info: '#e0f7fa',
  };
  const borderColors = {
    tip: '#4caf50',
    warning: '#ff9800',
    info: '#00bcd4',
  };

  const renderIcon = () => {
    switch (type) {
      case 'tip': return <Lightbulb size={20} color={borderColors.tip} />;
      case 'warning': return <AlertTriangle size={20} color={borderColors.warning} />;
      default: return <Info size={20} color={borderColors.info} />;
    }
  };

  return (
    <View style={[styles.infoBox, { backgroundColor: bgColors[type], borderColor: borderColors[type] }]}>
      <View style={styles.infoIconWrapper}>{renderIcon()}</View>
      <View style={styles.infoContent}>
        {children}
      </View>
    </View>
  );
};

const StepItem: React.FC<{ number: number; text: string }> = ({ number, text }) => (
  <View style={styles.stepItem}>
    <View style={styles.stepNumber}>
      <Text style={styles.stepNumberText}>{number}</Text>
    </View>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

export default function UserGuideScreen({ onClose }: UserGuideScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('basics');

  const tabs = [
    { id: 'basics' as TabType, label: 'בסיסי', iconNode: <Target size={18} color={activeTab === 'basics' ? '#fff' : Colors.textDark} /> },
    { id: 'vehicles' as TabType, label: 'רכבים', iconNode: <Car size={18} color={activeTab === 'vehicles' ? '#fff' : Colors.textDark} /> },
    { id: 'calculations' as TabType, label: 'חישובים', iconNode: <Calculator size={18} color={activeTab === 'calculations' ? '#fff' : Colors.textDark} /> },
    { id: 'history' as TabType, label: 'היסטוריה', iconNode: <BarChart3 size={18} color={activeTab === 'history' ? '#fff' : Colors.textDark} /> },
  ];

  const renderBasicsContent = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Section title="על האפליקציה" iconNode={<Fuel size={22} color={Colors.primary} />}>
        <Text style={styles.contentText}>
          CheckFuel עוזרת לך לחשב עלויות דלק ולנהל רכבים בקלות.
        </Text>
        <Text style={styles.contentText}>
          • חישוב מדויק של עלות נסיעה{'\n'}
          • מעקב אחר הוצאות דלק{'\n'}
          • השוואה בין רכבים
        </Text>
      </Section>

      <Section title="מתחילים" iconNode={<Rocket size={22} color={Colors.primary} />}>
        <StepItem number={1} text='הוסף רכב בלשונית "רכבים"' />
        <StepItem number={2} text='הזן צריכת דלק (ק״מ/ליטר)' />
        <StepItem number={3} text='חשב עלות נסיעה ב"מחשבון"' />

        <InfoBox type="tip">
          <Text style={styles.infoText}>
            <Text style={styles.boldText}>טיפ:</Text> יש לך לוחית רישוי? ההוספה תהיה אוטומטית!
          </Text>
        </InfoBox>
      </Section>

      <Section title="לשוניות ראשיות" iconNode={<Smartphone size={22} color={Colors.primary} />}>
        <Text style={styles.contentText}>
          • <Text style={styles.boldText}>לוח בקרה</Text> - סיכום כללי{'\n'}
          • <Text style={styles.boldText}>רכבים</Text> - ניהול הרכבים שלך{'\n'}
          • <Text style={styles.boldText}>מחשבון</Text> - חישוב עלות נסיעה{'\n'}
          • <Text style={styles.boldText}>היסטוריה</Text> - מעקב אחר נסיעות
        </Text>
      </Section>
    </ScrollView>
  );

  const renderVehiclesContent = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Section title="הוספה לפי לוחית רישוי" iconNode={<Search size={22} color={Colors.primary} />}>
        <StepItem number={1} text='לחץ "הוסף לפי לוחית רישוי"' />
        <StepItem number={2} text='הזן מספר לוחית (7-8 ספרות)' />
        <StepItem number={3} text='המתן לטעינת הפרטים' />
        <StepItem number={4} text='הזן צריכת דלק ושמור' />

        <InfoBox type="warning">
          <Text style={styles.infoText}>
            <Text style={styles.boldText}>שים לב:</Text> בדוק את צריכת הדלק המוצעת - היא לא תמיד מדויקת.
          </Text>
        </InfoBox>
      </Section>

      <Section title="הוספה ידנית" iconNode={<PenTool size={22} color={Colors.primary} />}>
        <StepItem number={1} text='לחץ "הוסף ידני"' />
        <StepItem number={2} text='בחר סוג דלק (בנזין/סולר/חשמל)' />
        <StepItem number={3} text='הזן שם, דגם וצריכת דלק' />
        <StepItem number={4} text='שמור את הרכב' />
      </Section>

      <Section title="צריכת דלק - איך מזינים?" iconNode={<Ruler size={22} color={Colors.primary} />}>
        <Text style={styles.contentText}>
          <Text style={styles.boldText}>בנזין/סולר:</Text> כמה ק״מ לליטר{'\n'}
          דוגמה: רכב שעושה 15 ק״מ/ליטר → הזן 15
        </Text>

        <Text style={styles.contentText}>
          <Text style={styles.boldText}>חשמלי:</Text> כמה ק״מ לאחוז סוללה{'\n'}
          דוגמה: טווח 400 ק״מ → הזן 4 (400÷100)
        </Text>

        <InfoBox type="tip">
          <Text style={styles.infoText}>
            מצא את הצריכה במדריך הרכב או חשב לפי מילויים קודמים.
          </Text>
        </InfoBox>
      </Section>

      <Section title="עריכה ומחיקה" iconNode={<PenTool size={22} color={Colors.primary} />}>
        <Text style={styles.contentText}>
          <Text style={styles.boldText}>עריכה:</Text> לחץ על הרכב → ערוך → שמור
        </Text>
        <Text style={styles.contentText}>
          <Text style={styles.boldText}>מחיקה:</Text> לחץ על הרכב → מחק → אשר
        </Text>

        <InfoBox type="warning">
          <Text style={styles.infoText}>
            <Text style={styles.boldText}>זהירות:</Text> מחיקה היא בלתי הפיכה! האפליקציה תשאל אותך לפני המחיקה.
          </Text>
        </InfoBox>
      </Section>
    </ScrollView>
  );

  const renderCalculationsContent = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Section title="איך מחשבים?" iconNode={<Calculator size={22} color={Colors.primary} />}>
        <StepItem number={1} text='בחר רכב מהרשימה' />
        <StepItem number={2} text='הזן מרחק (בק״מ)' />
        <StepItem number={3} text='לחץ "חשב עלות"' />
        <StepItem number={4} text='שמור נסיעה להיסטוריה (אופציונלי)' />
      </Section>

      <Section title="התוצאות שתקבל" iconNode={<TrendingUp size={22} color={Colors.primary} />}>
        <View style={styles.resultItem}>
          <View style={styles.resultIconWrapper}><DollarSign size={20} color={Colors.primary} /></View>
          <View style={styles.resultContent}>
            <Text style={styles.resultTitle}>עלות כוללת</Text>
            <Text style={styles.resultDesc}>
              כמה תשלם על הדלק (מרחק ÷ צריכה × מחיר)
            </Text>
          </View>
        </View>

        <View style={styles.resultItem}>
          <View style={styles.resultIconWrapper}><Fuel size={20} color={Colors.primary} /></View>
          <View style={styles.resultContent}>
            <Text style={styles.resultTitle}>צריכת דלק</Text>
            <Text style={styles.resultDesc}>
              כמות ליטרים או אחוזי סוללה שתצרוך
            </Text>
          </View>
        </View>

        <View style={styles.resultItem}>
          <View style={styles.resultIconWrapper}><BarChart3 size={20} color={Colors.primary} /></View>
          <View style={styles.resultContent}>
            <Text style={styles.resultTitle}>עלות לק״מ</Text>
            <Text style={styles.resultDesc}>
              שימושי להשוואה בין רכבים
            </Text>
          </View>
        </View>

        <InfoBox type="tip">
          <Text style={styles.infoText}>
            השתמש בעלות לק״מ כדי לבחור את הרכב החסכוני ביותר!
          </Text>
        </InfoBox>
      </Section>

      <Section title="דוגמאות" iconNode={<Lightbulb size={22} color={Colors.primary} />}>
        <Text style={styles.contentText}>
          <Text style={styles.boldText}>בנזין:</Text> 100 ק״מ ב-12 ק״מ/ליטר{'\n'}
          → 8.33 ליטר × 6.5 ₪ = 54 ₪
        </Text>

        <Text style={styles.contentText}>
          <Text style={styles.boldText}>חשמל:</Text> 150 ק״מ ב-5 ק״מ/אחוז{'\n'}
          → 30% סוללה = 36 ₪
        </Text>
      </Section>

      <Section title="מחירי דלק" iconNode={<DollarSign size={22} color={Colors.primary} />}>
        <Text style={styles.contentText}>
          • מחירים עדכניים (95, 98, סולר){'\n'}
          • ממוצע ארצי - המחיר בתחנה עשוי להשתנות{'\n'}
        </Text>
      </Section>
    </ScrollView>
  );

  const renderHistoryContent = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Section title="מה מוצג בהיסטוריה?" iconNode={<History size={22} color={Colors.primary} />}>
        <Text style={styles.contentText}>
          • תאריך ושעה{'\n'}
          • רכב (שם ודגם){'\n'}
          • מרחק ועלות{'\n'}
          • צריכת דלק{'\n'}
          • עלות לק״מ
        </Text>

        <InfoBox type="info">
          <Text style={styles.infoText}>
            המידע נשמר במכשיר שלך באופן מקומי ובטוח.
          </Text>
        </InfoBox>
      </Section>

      <Section title="סטטיסטיקות" iconNode={<BarChart3 size={22} color={Colors.primary} />}>
        <Text style={styles.contentText}>
          בראש המסך תראה סיכום:
        </Text>

        <View style={styles.statExample}>
          <TrendingUp size={18} color={Colors.primary} />
          <Text style={styles.statExampleText}>
            <Text style={styles.boldText}>סה״כ נסיעות</Text>
          </Text>
        </View>

        <View style={styles.statExample}>
          <Map size={18} color={Colors.primary} />
          <Text style={styles.statExampleText}>
            <Text style={styles.boldText}>סה״כ מרחק</Text>
          </Text>
        </View>

        <View style={styles.statExample}>
          <DollarSign size={18} color={Colors.primary} />
          <Text style={styles.statExampleText}>
            <Text style={styles.boldText}>סה״כ עלות</Text>
          </Text>
        </View>

        <View style={styles.statExample}>
          <Target size={18} color={Colors.primary} />
          <Text style={styles.statExampleText}>
            <Text style={styles.boldText}>ממוצע לק״מ</Text>
          </Text>
        </View>
      </Section>

      <Section title="מחיקת נסיעה" iconNode={<Trash2 size={22} color={Colors.primary} />}>
        <StepItem number={1} text='לחץ על נסיעה ברשימה' />
        <StepItem number={2} text='לחץ "מחק"' />
        <StepItem number={3} text='אשר מחיקה' />

        <InfoBox type="warning">
          <Text style={styles.infoText}>
            <Text style={styles.boldText}>שים לב:</Text> מחיקה היא בלתי הפיכה!
          </Text>
        </InfoBox>
      </Section>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'basics': return renderBasicsContent();
      case 'vehicles': return renderVehiclesContent();
      case 'calculations': return renderCalculationsContent();
      case 'history': return renderHistoryContent();
      default: return renderBasicsContent();
    }
  };

  return (
    <View style={[styles.container, { direction: 'ltr', paddingBottom: insets.bottom }]}>
      {/* Header */}
      <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
        <Text style={styles.headerTitle}>מדריך שימוש</Text>
        <Text style={styles.headerSubtitle}>מדריך מהיר ויעיל לשימוש באפליקציה</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              {tab.iconNode}
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
    writingDirection: 'rtl',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    gap: 8,
  },
  tab: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  activeTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  activeTabLabel: {
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    gap: 12,
  },
  sectionIconWrapper: {
    width: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  expandIconWrapper: {
    width: 14,
    alignItems: 'center',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textDark,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.primary,
  },
  infoBox: {
    flexDirection: 'row-reverse',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginVertical: 8,
  },
  infoIconWrapper: {
    paddingTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textDark,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  stepItem: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingTop: 4,
  },
  resultItem: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  resultIconWrapper: {
    paddingTop: 2,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  resultDesc: {
    fontSize: 13,
    color: Colors.textGray,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  statExample: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  statExampleText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textDark,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});