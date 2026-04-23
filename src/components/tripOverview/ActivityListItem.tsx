import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StopActivity } from './types';
import { theme } from '../../theme/theme';

type ActivityListItemProps = {
  activity: StopActivity;
  onPress: () => void;
};

const colors = {
  text: theme.colors.textPrimary,
  muted: theme.colors.textSecondary,
  border: theme.colors.separator,
  rowBg: theme.colors.backgroundSecondary,
  booked: theme.colors.statusBooked,
  idea: theme.colors.statusIdea,
};

function withCurrencyLabel(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  const upper = normalized.toUpperCase();
  if (/(USD|CAD|EUR|GBP|JPY|THB|VND|SGD)/.test(upper)) {
    return normalized;
  }
  if (normalized.includes('$')) {
    return `USD ${normalized}`;
  }
  if (normalized.includes('€')) {
    return `EUR ${normalized}`;
  }
  if (normalized.includes('£')) {
    return `GBP ${normalized}`;
  }
  if (normalized.includes('¥')) {
    return `JPY ${normalized}`;
  }
  return `${normalized} (currency)`;
}

export function ActivityListItem({ activity, onPress }: ActivityListItemProps) {
  const statusLabel = activity.status === 'booked' ? 'booked' : 'idea';
  const metaParts = [
    activity.dateLabel,
    activity.timeLabel,
    withCurrencyLabel(activity.priceLabel),
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
          { backgroundColor: activity.status === 'booked' ? colors.booked : colors.idea },
        ]}
      >
        <Text style={[styles.badgeText, { color: activity.status === 'booked' ? '#FFFFFF' : theme.colors.textSecondary }]}>
          {statusLabel}
        </Text>
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
    backgroundColor: theme.colors.stub,
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
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});
