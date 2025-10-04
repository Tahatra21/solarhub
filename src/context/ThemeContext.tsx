"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light";

type ThemeContextType = {
  theme: Theme;
  isDarkMode: boolean; // Add missing isDarkMode property
  toggleTheme?: () => void; // Optional untuk backward compatibility
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const theme: Theme = "light"; // Selalu light theme
  const isDarkMode = false; // Always false since theme is always light
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag to true after hydration
    setIsClient(true);
    
    // Only manipulate DOM after hydration is complete
    if (typeof window !== 'undefined') {
      // Pastikan dark class tidak pernah ditambahkan
      document.documentElement.classList.remove("dark");
      // Hapus theme dari localStorage
      localStorage.removeItem("theme");
    }
  }, []);

  // toggleTheme tidak melakukan apa-apa, hanya untuk compatibility
  const toggleTheme = () => {
    // Tidak melakukan apa-apa - theme selalu light
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
