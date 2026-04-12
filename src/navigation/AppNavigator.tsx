// ── navigation/AppNavigator.tsx ──
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import { ComingSoonScreen } from '../screens/ComingSoonScreen';
import { FlightDetailScreen } from '../screens/FlightDetailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';
import { TripsScreen } from '../screens/TripsScreen';

export type RootStackParamList = {
  Home: undefined;
  Trips: undefined;
  TripDetail: { tripId: string };
  FlightDetail: { tripId: string; flightId: string };
  ComingSoon: { title: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Trips" component={TripsScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="FlightDetail" component={FlightDetailScreen} />
      <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
    </Stack.Navigator>
  );
}
