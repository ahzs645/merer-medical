import { useEffect, useState } from 'react';

import {
  TerminologyEntry,
  TerminologyRecordKind,
  searchTerminology,
} from './clinicalTerminology';
import {
  DEFAULT_TERMINOLOGY_LANGUAGE,
  DEFAULT_TERMINOLOGY_LOOKUP_MODE,
  DEFAULT_TERMINOLOGY_PROFILE,
  DEFAULT_TERMINOLOGY_REMOTE_ENABLED,
} from '../terminology/terminologySettings';
import {
  TerminologyLanguage,
  TerminologyLookupMode,
  TerminologyProfile,
} from '@mere/domain';

export function TerminologySuggestions({
  kind,
  query,
  selected,
  onSelect,
  profile = DEFAULT_TERMINOLOGY_PROFILE,
  language = DEFAULT_TERMINOLOGY_LANGUAGE,
  lookupMode = DEFAULT_TERMINOLOGY_LOOKUP_MODE,
  remoteEnabled = DEFAULT_TERMINOLOGY_REMOTE_ENABLED,
}: {
  kind: TerminologyRecordKind;
  query: string;
  selected?: TerminologyEntry;
  onSelect: (entry: TerminologyEntry) => void;
  profile?: TerminologyProfile;
  language?: TerminologyLanguage;
  lookupMode?: TerminologyLookupMode;
  remoteEnabled?: boolean;
}) {
  const [matches, setMatches] = useState<TerminologyEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    searchTerminology({
      kind,
      query,
      profile,
      language,
      lookupMode,
      remoteEnabled,
    }).then((entries) => {
      if (!cancelled) setMatches(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, language, lookupMode, profile, query, remoteEnabled]);
  if (selected) {
    return (
      <p className="mt-2 text-xs font-medium text-gray-600">
        {selected.source}: {selected.code}
      </p>
    );
  }
  if (!query.trim() || matches.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {matches.map((entry) => (
        <button
          key={`${entry.system}:${entry.code}`}
          type="button"
          onClick={() => onSelect(entry)}
          className="rounded-md border border-gray-200 px-2 py-1 text-left text-xs font-medium text-gray-700 hover:border-primary-300 hover:bg-primary-50"
        >
          <span className="font-semibold">{entry.display}</span>
          <span className="ml-1 text-gray-500">
            {entry.source} {entry.code}
          </span>
        </button>
      ))}
    </div>
  );
}

export function TerminologyCombobox({
  id,
  kind,
  value,
  placeholder,
  onValueChange,
  onSelect,
  profile = DEFAULT_TERMINOLOGY_PROFILE,
  language = DEFAULT_TERMINOLOGY_LANGUAGE,
  lookupMode = DEFAULT_TERMINOLOGY_LOOKUP_MODE,
  remoteEnabled = DEFAULT_TERMINOLOGY_REMOTE_ENABLED,
}: {
  id: string;
  kind: TerminologyRecordKind;
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  onSelect: (entry: TerminologyEntry) => void;
  profile?: TerminologyProfile;
  language?: TerminologyLanguage;
  lookupMode?: TerminologyLookupMode;
  remoteEnabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [matches, setMatches] = useState<TerminologyEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    searchTerminology({
      kind,
      query: value,
      profile,
      language,
      lookupMode,
      remoteEnabled,
    }).then((entries) => {
      if (!cancelled) setMatches(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, language, lookupMode, profile, remoteEnabled, value]);
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onChange={(event) => onValueChange(event.target.value)}
        className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
      />
      {focused && matches.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-80 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {matches.map((entry) => (
            <button
              key={`${entry.system}:${entry.code}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(entry)}
              className="block w-full px-3 py-2 text-left text-xs hover:bg-primary-50"
            >
              <span className="block font-semibold text-gray-900">
                {entry.display}
              </span>
              <span className="text-gray-500">
                {entry.source} {entry.code}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function UnitInput({
  value,
  units,
  onChange,
}: {
  value: string;
  units?: string[];
  onChange: (value: string) => void;
}) {
  if (units && units.length > 0) {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
      >
        {units.map((unitOption) => (
          <option key={unitOption} value={unitOption}>
            {unitOption}
          </option>
        ))}
        {!units.includes(value) && value && (
          <option value={value}>{value}</option>
        )}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
    />
  );
}
