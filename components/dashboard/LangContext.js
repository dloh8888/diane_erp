'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createT } from '../../lib/dashboard/i18n';

const STORAGE_KEY = 'dalim-erp-lang';

const LangCtx = createContext({ lang: 'ko', t: (s) => s, setLang: () => {} });

export function useLang() {
  return useContext(LangCtx);
}

/**
 * 한글/영문 전환.
 * 고른 언어는 브라우저에 기억해 두어서, 새로고침해도 그대로 유지됩니다.
 * (서버에서 그린 화면과 어긋나지 않도록, 저장된 값은 화면이 뜬 뒤에 읽습니다)
 */
export function LangProvider({ children }) {
  const [lang, setLangState] = useState('ko');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ko') setLangState(saved);
    } catch (e) {
      // 브라우저가 저장을 막아둔 경우엔 그냥 기본값(한글)으로 씁니다
    }
  }, []);

  function setLang(next) {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      /* 저장 못 해도 이번 화면에서는 바뀝니다 */
    }
  }

  return (
    <LangCtx.Provider value={{ lang, t: createT(lang), setLang }}>
      {children}
    </LangCtx.Provider>
  );
}

/** 헤더에 넣는 KO / EN 전환 버튼 */
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex border border-gray-200 rounded-md overflow-hidden" role="group" aria-label="Language">
      {['ko', 'en'].map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={
            'text-[11px] font-semibold tracking-wide px-2.5 py-1 ' +
            (lang === code
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-400 hover:text-gray-900 hover:bg-gray-50') +
            (code === 'en' ? ' border-l border-gray-200' : '')
          }
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
