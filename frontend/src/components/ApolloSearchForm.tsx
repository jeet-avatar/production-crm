// frontend/src/components/ApolloSearchForm.tsx
//
// Phase 4 Plan 04 — Apollo prospecting search form.
// quick-7 — added: concrete placeholders + per-field ✓/✗ hints + "Common ICP examples" presets.
//
// Filters: titles, locations, keyword tags, employee range, perPage, enrich toggle.
// ICP industry-include / tech_uids filters are intentionally NOT here (locked-deferred to Phase 4.5).
//
// The form emits a normalized `ApolloSearchFilters` shape that matches the backend
// `POST /api/apollo/import` contract from plan 04-03 (see apollo.ts:filters).

import { useState } from 'react';
import type { ApolloSearchFilters } from '../services/api';

interface Props {
  onSubmit: (filters: ApolloSearchFilters, enrich: boolean) => void;
  isLoading: boolean;
}

interface IcpPreset {
  name: string;
  titles: string;
  locations: string;
  keywords: string;
  minEmp: string;
  maxEmp: string;
  note?: string;
}

// quick-7: Common ICP presets. Click → auto-fill the form. Note field surfaces ICP-refinement gotchas.
const ICP_PRESETS: IcpPreset[] = [
  {
    name: 'SaaS CFOs in California',
    titles: 'CFO, Controller, VP Finance',
    locations: 'California',
    keywords: 'SaaS',
    minEmp: '100',
    maxEmp: '500',
  },
  {
    name: 'NetSuite end-user customers (US)',
    titles: 'CFO, Controller, VP Finance',
    locations: 'United States',
    keywords: '',
    minEmp: '100',
    maxEmp: '1000',
    note: '⚠ Tag "NetSuite" returns consultancies. Leave blank + filter results manually for true end-users.',
  },
  {
    name: 'FinTech CFOs in New York',
    titles: 'CFO, Controller, VP Finance',
    locations: 'New York',
    keywords: 'FinTech',
    minEmp: '50',
    maxEmp: '500',
  },
  {
    name: 'Manufacturing VP Finance (US)',
    titles: 'VP Finance, CFO',
    locations: 'United States',
    keywords: 'Manufacturing',
    minEmp: '100',
    maxEmp: '500',
  },
];

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#CBD5E1',
  marginBottom: '6px',
  letterSpacing: '0.02em',
};

const fieldHintStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#64748B',
  marginTop: '4px',
  lineHeight: '1.5',
};

const goodHintStyle: React.CSSProperties = {
  color: '#34D399',
  fontWeight: 600,
};

const badHintStyle: React.CSSProperties = {
  color: '#FCA5A5',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '10px',
  color: '#F1F5F9',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: '18px',
};

