import { Text, View } from 'react-native';
import type { FlightLeg } from '../data/trips';
import { theme } from '../theme/theme';

type ConnectedLegsProps = {
  legs: FlightLeg[];
  compact?: boolean;
};

const airportTimezones: Record<string, string> = {
  YVR: 'PDT',
  YHU: 'EDT',
  YOW: 'EDT',
  YYC: 'MDT',
  HND: 'JST',
  SIN: 'SGT',
  BKK: 'ICT',
  NRT: 'JST',
  CNX: 'ICT',
  HAN: 'ICT',
  SGN: 'ICT',
};

function formatDateTimeWithTimezone(date: string, time: string, airportCode: string): string {
  const timezone = airportTimezones[airportCode];
  return timezone ? `${date}, ${time} ${timezone}` : `${date}, ${time}`;
}

const monthMap: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function parseDateTime(date: string, time: string): Date {
  const [monthToken, dayToken] = date.split(' ');
  const [hourToken, minuteToken] = time.split(':');

  const month = monthMap[monthToken];
  const day = Number(dayToken);
  const hour = Number(hourToken);
  const minute = Number(minuteToken);

  if (
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    month === undefined
  ) {
    throw new Error('Invalid date/time');
  }

  return new Date(2026, month, day, hour, minute, 0, 0);
}

function formatDuration(milliseconds: number): string | undefined {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return undefined;
  }

  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0 && minutes <= 0) {
    return undefined;
  }

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function getLayoverDuration(currentLeg: FlightLeg, nextLeg: FlightLeg): string | undefined {
  try {
    const arrival = parseDateTime(currentLeg.arrivalDate, currentLeg.arrivalTime);
    const departure = parseDateTime(nextLeg.departureDate, nextLeg.departureTime);
    return formatDuration(departure.getTime() - arrival.getTime());
  } catch {
    return undefined;
  }
}

function InfoRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: isLast ? 0 : 0.5,
        borderColor: theme.colors.cardBorder,
      }}
    >
      <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>{label}</Text>
      <Text style={{ ...theme.typography.body, color: theme.colors.textPrimary, textAlign: 'right', marginLeft: theme.spacing.lg }}>
        {value}
      </Text>
    </View>
  );
}

export function ConnectedLegs({ legs, compact = false }: ConnectedLegsProps) {
  if (!legs.length) {
    return null;
  }

  return (
    <View>
      {legs.map((leg, index) => {
        const isLast = index === legs.length - 1;
        const nextLeg = isLast ? undefined : legs[index + 1];
        const layoverDuration = nextLeg ? getLayoverDuration(leg, nextLeg) : undefined;

        return (
          <View key={`${leg.flightNumber}-${index}`}>
            <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: theme.colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{index + 1}</Text>
                </View>

                {!isLast ? (
                  <View
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 12,
                      backgroundColor: theme.colors.accent,
                      opacity: 0.25,
                    }}
                  />
                ) : null}
              </View>

              <View style={{ flex: 1, marginLeft: 10, paddingBottom: isLast ? 0 : 14 }}>
                {compact ? (
                  <>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary }}>
                      {`${leg.fromCity} → ${leg.toCity}`}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>{leg.flightNumber}</Text>

                      <View
                        style={{
                          width: 3,
                          height: 3,
                          borderRadius: 1.5,
                          backgroundColor: theme.colors.textMuted,
                          marginHorizontal: 6,
                        }}
                      />

                      <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>
                        {`${leg.departureDate}, ${leg.departureTime}`}
                      </Text>

                      {leg.duration ? (
                        <>
                          <View
                            style={{
                              width: 3,
                              height: 3,
                              borderRadius: 1.5,
                              backgroundColor: theme.colors.textMuted,
                              marginHorizontal: 6,
                            }}
                          />
                          <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>{leg.duration}</Text>
                        </>
                      ) : null}
                    </View>
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '600',
                        color: theme.colors.textPrimary,
                        marginBottom: 6,
                      }}
                    >
                      {`${leg.fromCity} (${leg.fromCode}) → ${leg.toCity} (${leg.toCode})`}
                    </Text>

                    <InfoRow label="Flight" value={leg.flightNumber} />
                    <InfoRow
                      label="Departs"
                      value={formatDateTimeWithTimezone(leg.departureDate, leg.departureTime, leg.fromCode)}
                    />
                    <InfoRow
                      label="Arrives"
                      value={formatDateTimeWithTimezone(leg.arrivalDate, leg.arrivalTime, leg.toCode)}
                      isLast={!leg.duration}
                    />
                    {leg.duration ? <InfoRow label="Duration" value={leg.duration} isLast={true} /> : null}
                  </>
                )}
              </View>
            </View>

            {!isLast && nextLeg ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 28, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 2,
                      height: 8,
                      backgroundColor: theme.colors.accent,
                      opacity: 0.25,
                    }}
                  />
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: theme.colors.accent,
                      backgroundColor: theme.colors.backgroundGradientStart,
                      marginTop: -2,
                      marginBottom: 2,
                    }}
                  />
                  <View
                    style={{
                      width: 2,
                      height: 8,
                      backgroundColor: theme.colors.accent,
                      opacity: 0.25,
                    }}
                  />
                </View>

                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: theme.colors.textMuted,
                      fontStyle: 'italic',
                    }}
                  >
                    {layoverDuration
                      ? `Layover in ${leg.toCity} · ${layoverDuration}`
                      : `Layover in ${leg.toCity}`}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
