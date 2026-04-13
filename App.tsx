// ── App.tsx ──
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TripsDataProvider } from './src/data/TripsDataContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <TripsDataProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </TripsDataProvider>
    </SafeAreaProvider>
  );
}
