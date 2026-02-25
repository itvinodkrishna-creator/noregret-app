import React, { createContext, useContext, ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';

export const lightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  primary: '#6366F1',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E5E5',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const darkTheme = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  card: '#252525',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  primary: '#818CF8',
  secondary: '#A78BFA',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  border: '#333333',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { preferences, updatePreferences } = useAppStore();
  const isDark = preferences.darkMode;
  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = async () => {
    await updatePreferences({ darkMode: !isDark });
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
