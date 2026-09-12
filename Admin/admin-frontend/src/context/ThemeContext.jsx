import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('acrovix_admin_theme');
        return savedTheme || 'light';
    });

    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.classList.remove('light');
        }
        localStorage.setItem('acrovix_admin_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
