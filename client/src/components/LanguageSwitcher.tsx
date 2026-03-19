import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

interface LanguageOption {
    code: string;
    label: string;
    flag: string;
}

const LANGUAGES: LanguageOption[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'my', label: 'မြန်မာ', flag: '🇲🇲' },
];

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    const handleChange = useCallback((langCode: string) => {
        i18n.changeLanguage(langCode);
        setIsOpen(false);
    }, [i18n]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="language-switcher" ref={dropdownRef}>
            <button
                className="lang-trigger"
                onClick={() => setIsOpen(prev => !prev)}
                aria-label="Switch language"
                aria-expanded={isOpen}
            >
                <span className="lang-flag">{currentLang.flag}</span>
                <span className="lang-code">{currentLang.code.toUpperCase()}</span>
                <svg className={`lang-chevron ${isOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {isOpen && (
                <ul className="lang-dropdown" role="listbox">
                    {LANGUAGES.map(lang => (
                        <li
                            key={lang.code}
                            role="option"
                            aria-selected={lang.code === currentLang.code}
                            className={`lang-option ${lang.code === currentLang.code ? 'active' : ''}`}
                            onClick={() => handleChange(lang.code)}
                        >
                            <span className="lang-flag">{lang.flag}</span>
                            <span className="lang-label">{lang.label}</span>
                            {lang.code === currentLang.code && (
                                <svg className="lang-check" width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M3.5 7L6 9.5L10.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LanguageSwitcher;
