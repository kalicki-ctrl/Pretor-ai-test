
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getTranslation, type Translations } from '@/lib/translations';

interface LanguageContextType {
  language: string;
  translations: Translations;
  setLanguage: (language: string) => void;
  detectedLocation: {
    country: string;
    countryCode: string;
    language: string;
    timezone: string;
  } | null;
  isDetecting: boolean;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>('en-US');
  const [translations, setTranslations] = useState<Translations>(getTranslation('en-US'));
  const [detectedLocation, setDetectedLocation] = useState<any>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(true);

  const VALID_LANGUAGES = new Set(['en-US', 'pt-BR', 'es-ES', 'fr-FR', 'zh-CN', 'ja-JP', 'de-DE', 'it-IT', 'ru-RU', 'ko-KR', 'nl-NL']);

  useEffect(() => {
    // Verificar se há uma preferência salva no localStorage primeiro
    const savedLanguage = localStorage.getItem('preferredLanguage');

    // Se não houver preferência salva, detectar automaticamente
    if (!savedLanguage || !VALID_LANGUAGES.has(savedLanguage)) {
      detectLocationAndSetLanguage();
    } else {
      // Usar a preferência salva mas ainda detectar localização para referência
      setLanguage(savedLanguage);
      setIsDetecting(false);

      // Detectar localização em background para referência
      detectLocationAndSetLanguage(false);
    }
  }, []);

  const detectLocationAndSetLanguage = async (shouldSetLanguage = true) => {
    try {
      setIsDetecting(true);
      const response = await fetch('/api/detect-location');
      const locationData = await response.json();
      
      if (locationData.success) {
        setDetectedLocation(locationData.location);
        
        // Só definir o idioma automaticamente se não houver preferência salva
        if (shouldSetLanguage) {
          setLanguage(locationData.location.language);
        }
      }
    } catch (error) {
      console.error('Failed to detect location:', error);
      
      // Fallback para detecção do navegador apenas se deve definir o idioma
      if (shouldSetLanguage) {
        const browserLang = navigator.language || navigator.languages?.[0] || 'en-US';
        
        if (browserLang.startsWith('pt')) {
          setLanguage('pt-BR');
        } else if (browserLang.startsWith('es')) {
          setLanguage('es-ES');
        } else if (browserLang.startsWith('fr')) {
          setLanguage('fr-FR');
        } else if (browserLang.startsWith('de')) {
          setLanguage('de-DE');
        } else {
          setLanguage('en-US');
        }
        
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const ALLOWED_LANG_CODES = new Set(['en', 'pt', 'es', 'fr', 'de', 'it', 'zh', 'ja', 'ru', 'ko', 'nl']);

  const setLanguage = (newLanguage: string) => {
    const newTranslations = getTranslation(newLanguage);
    setTranslations(newTranslations);
    setLanguageState(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);

    const langCode = newLanguage.split('-')[0].toLowerCase();
    if (ALLOWED_LANG_CODES.has(langCode)) {
      document.documentElement.lang = langCode;
    }
  };

  useEffect(() => {
    setTranslations(getTranslation(language));
  }, [language]);

  return (
    <LanguageContext.Provider value={{
      language,
      translations,
      setLanguage,
      detectedLocation,
      isDetecting
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
