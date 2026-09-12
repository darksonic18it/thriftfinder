import React from 'react';
import { Moon, Sun } from 'lucide-react';

import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      role="switch"
      aria-checked={theme === 'dark'}
      data-theme={theme}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__knob" aria-hidden="true">
          <Sun className="theme-toggle__icon theme-toggle__icon--sun" size={14} />
          <Moon className="theme-toggle__icon theme-toggle__icon--moon" size={14} />
        </span>
      </span>
    </button>
  );
};

export default ThemeToggle;
