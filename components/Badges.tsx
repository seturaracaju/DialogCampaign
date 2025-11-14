
import React from 'react';
import { Lead } from '../types';

export const TagBadge = ({ children }: { children?: React.ReactNode }) => (
  <span className="px-2.5 py-1 text-xs font-medium bg-[#2a2a2a] text-[#A1A1AA] rounded-md whitespace-nowrap">{children}</span>
);

export const StatusBadge = ({ status }: { status: Lead['status'] }) => {
  const styles = {
    'active': 'bg-green-800/50 text-green-300',
    'inactive': 'bg-red-800/50 text-red-300',
    'Novo Lead': 'bg-blue-800/50 text-blue-300',
    'Atendimento Humano': 'bg-purple-800/50 text-purple-300',
    'Em Atendimento': 'bg-indigo-800/50 text-indigo-300',
    'Campanha MKT': 'bg-pink-800/50 text-pink-300',
    'App Download': 'bg-teal-800/50 text-teal-300',
  };
  const statusKey = status || 'inactive';
  const effectiveStatus = statusKey in styles ? statusKey as keyof typeof styles : 'inactive';

  return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${styles[effectiveStatus]}`}>{status || 'N/A'}</span>;
};