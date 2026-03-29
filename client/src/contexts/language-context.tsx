
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

  useEffect(() => {
    // Verificar se há uma preferência salva no localStorage primeiro
    const savedLanguage = localStorage.getItem('preferredLanguage');
    
    // Se não houver preferência salva, detectar automaticamente
    if (!savedLanguage) {
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
          console.log(`🌍 Localização detectada: ${locationData.location.country} (${locationData.location.countryCode}) - Idioma: ${locationData.location.language}`);
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
        
        console.log(`🌐 Usando detecção do navegador: ${browserLang} -> idioma definido`);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const setLanguage = (newLanguage: string) => {
    console.log(`🔄 Alterando idioma para: ${newLanguage}`);
    
    // Forçar atualização das traduções
    const newTranslations = getTranslation(newLanguage);
    setTranslations(newTranslations);
    
    // Atualizar o estado do idioma
    setLanguageState(newLanguage);
    
    // Salvar preferência no localStorage
    localStorage.setItem('preferredLanguage', newLanguage);
    
    // Atualizar meta tags da página
    document.documentElement.lang = newLanguage.split('-')[0];
    
    console.log(`✅ Idioma definido como: ${newLanguage}`);
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
