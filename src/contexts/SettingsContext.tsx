import React, { createContext, useContext, useState, useEffect } from 'react';

type FontSize = 'small' | 'medium' | 'large';
type LineHeight = 'tight' | 'normal' | 'loose';

interface SettingsContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  lineHeight: LineHeight;
  setLineHeight: (height: LineHeight) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem('nreader_fontSize') as FontSize) || 'medium';
  });
  
  const [lineHeight, setLineHeight] = useState<LineHeight>(() => {
    return (localStorage.getItem('nreader_lineHeight') as LineHeight) || 'normal';
  });

  useEffect(() => {
    localStorage.setItem('nreader_fontSize', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('nreader_lineHeight', lineHeight);
  }, [lineHeight]);

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize, lineHeight, setLineHeight }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
