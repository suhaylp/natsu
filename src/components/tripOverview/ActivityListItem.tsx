import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StopActivity } from './types';

type ActivityListItemProps = {
  activity: StopActivity;
  onPress: () => void;
};

const colors = {
  text: '#f2f8f4',
  muted: '#98b7a7',
  border: 'rgba(164, 194, 177, 0.28)',
  rowBg: 'rgba(11, 32, 24, 0.42)',
  confirmed: '#58b084',
  idea: '#81b39a',
};

export function ActivityListItem({ activity, onPress }: ActivityListItemProps) {
  const statusLabel = activity.status === 'booked' ? 'confirmed' : 'idea';
  const metaParts = [
    activity.dateLabel,
    activity.timeLabel,
    activity.priceLabel,
    activity.refLabel ? `Ref ${activity.refLabel}` : undefined,
  ].filter(Boolean);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Text style={styles.iconText}>{activity.status === 'booked' ? activity.icon : '★'}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {activity.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {metaParts.join(' · ') || 'No extra details'}
        </Text>
      </View>

      <View
        style={[
          styles.badge,
          { backgroundColor: activity.status === 'booked' ? colors.confirmed : colors.idea },
        ]}
      >
        <Text style={styles.badgeText}>{statusLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.rowBg,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#0f241a',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});
