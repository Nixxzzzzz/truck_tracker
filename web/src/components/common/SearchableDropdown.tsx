import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  searchText?: string;
}

interface SearchableDropdownProps {
  options: DropdownOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  emptyLabel = 'No results found',
  multiple = false,
  disabled = false,
  required = false,
  className = 'form-select'
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedSet = new Set(selectedValues);
  const normalizedQuery = query.trim().toLowerCase();

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [options]
  );
  const filteredOptions = sortedOptions.filter((option) =>
    `${option.label} ${option.searchText || ''}`.toLowerCase().includes(normalizedQuery)
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getDisplayValue = () => {
    if (selectedValues.length === 0) return placeholder;
    const selectedLabels = sortedOptions
      .filter((option) => selectedSet.has(option.value))
      .map((option) => option.label);
    if (selectedLabels.length <= 2) return selectedLabels.join(', ');
    return `${selectedLabels.length} Selected`;
  };

  const toggleOption = (optionValue: string) => {
    if (multiple) {
      const nextValues = selectedSet.has(optionValue)
        ? selectedValues.filter((selectedValue) => selectedValue !== optionValue)
        : [...selectedValues, optionValue];
      onChange(nextValues);
      return;
    }
    onChange(optionValue);
  };

  const clearSelection = () => onChange(multiple ? [] : '');

  return (
    <div ref={rootRef} className="searchable-dropdown" style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className={className}
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          width: '100%',
          minHeight: '38px',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayValue()}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {required && selectedValues.length === 0 && <input required aria-hidden="true" tabIndex={-1} value="" onChange={() => {}} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />}

      {open && (
        <div
          className="searchable-dropdown-menu"
          role="listbox"
          aria-multiselectable={multiple}
          style={{
            position: 'absolute',
            zIndex: 1200,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            minWidth: '220px',
            maxHeight: '310px',
            overflow: 'auto',
            padding: '8px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ position: 'relative', marginBottom: '7px' }}>
            <Search size={14} style={{ position: 'absolute', left: '9px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search options..."
              aria-label="Search options"
              autoFocus
              style={{ width: '100%', padding: '7px 30px 7px 28px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
            />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" style={{ position: 'absolute', right: '6px', top: '6px', border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={15} /></button>}
          </div>

          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{emptyLabel}</div>
          ) : (
            filteredOptions.map((option) => {
              const checked = selectedSet.has(option.value);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '8px', border: 0, borderRadius: 'var(--radius-sm)', background: checked ? 'var(--accent-primary-subtle)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.82rem' }}
                >
                  <span aria-hidden="true" style={{ width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${checked ? 'var(--accent-primary)' : 'var(--border-strong)'}`, borderRadius: '3px', background: checked ? 'var(--accent-primary)' : 'transparent', color: 'var(--text-inverse)' }}>
                    {checked && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span style={{ flex: 1 }}>{option.label}</span>
                </button>
              );
            })
          )}

          <button type="button" onClick={clearSelection} disabled={selectedValues.length === 0} style={{ width: '100%', marginTop: '7px', padding: '7px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: selectedValues.length ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: selectedValues.length ? 'pointer' : 'not-allowed', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.78rem' }}>
            Clear selections
          </button>
        </div>
      )}
    </div>
  );
};
