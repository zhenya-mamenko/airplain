import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import translations from '@/constants/translations.json';

export const useLocale = () => getLocales()[0]?.languageTag ?? 'en-US';

const i18n = new I18n(translations);
i18n.missingTranslation.register(
  'return',
  (_i18n, scope, options) => scope as string,
);
i18n.missingBehavior = 'return';
i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = useLocale().split('-')[0];

export default i18n.t.bind(i18n);
