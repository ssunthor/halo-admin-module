import { createContext } from 'react';

const ThemeContext = createContext({
  themeMode: 'dark',
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export default ThemeContext;