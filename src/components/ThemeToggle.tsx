import { useTheme } from "../context/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span aria-hidden="true">{isDark ? "☀" : "☾"}</span>
    </button>
  );
}

export default ThemeToggle;