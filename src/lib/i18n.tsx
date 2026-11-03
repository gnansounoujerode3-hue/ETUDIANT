"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { dicts, type Lang } from "./i18n-dictionaries";

export type Dict = (typeof dicts)["fr"];

interface I18nValue {
  lang: Lang;
  d: Dict;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  initialLang = "fr",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("voxa_lang", l);
      document.cookie = `voxa_lang=${l};path=/;max-age=31536000;SameSite=Lax`;
    } catch {
      /* ignore */
    }
  };
  return (
    <I18nContext.Provider value={{ lang, d: dicts[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
