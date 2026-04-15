import { Circle, G, Text as SvgText } from 'react-native-svg';
import type { MapPinVariant } from './types';

type PinMarkerProps = {
  x: number;
  y: number;
  variant: MapPinVariant;
  icon: string;
  count?: number;
  selected?: boolean;
  onPress?: () => void;
};

const colors = {
  dark: '#1e3d2f',
  medium: '#4f7a66',
  white: '#ffffff',
  ring: '#a9c2b2',
};

export function PinMarker({ x, y, variant, icon, count, selected = false, onPress }: PinMarkerProps) {
  const radius = variant === 'cluster' ? 11 : 8;
  const fill = variant === 'idea' ? colors.medium : colors.dark;

  return (
    <G onPress={onPress}>
      {selected ? <Circle cx={x} cy={y} r={radius + 3.6} fill={colors.ring} opacity={0.48} /> : null}
      <Circle cx={x} cy={y} r={radius} fill={fill} stroke={colors.white} strokeWidth={1.6} />
      {variant === 'cluster' ? (
        <SvgText x={x} y={y + 3.2} fill={colors.white} textAnchor="middle" fontSize="8" fontWeight="700">
          {String(count ?? 0)}
        </SvgText>
      ) : (
        <SvgText x={x} y={y + 3.2} fill={colors.white} textAnchor="middle" fontSize="9" fontWeight="700">
          {icon}
        </SvgText>
      )}
    </G>
  );
}
