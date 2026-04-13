// ── navigation/AppNavigator.tsx ──
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import { ComingSoonScreen } from '../screens/ComingSoonScreen';
import { FlightDetailScreen } from '../screens/FlightDetailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MoneyStuffScreen } from '../screens/MoneyStuffScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';
import { TripsScreen } from '../screens/TripsScreen';
import { UpcomingFunScreen } from '../screens/UpcomingFunScreen';

export type RootStackParamList = {
  Home: undefined;
  Trips: undefined;
  TripDetail: { tripId: string };
  FlightDetail: { tripId: string; flightId: string };
  ComingSoon: { title: string };
  MoneyStuff: undefined;
  UpcomingFun: undefined;
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
      <Stack.Screen name="MoneyStuff" component={MoneyStuffScreen} />
      <Stack.Screen name="UpcomingFun" component={UpcomingFunScreen} />
    </Stack.Navigator>
  );
}
