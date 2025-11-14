import React, { useState, useEffect, useRef } from 'react';
import SparklesIcon from './icons/SparklesIcon';
import { ai } from '../lib/gemini';

export const InputField = ({ label, type = 'text', value, onChange, placeholder, helpText }: { label: string, type?: string, value: string | null | undefined, onChange: (val: string) => void, placeholder?: string, helpText?: string }) => (
    <div>
        <label className="text-sm font-medium text-[#A1A1AA]">{label}</label>
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full mt-2 px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]" />
        {helpText && <p className="text-xs text-[#A1A1AA] mt-2">{helpText}</p>}
    </div>
);

export const DatalistInputField = ({ label, value, onChange, options, helpText }: { label:string, value: string | null | undefined, onChange: (val: string) => void, options: string[], helpText?: string }) => {
    const [showOptions, setShowOptions] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentVal = value || '';
        if (currentVal) {
            setFilteredOptions(
                options.filter(option =>
                    option.toLowerCase().includes(currentVal.toLowerCase())
                )
            );
        } else {
            setFilteredOptions(options);
        }
    }, [value, options]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    const handleSelectOption = (option: string) => {
        onChange(option);
        setShowOptions(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="text-sm font-medium text-[#A1A1AA]">{label}</label>
            <input 
                type="text" 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                onFocus={() => setShowOptions(true)}
                autoComplete="off"
                className="w-full mt-2 px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]" 
            />
            {showOptions && filteredOptions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <ul className="py-1">
                        {filteredOptions.map(option => (
                            <li 
                                key={option} 
                                onClick={() => handleSelectOption(option)}
                                className="px-4 py-2 text-sm text-gray-300 cursor-pointer hover:bg-[#D99B54] hover:text-black"
                            >
                                {option}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {helpText && <p className="text-xs text-[#A1A1AA] mt-2">{helpText}</p>}
        </div>
    );
};


export const TextAreaField = ({ label, value, onChange, rows = 3, onGenerate }: { label: string, value: string | null | undefined, onChange: (val: string) => void, rows?: number, onGenerate?: () => void }) => (
    <div>
        <div className="flex justify-between items-center">
             <label className="text-sm font-medium text-[#A1A1AA]">{label}</label>
             {onGenerate && ai && (
                 <button type="button" onClick={onGenerate} className="text-xs flex items-center gap-1.5 px-2 py-1 bg-[#2a2a2a] text-[#D99B54] rounded-md hover:bg-[#3a3a3a] transition-colors">
                    <SparklesIcon className="w-3 h-3" />
                    Gerar com IA
                </button>
             )}
        </div>
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} className="w-full mt-2 px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]" />
    </div>
);

export const SelectField = ({ label, value, onChange, options }: { label: string, value: string | null | undefined, onChange: (val: string) => void, options: {value: string, label: string}[] }) => (
    <div>
        <label className="text-sm font-medium text-[#A1A1AA]">{label}</label>
        <select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full mt-2 px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]">
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

// New CustomSelect component to fix the flickering issue
export const CustomSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: { value: string, label: string }[], placeholder: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full sm:w-auto" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-left text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54] text-sm"
            >
                <span className={selectedOption ? 'text-white' : 'text-gray-400'}>
                    {selectedOption?.label || placeholder}
                </span>
                <svg className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-[#2a2a2a] border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <ul className="py-1">
                        <li
                            onClick={() => handleSelect('')}
                            className="px-4 py-2 text-sm text-gray-300 cursor-pointer hover:bg-[#D99B54] hover:text-black"
                        >
                            {placeholder}
                        </li>
                        {options.map(opt => (
                            <li
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className="px-4 py-2 text-sm text-gray-300 cursor-pointer hover:bg-[#D99B54] hover:text-black"
                            >
                                {opt.label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
