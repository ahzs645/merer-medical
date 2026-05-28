import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  arabicTranslations,
  getInterfaceLanguageDirection,
  InterfaceLanguage,
  INTERFACE_LANGUAGE_STORAGE_KEY,
} from '../i18n/translations';

type InterfaceLanguageContextType = {
  language: InterfaceLanguage;
  setLanguage: (language: InterfaceLanguage) => void;
  t: (text: string) => string;
};

const translatableAttributes = ['aria-label', 'placeholder', 'title', 'alt'];
const originalTextByNode = new WeakMap<Text, string>();
const originalAttributesByElement = new WeakMap<
  Element,
  Partial<Record<string, string>>
>();

const InterfaceLanguageContext =
  React.createContext<InterfaceLanguageContextType>({
    language: 'en',
    setLanguage: () => undefined,
    t: (text) => text,
  });

function readStoredLanguage(): InterfaceLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const storedLanguage = window.localStorage.getItem(
    INTERFACE_LANGUAGE_STORAGE_KEY,
  );

  return storedLanguage === 'ar' ? 'ar' : 'en';
}

function translateText(text: string, language: InterfaceLanguage) {
  if (language !== 'ar') {
    return text;
  }

  const leadingWhitespace = text.match(/^\s*/)?.[0] ?? '';
  const trailingWhitespace = text.match(/\s*$/)?.[0] ?? '';
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  const translatedText = arabicTranslations[normalizedText];

  return translatedText
    ? `${leadingWhitespace}${translatedText}${trailingWhitespace}`
    : text;
}

function translateElementText(root: ParentNode, language: InterfaceLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;

      if (
        !parent ||
        ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName) ||
        parent.closest('[data-i18n-skip]')
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      return node.textContent?.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes: Text[] = [];
  let node = walker.nextNode();

  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }

  nodes.forEach((textNode) => {
    const currentText = textNode.textContent ?? '';
    const originalText = originalTextByNode.get(textNode) ?? currentText;

    if (language === 'en') {
      if (originalTextByNode.has(textNode) && currentText !== originalText) {
        textNode.textContent = originalText;
      }
      return;
    }

    const translatedText = translateText(originalText, language);
    if (translatedText !== currentText) {
      originalTextByNode.set(textNode, originalText);
      textNode.textContent = translatedText;
    }
  });
}

function translateElementAttributes(
  root: ParentNode,
  language: InterfaceLanguage,
) {
  const elements =
    root instanceof Element
      ? [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
      : Array.from(root.querySelectorAll<HTMLElement>('*'));

  elements.forEach((element) => {
    translatableAttributes.forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (!value) {
        return;
      }

      const originalAttributes = originalAttributesByElement.get(element) ?? {};
      const originalValue = originalAttributes[attribute] ?? value;

      if (language === 'en') {
        if (originalAttributes[attribute] && value !== originalValue) {
          element.setAttribute(attribute, originalValue);
        }
        return;
      }

      const translatedValue = translateText(originalValue, language);
      if (translatedValue !== value) {
        originalAttributesByElement.set(element, {
          ...originalAttributes,
          [attribute]: originalValue,
        });
        element.setAttribute(attribute, translatedValue);
      }
    });
  });
}

function translateRenderedInterface(language: InterfaceLanguage) {
  if (typeof document === 'undefined') {
    return;
  }

  translateElementText(document.body, language);
  translateElementAttributes(document.body, language);
}

export function InterfaceLanguageProvider({
  children,
}: PropsWithChildren<unknown>) {
  const [language, setLanguageState] = useState<InterfaceLanguage>(() =>
    readStoredLanguage(),
  );

  const setLanguage = useCallback((nextLanguage: InterfaceLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(INTERFACE_LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const t = useCallback(
    (text: string) => translateText(text, language),
    [language],
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = getInterfaceLanguageDirection(language);
    document.body.dir = getInterfaceLanguageDirection(language);

    translateRenderedInterface(language);

    if (language !== 'ar') {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text;
            textNode.textContent = translateText(
              textNode.textContent ?? '',
              language,
            );
          } else if (node instanceof Element) {
            translateElementText(node, language);
            translateElementAttributes(node, language);
          }
        });

        if (
          mutation.type === 'attributes' &&
          mutation.target instanceof Element
        ) {
          translateElementAttributes(mutation.target, language);
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-label', 'placeholder', 'title', 'alt'],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return (
    <InterfaceLanguageContext.Provider value={value}>
      {children}
    </InterfaceLanguageContext.Provider>
  );
}

export function useInterfaceLanguage() {
  return useContext(InterfaceLanguageContext);
}
