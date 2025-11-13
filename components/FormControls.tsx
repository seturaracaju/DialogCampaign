import React from 'react';
import SparklesIcon from './icons/SparklesIcon';
import { ai } from '../lib/gemini';

export const InputField = ({ label, type = 'text', value, onChange, placeholder, helpText }: { label: string, type?: string, value: string | null | undefined, onChange: (val: string) => void, placeholder?: string, helpText?: string }) => (
    <div>
        <label className="text-sm font-medium text-[#A1A1AA]">{label}</label>
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full mt-2 px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]" />
        {helpText && <p className="text-xs text-[#A1A1AA] mt-2">{helpText}</p>}
    </div>
);

export const DatalistInputField = ({ label, value, onChange, options, helpText }: { label: string, value: string | null | undefined, onChange: (val: string) => void, options: string[], helpText?: string }) => {
    const listId = `datalist-${label.replace(/\s+/g, '-')}`;
    return (
        <div>
            <label className="text-sm font-medium text-[#A1A1AA]">{label}</label>
            <input 
                type="text" 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                list={listId}
                className="w-full mt-2 px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]" 
            />
             <datalist id={listId}>
                {options.map(option => <option key={option} value={option} />)}
            </datalist>
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