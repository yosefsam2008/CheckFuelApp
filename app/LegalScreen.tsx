// Legal info: terms, privacy and data sources, in the calculator's design language.
import { router } from 'expo-router';
import { Calculator, ChevronDown, Database, ExternalLink, Fuel, Mail, MapPin, ShieldCheck, Smartphone, TriangleAlert, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HeroHeader } from '../components/calculator/HeroHeader';
import { PressableScale } from '../components/calculator/PressableScale';
import { SlidingSegment } from '../components/calculator/SlidingSegment';
import { colors, Heebo, radius, shadow, space } from '../constants/theme';
import { Block, BriefIcon, CONTACT_EMAIL, LEGAL_DOCS, LEGAL_UPDATED, LegalTab, OPERATOR } from '../legal/LEGAL_CONTENT_HE';
import { PRIVACY_POLICY_URL } from '../legal/LEGAL_UI_STRINGS_HE';

const TABS: { value: LegalTab; label: string }[] = [
  { value: 'terms', label: 'תנאי שימוש' },
  { value: 'privacy', label: 'פרטיות' },
  { value: 'sources', label: 'מקורות' },
];

const ICONS: Record<BriefIcon, typeof Calculator> = {
  calc: Calculator, warn: TriangleAlert, shield: ShieldCheck, phone: Smartphone, pin: MapPin, trash: Trash2, db: Database, fuel: Fuel,
};

function Body({ blocks }: { blocks: Block[] }) {
  return (
    <View style={styles.body}>
      {blocks.map((b, i) =>
        typeof b === 'string' ? (
          <Text key={i} style={styles.p}>{b}</Text>
        ) : 'note' in b ? (
          <Text key={i} style={styles.note}>{b.note}</Text>
        ) : (
          <View key={i} style={{ gap: 6 }}>
            {b.bullets.map((t) => (
              <View key={t} style={styles.bulletRow}>
                <View style={styles.dot} />
                <Text style={[styles.p, { flex: 1 }]}>{t}</Text>
              </View>
            ))}
          </View>
        ),
      )}
    </View>
  );
}

function Row({ title, blocks, open, onToggle, first }: { title: string; blocks: Block[]; open: boolean; onToggle: () => void; first: boolean }) {
  return (
    <View style={!first && styles.divider}>
      <Pressable onPress={onToggle} style={styles.rowHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <ChevronDown size={18} color={colors.textMuted} strokeWidth={2.2} style={open && { transform: [{ rotate: '180deg' }] }} />
      </Pressable>
      {open && <Body blocks={blocks} />}
    </View>
  );
}

export default function LegalScreen({ onClose, initialTab = 'terms' }: { onClose?: () => void; initialTab?: LegalTab }) {
  const [tab, setTab] = useState<LegalTab>(initialTab);
  const [open, setOpen] = useState(0);
  const doc = LEGAL_DOCS[tab];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* opened from the info menu (onClose) or as a route */}
        <HeroHeader onInfo={() => {}} onBack={onClose ?? router.back} title="מידע משפטי" subtitle={`עודכן לאחרונה ב־${LEGAL_UPDATED}`} />

        <View style={[styles.card, styles.first]}>
          <View style={{ padding: 16 }}>
            <SlidingSegment
              accessibilityLabel="מסמך"
              height={36}
              options={TABS}
              value={tab}
              onChange={(t) => {
                setTab(t);
                setOpen(0);
              }}
            />
          </View>
          <Text style={styles.briefLabel}>בקצרה</Text>
          {doc.brief.map((b, i) => {
            const Icon = ICONS[b.icon];
            const warn = b.icon === 'warn';
            return (
              <View key={b.title} style={[styles.brief, i > 0 && styles.divider]}>
                <View style={[styles.icon, warn && { backgroundColor: colors.warnBg }]}>
                  <Icon size={18} color={warn ? colors.warnText : colors.selectedText} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.briefTitle}>{b.title}</Text>
                  <Text style={styles.briefText}>{b.text}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          {doc.sections.map((s, i) => (
            <Row key={`${tab}-${s.title}`} title={s.title} blocks={s.body} first={i === 0} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </View>

        <View style={styles.card}>
          <PressableScale style={styles.link} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=CheckFuel`)} accessibilityRole="link" accessibilityLabel={`שליחת מייל ל־${CONTACT_EMAIL}`}>
            <View style={[styles.icon, { backgroundColor: colors.infoBg }]}>
              <Mail size={18} color={colors.infoText} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.briefTitle}>שאלות או טעות בנתונים?</Text>
              <Text style={styles.briefText}>{CONTACT_EMAIL}</Text>
            </View>
          </PressableScale>
          <PressableScale style={[styles.link, styles.divider]} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} accessibilityRole="link">
            <View style={[styles.icon, { backgroundColor: colors.infoBg }]}>
              <ExternalLink size={18} color={colors.infoText} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.briefTitle}>מדיניות הפרטיות המלאה</Text>
              <Text style={styles.briefText}>באתר, בעברית ובאנגלית</Text>
            </View>
          </PressableScale>
        </View>

        <Text style={styles.foot}>CheckFuel · {OPERATOR}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, marginHorizontal: space.gutter, marginTop: space.cardGap, overflow: 'hidden', ...shadow.card },
  first: { marginTop: -44, zIndex: 2 },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  briefLabel: { fontFamily: Heebo.bold, fontSize: 13, color: colors.textMuted, paddingHorizontal: 20, paddingBottom: 4 },
  brief: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, marginHorizontal: 20 },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  briefTitle: { fontFamily: Heebo.extra, fontSize: 15, color: colors.text },
  briefText: { fontFamily: Heebo.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, paddingVertical: 12, paddingHorizontal: 20 },
  rowTitle: { flex: 1, fontFamily: Heebo.extra, fontSize: 16, color: colors.text },
  body: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  p: { fontFamily: Heebo.regular, fontSize: 15, lineHeight: 23, color: colors.text },
  note: { fontFamily: Heebo.medium, fontSize: 14, lineHeight: 21, color: colors.infoText, backgroundColor: colors.infoBg, borderRadius: radius.tile, padding: 12, overflow: 'hidden' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textMuted, marginTop: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, paddingHorizontal: 20 },
  foot: { fontFamily: Heebo.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 20 },
});
