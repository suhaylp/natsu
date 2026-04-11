import { Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme/theme';

type PassengerBubbleProps = {
  name: string;
  seat?: string;
  onPress?: () => void;
};

export function PassengerBubble({ name, seat, onPress }: PassengerBubbleProps) {
  const content = (
    <View
      style={{
        backgroundColor: theme.colors.accentLight,
        borderRadius: theme.radii.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.accent }}>{name}</Text>
        {seat ? (
          <Text style={{ fontSize: 11, fontWeight: '400', color: theme.colors.textSecondary }}>{`  ${seat}`}</Text>
        ) : null}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
