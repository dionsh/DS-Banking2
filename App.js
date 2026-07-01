import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';

import StackNavigation from './src/navigation/StackNavigation';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { CurrencyProvider } from './src/currency/CurrencyContext';

// Builds the React Navigation theme from our palette so the navigator background
// matches the app theme (prevents white flashes between screens in dark mode).
function Root() {
  const { isDark, colors } = useTheme();

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {/* The header bar is always midnight blue, so light status-bar content
          works in both themes. */}
      <StatusBar style="light" />
      {/* Hyrja Kryesore dmth eshte Stack Navigatori */}
      <StackNavigation />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <Root />
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
