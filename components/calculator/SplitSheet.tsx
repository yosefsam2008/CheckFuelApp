// "חלק עם הנוסעים": pick how many people share the trip, see each share live, send it. Local math only, no API.
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Share2 } from 'lucide-react-native';
import React, { RefObject, useCallback, useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import { LTR } from '../../constants/rtl';
import { colors, Heebo, radius } from '../../constants/theme';
import { formatShare, splitMessage } from '../../lib/format';
import { PassengerStepper } from './PassengerStepper';
import { PressableScale } from './PressableScale';
import { SlidingDigits } from './SlidingDigits';

interface Props {
  sheetRef: RefObject<BottomSheetModal | null>;
  total: number;
  km: number; // total, after round trip
  roundTrip: boolean;
  from: string; // empty in manual-distance mode
  to: string;
  initialCount: number;
  /** optional image of the result card; RN Share attaches it on iOS only */
  capture?: () => Promise<string | undefined>;
}

export function SplitSheet({ sheetRef, initialCount, capture, ...trip }: Props) {
  const [n, setN] = useState(initialCount);
  const perPerson = formatShare(trip.total, n);
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />,
    [],
  );

  const share = async () => {
    const message = splitMessage(trip, n);
    const url = Platform.OS === 'ios' ? await capture?.().catch(() => undefined) : undefined;
    await Share.share(url ? { message, url } : { message }).catch(() => {});
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      stackBehavior="push"
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
      onChange={(i) => i >= 0 && setN(initialCount)}
    >
      <BottomSheetView style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          חלק עם הנוסעים
        </Text>
        <PassengerStepper count={n} onChange={setN} />
        <View style={styles.result} accessible accessibilityLabel={`${perPerson} שקלים לכל אחד`} accessibilityLiveRegion="polite">
          <Text style={styles.label}>לכל אחד, מעוגל לחצי שקל</Text>
          <View {...LTR.props} style={styles.amount}>
            <SlidingDigits prefix="₪" value={perPerson} fontSize={34} color={colors.selectedText} fontFamily={Heebo.black} />
          </View>
        </View>
        <PressableScale style={styles.share} onPress={share} accessibilityRole="button">
          <Share2 size={18} color={colors.white} strokeWidth={2} />
          <Text style={styles.shareText}>שלח לנוסעים</Text>
        </PressableScale>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { backgroundColor: colors.divider, width: 40, height: 4 },
  body: { padding: 16, paddingBottom: 32, gap: 12 },
  title: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text, paddingHorizontal: 4 },
  result: { backgroundColor: colors.selectedFill, borderRadius: 18, padding: 16 },
  label: { fontFamily: Heebo.medium, fontSize: 13, color: colors.selectedText },
  amount: { flexDirection: 'row', ...LTR.style, alignSelf: 'flex-start', marginTop: 2 },
  share: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: radius.pill, backgroundColor: colors.brandGreen },
  shareText: { fontFamily: Heebo.extra, fontSize: 16, color: colors.white },
});
