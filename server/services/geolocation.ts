
interface LocationInfo {
  country: string;
  countryCode: string;
  language: string;
  timezone: string;
}

export class GeolocationService {
  // Mapeamento de países para idiomas
  private static countryLanguageMap: Record<string, string> = {
    // Países de língua portuguesa
    'BR': 'pt-BR',
    'PT': 'pt-BR',
    'AO': 'pt-BR',
    'MZ': 'pt-BR',
    'GW': 'pt-BR',
    'CV': 'pt-BR',
    'ST': 'pt-BR',
    'TL': 'pt-BR',
    
    // Países de língua inglesa
    'US': 'en-US',
    'GB': 'en-US',
    'CA': 'en-US',
    'AU': 'en-US',
    'NZ': 'en-US',
    'IE': 'en-US',
    'ZA': 'en-US',
    'IN': 'en-US',
    'SG': 'en-US',
    'MY': 'en-US',
    'PH': 'en-US',
    'NG': 'en-US',
    'KE': 'en-US',
    'GH': 'en-US',
    'ZW': 'en-US',
    'UG': 'en-US',
    'TZ': 'en-US',
    'JM': 'en-US',
    'BZ': 'en-US',
    'GY': 'en-US',
    'AG': 'en-US',
    'BS': 'en-US',
    'BB': 'en-US',
    'BM': 'en-US',
    'VG': 'en-US',
    'GI': 'en-US',
    'MT': 'en-US',
    
    // Países de língua espanhola
    'ES': 'es-ES',
    'MX': 'es-ES',
    'AR': 'es-ES',
    'CL': 'es-ES',
    'CO': 'es-ES',
    'PE': 'es-ES',
    'VE': 'es-ES',
    'EC': 'es-ES',
    'BO': 'es-ES',
    'PY': 'es-ES',
    'UY': 'es-ES',
    'CR': 'es-ES',
    'PA': 'es-ES',
    'NI': 'es-ES',
    'HN': 'es-ES',
    'GT': 'es-ES',
    'SV': 'es-ES',
    'DO': 'es-ES',
    'CU': 'es-ES',
    'PR': 'es-ES',
    'GQ': 'es-ES',
    
    // Países de língua francesa
    'FR': 'fr-FR',
    'BE': 'fr-FR',
    'CH': 'fr-FR',
    'LU': 'fr-FR',
    'MC': 'fr-FR',
    'CI': 'fr-FR',
    'SN': 'fr-FR',
    'ML': 'fr-FR',
    'BF': 'fr-FR',
    'NE': 'fr-FR',
    'TD': 'fr-FR',
    'CF': 'fr-FR',
    'CG': 'fr-FR',
    'CD': 'fr-FR',
    'GA': 'fr-FR',
    'CM': 'fr-FR',
    'MG': 'fr-FR',
    'RE': 'fr-FR',
    'GP': 'fr-FR',
    'MQ': 'fr-FR',
    'GF': 'fr-FR',
    'NC': 'fr-FR',
    'PF': 'fr-FR',
    'YT': 'fr-FR',
    'WF': 'fr-FR',
    'PM': 'fr-FR',
    'BL': 'fr-FR',
    'MF': 'fr-FR',
    
    // Países de língua alemã
    'DE': 'de-DE',
    'AT': 'de-DE',
    'LI': 'de-DE',
    
    // Países de língua italiana
    'IT': 'it-IT',
    'SM': 'it-IT',
    'VA': 'it-IT',
    
    // Países de língua chinesa
    'CN': 'zh-CN',
    'TW': 'zh-CN',
    'HK': 'zh-CN',
    'MO': 'zh-CN',
    
    // Países de língua japonesa
    'JP': 'ja-JP',
    
    // Outros idiomas principais
    'RU': 'ru-RU',
    'KR': 'ko-KR',
    'NL': 'nl-NL'
  };

  static async detectLocation(req: any): Promise<LocationInfo> {
    try {
      // Tentar várias fontes para detectar a localização
      let countryCode = 'US'; // Default
      
      // 1. Verificar headers do Cloudflare (se disponível)
      if (req.headers['cf-ipcountry']) {
        countryCode = req.headers['cf-ipcountry'].toUpperCase();
      }
      
      // 2. Verificar header X-Country (alguns proxies)
      else if (req.headers['x-country']) {
        countryCode = req.headers['x-country'].toUpperCase();
      }
      
      // 3. Verificar Accept-Language header
      else if (req.headers['accept-language']) {
        const acceptLanguage = req.headers['accept-language'];
        
        // Detectar idioma preferido do browser
        if (acceptLanguage.includes('pt-BR') || acceptLanguage.includes('pt')) {
          countryCode = 'BR';
        } else if (acceptLanguage.includes('es')) {
          countryCode = 'ES';
        } else if (acceptLanguage.includes('fr')) {
          countryCode = 'FR';
        } else if (acceptLanguage.includes('de')) {
          countryCode = 'DE';
        } else if (acceptLanguage.includes('it')) {
          countryCode = 'IT';
        } else if (acceptLanguage.includes('ru')) {
          countryCode = 'RU';
        } else if (acceptLanguage.includes('zh')) {
          countryCode = 'CN';
        } else if (acceptLanguage.includes('ja')) {
          countryCode = 'JP';
        } else if (acceptLanguage.includes('ko')) {
          countryCode = 'KR';
        } else if (acceptLanguage.includes('hi')) {
          countryCode = 'IN';
        } else if (acceptLanguage.includes('nl')) {
          countryCode = 'NL';
        }
      }

      // 4. Como último recurso, tentar detectar pelo IP usando um serviço gratuito
      if (countryCode === 'US' && req.ip && req.ip !== '127.0.0.1' && req.ip !== '::1') {
        try {
          const response = await fetch(`http://ip-api.com/json/${req.ip}?fields=countryCode`);
          const data = await response.json();
          if (data.countryCode) {
            countryCode = data.countryCode.toUpperCase();
          }
        } catch (error) {
          console.log('IP geolocation failed, using default');
        }
      }

      const language = this.countryLanguageMap[countryCode] || 'en-US';
      
      return {
        country: this.getCountryName(countryCode),
        countryCode,
        language,
        timezone: this.getTimezone(countryCode)
      };
    } catch (error) {
      // Fallback para inglês em caso de erro
      console.error('Geolocation detection error:', error);
      return {
        country: 'United States',
        countryCode: 'US',
        language: 'en-US',
        timezone: 'America/New_York'
      };
    }
  }

  private static getCountryName(code: string): string {
    const countryNames: Record<string, string> = {
      'BR': 'Brasil',
      'US': 'United States',
      'ES': 'España',
      'FR': 'France',
      'DE': 'Deutschland',
      'IT': 'Italia',
      'PT': 'Portugal',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'MX': 'México',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'PE': 'Perú'
    };
    return countryNames[code] || 'Unknown';
  }

  private static getTimezone(code: string): string {
    const timezones: Record<string, string> = {
      'BR': 'America/Sao_Paulo',
      'US': 'America/New_York',
      'ES': 'Europe/Madrid',
      'FR': 'Europe/Paris',
      'DE': 'Europe/Berlin',
      'IT': 'Europe/Rome',
      'PT': 'Europe/Lisbon',
      'GB': 'Europe/London',
      'CA': 'America/Toronto',
      'AU': 'Australia/Sydney',
      'MX': 'America/Mexico_City',
      'AR': 'America/Buenos_Aires',
      'CL': 'America/Santiago',
      'CO': 'America/Bogota',
      'PE': 'America/Lima'
    };
    return timezones[code] || 'UTC';
  }
}
