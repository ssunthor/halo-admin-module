import { createContext } from 'react';

const ThemeContext = createContext({
  themeMode: 'dark',
  userThemeMode: 'dark',
  toggleTheme: () => {},
  setThemeMode: () => {},
  availableThemes: [],
  isHalloween: false,
  seasonalEvent: null,
});

export default ThemeContext;
