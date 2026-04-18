import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityListItem } from './ActivityListItem';
import type { MapPin, StopActivity, TripViewMode } from './types';

type BottomSheetProps = {
  viewMode: TripViewMode;
  selectedPin: MapPin | null;
  selectedActivity: StopActivity | null;
  onBackToOverview: () => void;
  onActivityPress: (activity: StopActivity) => void;
  onOpenActivity: (activity: StopActivity) => void;
};

const colors = {
  sheet: '#f3f9f5',
  text: '#1f4735',
  muted: '#5e7c6d',
  badgeBooked: '#77ba97',
  badgeIdea: '#b8dcc8',
  outline: '#c6ddd0',
  chipBg: '#e4f0e9',
  pageBg: '#ffffff',
};

export function BottomSheet({
  viewMode,
  selectedPin,
  selectedActivity,
  onBackToOverview,
  onActivityPress,
  onOpenActivity,
}: BottomSheetProps) {
  const [pageWidth, setPageWidth] = useState(0);
  const horizontalRef = useRef<ScrollView | null>(null);
  const sortedActivities = useMemo(
    () => [...(selectedPin?.activities ?? [])].sort((a, b) => a.order - b.order),
    [selectedPin?.activities]
  );
  const resolvedActivity = selectedActivity ?? sortedActivities[0] ?? null;
  const selectedIndex = Math.max(
    0,
    resolvedActivity ? sortedActivities.findIndex((activity) => activity.id === resolvedActivity.id) : 0
  );

  useEffect(() => {
    if (!selectedPin || !horizontalRef.current || pageWidth <= 0) {
      return;
    }

    horizontalRef.current.scrollTo({ x: pageWidth * selectedIndex, animated: true });
  }, [pageWidth, selectedIndex, selectedPin?.id]);

  if (!selectedPin) {
    return (
      <View style={styles.sheet}>
        <Text style={styles.emptyText}>Tap a stop to see trip details.</Text>
      </View>
    );
  }

  if (viewMode === 'drilldown') {
    return (
      <View style={styles.sheet}>
        <View style={styles.drilldownHeaderRow}>
          <View>
            <Text style={styles.title}>{selectedPin.title}</Text>
            <Text style={styles.subtitle}>{`${sortedActivities.length} activities`}</Text>
          </View>
          <Pressable style={styles.overviewChip} onPress={onBackToOverview}>
            <Text style={styles.overviewChipText}>Overview</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ marginTop: 8 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
          showsVerticalScrollIndicator={false}
        >
          {sortedActivities.map((activity) => (
            <ActivityListItem key={activity.id} activity={activity} onPress={() => onOpenActivity(activity)} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!resolvedActivity) {
    return (
      <View style={styles.sheet}>
        <Text style={styles.emptyText}>No activity selected.</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.sheet}
      onLayout={(event) => {
        const nextWidth = Math.max(1, Math.floor(event.nativeEvent.layout.width - 24));
        setPageWidth(nextWidth);
      }}
    >
      <Text style={styles.pinTitle} numberOfLines={1}>
        {selectedPin.title}
      </Text>

      <ScrollView
        ref={horizontalRef}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={styles.carousel}
        contentContainerStyle={{ paddingRight: 6 }}
        onMomentumScrollEnd={(event) => {
          if (pageWidth <= 0) {
            return;
          }

          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
          const nextActivity = sortedActivities[nextIndex];
          if (nextActivity) {
            onActivityPress(nextActivity);
          }
        }}
      >
        {sortedActivities.map((activity) => {
          const statusLabel = activity.status === 'booked' ? 'booked' : 'idea';
          const subtitle = [
            [activity.city, activity.country].filter(Boolean).join(', '),
            [activity.dateLabel, activity.timeLabel].filter(Boolean).join(' '),
            activity.priceLabel ?? (activity.refLabel ? `Ref ${activity.refLabel}` : undefined),
          ]
            .filter(Boolean)
            .join(' · ');

          const addressPillLabel = activity.addressLabel ?? 'Address unavailable';
          const refPillLabel = activity.refLabel ? `Ref ${activity.refLabel}` : 'Ref unavailable';

          return (
            <Pressable key={activity.id} style={[styles.page, { width: pageWidth || 320 }]} onPress={() => onOpenActivity(activity)}>
              <View style={styles.headerRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {`${activity.icon} ${activity.name}`}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: activity.status === 'booked' ? colors.badgeBooked : colors.badgeIdea },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{statusLabel}</Text>
                </View>
              </View>

              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle || selectedPin.title}
              </Text>

              <View style={styles.metaPillRow}>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText} numberOfLines={1}>
                    {addressPillLabel}
                  </Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText} numberOfLines={1}>
                    {refPillLabel}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.swipeHint}>{`${selectedIndex + 1}/${sortedActivities.length} • swipe`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(30,61,47,0.12)',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 10,
  },
  pinTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  carousel: {
    marginTop: 2,
  },
  page: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.pageBg,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginRight: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  drilldownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  statusBadgeText: {
    color: '#1a3d2d',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 5,
  },
  metaPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 9,
  },
  metaPill: {
    backgroundColor: colors.chipBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
  },
  metaPillText: {
    color: '#365b49',
    fontSize: 11,
    fontWeight: '600',
  },
  swipeHint: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 1,
  },
  overviewChip: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  overviewChipText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});
