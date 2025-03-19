import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import translations from '@/constants/translations.json';

const i18n = new I18n(translations);
i18n.missingTranslation.register('return', (_i18n, scope, options) => scope as string);
i18n.missingBehavior = 'return';
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

const l = getLocales();
i18n.locale = l[0]?.languageCode ?? 'en';

export const useLocale = () => l[0]?.languageTag ?? 'en-US';

const t = i18n.t.bind(i18n);
export default t;
