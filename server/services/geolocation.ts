
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

  // Validate that a string is a known 2-letter country code
  private static isValidCountryCode(code: string): boolean {
    return /^[A-Z]{2}$/.test(code) && code in this.countryLanguageMap;
  }

  // Validate that an IP address is a valid public IPv4 (not private, not loopback)
  private static isValidPublicIp(ip: string): boolean {
    // Strip IPv6 prefix if present
    const cleanIp = ip.replace(/^::ffff:/, '');
    const ipv4Match = cleanIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!ipv4Match) return false;

    const [, a, b] = ipv4Match.map(Number);
    // Exclude private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    return true;
  }

  static async detectLocation(req: any): Promise<LocationInfo> {
    try {
      let countryCode = 'US'; // Default

      // 1. Check Cloudflare header (only trusted behind Cloudflare proxy)
      const cfCountry = (req.headers['cf-ipcountry'] as string)?.toUpperCase();
      if (cfCountry && this.isValidCountryCode(cfCountry)) {
        countryCode = cfCountry;
      }

      // 2. Check X-Country header (only trusted behind known proxy)
      else {
        const xCountry = (req.headers['x-country'] as string)?.toUpperCase();
        if (xCountry && this.isValidCountryCode(xCountry)) {
          countryCode = xCountry;
        }

        // 3. Check Accept-Language header
        else if (req.headers['accept-language']) {
          const acceptLanguage = req.headers['accept-language'];

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
      }

      // 4. As last resort, detect by IP using HTTPS geolocation service
      if (countryCode === 'US' && req.ip && req.ip !== '127.0.0.1' && req.ip !== '::1') {
        const cleanIp = req.ip.replace(/^::ffff:/, '');
        if (this.isValidPublicIp(cleanIp)) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(
              `https://ipapi.co/${cleanIp}/country/`,
              {
                signal: controller.signal,
                headers: { 'User-Agent': 'PretorAI/1.0' },
              }
            );
            clearTimeout(timeoutId);
            const data = (await response.text()).trim().toUpperCase();
            if (this.isValidCountryCode(data)) {
              countryCode = data;
            }
          } catch (error) {
            // Geolocation failed — continue with default
          }
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