export function ApolloSearchForm({ onSubmit, isLoading }: Props) {
  const [titlesInput, setTitlesInput] = useState('CFO, Controller, VP Finance');
  const [locationsInput, setLocationsInput] = useState('United States');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [minEmployees, setMinEmployees] = useState('100');
  const [maxEmployees, setMaxEmployees] = useState('500');
  const [perPage, setPerPage] = useState('25');
  const [enrich, setEnrich] = useState(true);

  function applyPreset(p: IcpPreset) {
    setTitlesInput(p.titles);
    setLocationsInput(p.locations);
    setKeywordsInput(p.keywords);
    setMinEmployees(p.minEmp);
    setMaxEmployees(p.maxEmp);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const splitCsv = (s: string) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

    const filters: ApolloSearchFilters = {
      personTitles: splitCsv(titlesInput),
      personLocations: splitCsv(locationsInput),
      organizationKeywordTags: splitCsv(keywordsInput),
      minEmployees: parseInt(minEmployees, 10) || undefined,
      maxEmployees: parseInt(maxEmployees, 10) || undefined,
      perPage: Math.min(parseInt(perPage, 10) || 25, 25),
    };
    onSubmit(filters, enrich);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'rgba(22, 22, 37, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* quick-7: Common ICP examples collapsible */}
      <details
        style={{
          marginBottom: '20px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '12px',
          padding: '12px 14px',
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontWeight: 700,
            color: '#A5B4FC',
            fontSize: '13px',
            outline: 'none',
          }}
        >
          📋 Common ICP examples (click to fill)
        </summary>
        <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
          {ICP_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: '#F1F5F9',
                cursor: 'pointer',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
            >
              <div style={{ fontWeight: 700, color: '#A5B4FC', marginBottom: '2px' }}>
                {p.name}
              </div>
              <div style={{ color: '#94A3B8', fontSize: '12px' }}>
                Titles: {p.titles} · Locations: {p.locations} ·{' '}
                Tags: {p.keywords || '(none)'} · Emp: {p.minEmp}-{p.maxEmp}
              </div>
              {p.note && (
                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: '#FCD34D',
                    lineHeight: '1.4',
                  }}
                >
                  {p.note}
                </div>
              )}
            </button>
          ))}
        </div>
      </details>

      {/* Consultancy warning banner — RAJESH-HANDBOOK Section 6 / Pitfall 4 */}
      <div
        style={{
          background: 'rgba(234, 179, 8, 0.12)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          color: '#FCD34D',
          padding: '12px 14px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '13px',
          lineHeight: '1.5',
        }}
      >
        <strong>⚠ Heads up:</strong> Filtering by tech keyword tag (e.g. <code>NetSuite</code>)
        may match consultancies/partners instead of end-user customers. Prefer specific industry
        terms like <code>Manufacturing</code> or <code>Wholesale</code> when targeting buyers.
      </div>

      <div style={fieldGroupStyle}>
        <label style={fieldLabelStyle}>Job titles</label>
        <input
          type="text"
          value={titlesInput}
          onChange={(e) => setTitlesInput(e.target.value)}
          placeholder="CFO, Controller, VP Finance"
          style={inputStyle}
        />
        <div style={fieldHintStyle}>
          Comma-separated discrete titles. Apollo OR-matches across them.
          <br />
          <span style={goodHintStyle}>✓</span> CFO, Controller, VP Finance &nbsp;&nbsp;
          <span style={badHintStyle}>✗</span> Finance leaders, Senior management
        </div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={fieldLabelStyle}>Locations</label>
        <input
          type="text"
          value={locationsInput}
          onChange={(e) => setLocationsInput(e.target.value)}
          placeholder="Irvine California, San Francisco CA, United States"
          style={inputStyle}
        />
        <div style={fieldHintStyle}>
          Geographic only — cities, states, countries.
          <br />
          <span style={goodHintStyle}>✓</span> Irvine California, San Francisco CA, United States &nbsp;&nbsp;
          <span style={badHintStyle}>✗</span> West Coast, Big cities
        </div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={fieldLabelStyle}>Company keyword tags</label>
        <input
          type="text"
          value={keywordsInput}
          onChange={(e) => setKeywordsInput(e.target.value)}
          placeholder="SaaS, FinTech, Cybersecurity"
          style={inputStyle}
        />
        <div style={fieldHintStyle}>
          One discrete tag per CSV value. NOT a free-form phrase.
          <br />
          <span style={goodHintStyle}>✓</span> SaaS, FinTech, Cybersecurity &nbsp;&nbsp;
          <span style={badHintStyle}>✗</span> "SaaS companies in Irvine" — location belongs in Locations field
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div>
          <label style={fieldLabelStyle}>Min employees</label>
          <input
            type="number"
            min="1"
            value={minEmployees}
            onChange={(e) => setMinEmployees(e.target.value)}
            placeholder="100"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>Max employees</label>
          <input
            type="number"
            min="1"
            value={maxEmployees}
            onChange={(e) => setMaxEmployees(e.target.value)}
            placeholder="500"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>Per page (max 25)</label>
          <input
            type="number"
            min="1"
            max="25"
            value={perPage}
            onChange={(e) => setPerPage(e.target.value)}
            placeholder="25"
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '10px',
          marginBottom: '20px',
        }}
      >
        <input
          id="enrich-toggle"
          type="checkbox"
          checked={enrich}
          onChange={(e) => setEnrich(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
        />
        <label
          htmlFor="enrich-toggle"
          style={{ fontSize: '13px', color: '#CBD5E1', cursor: 'pointer', flex: 1 }}
        >
          Reveal emails (uses ~1 Apollo credit per contact)
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: isLoading
            ? 'rgba(99, 102, 241, 0.3)'
            : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontWeight: 700,
          fontSize: '14px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          boxShadow: isLoading ? 'none' : '0 4px 16px rgba(99, 102, 241, 0.3)',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {isLoading ? 'Searching…' : '🔍 Search Apollo →'}
      </button>
    </form>
  );
}
