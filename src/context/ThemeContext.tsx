import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
  } from "react";
  
  type Theme = "light" | "dark";
  
  interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
  }
  
  const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
  
  interface ThemeProviderProps {
    children: ReactNode;
  }
  
  function getInitialTheme(): Theme {
    try {
      const savedTheme = localStorage.getItem("campus-tech-hub-theme");
  
      if (savedTheme === "light" || savedTheme === "dark") {
        return savedTheme;
      }
    } catch {
      // If browser storage is unavailable, use the default theme.
    }
  
    return "light";
  }
  
  export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
  
    useEffect(() => {
      const root = document.documentElement;
  
      root.classList.toggle("dark", theme === "dark");
      root.style.colorScheme = theme;
  
      try {
        localStorage.setItem("campus-tech-hub-theme", theme);
      } catch {
        // The application can still function without persistent storage.
      }
    }, [theme]);
  
    function toggleTheme() {
      setTheme((currentTheme) =>
        currentTheme === "light" ? "dark" : "light",
      );
    }
  
    return (
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  }
  
  export function useTheme() {
    const context = useContext(ThemeContext);
  
    if (!context) {
      throw new Error("useTheme must be used inside ThemeProvider");
    }
  
    return context;
  }