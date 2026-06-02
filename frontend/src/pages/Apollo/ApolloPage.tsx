// frontend/src/pages/Apollo/ApolloPage.tsx
//
// Phase 4 Plan 04 — Dedicated Apollo prospecting page.
//
// Hosts the NEW search/import UX per user-locked decision. The previous
// `ApolloImportModal.tsx` dead code in ContactList is intentionally NOT restored.
//
// Flow:
//   1. User fills ApolloSearchForm and submits
//   2. We call `apolloApi.import(filters, enrich)` → POST /api/apollo/import
//   3. Backend (plan 04-03) searches Apollo, enriches emails, dedupes by apolloPersonId,
//      classifies stream, upserts Company + Contact, returns
//      { imported, skipped, total, contactIds, suggestedStream, errors }
//   4. We render a result panel with those counts + a "Start campaign" button
//      that is DISABLED in this plan and gets wired by 04-05 to launch the
//      NetSuiteCampaignWizard.
//
// Error states:
//   - 503 "Apollo not configured" → friendly yellow alert with operator hint
//   - other → red alert with raw message

import { useState } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { ApolloSearchForm } from './ApolloSearchForm';
import {
  apolloApi,
  type ApolloSearchFilters,
  type ApolloImportResponse,
} from '../../services/api';

export default function ApolloPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ApolloImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [errorSeverity, setErrorSeverity] = useState<'warning' | 'error'>('error');

  async function handleSearch(filters: ApolloSearchFilters, enrich: boolean) {
    setIsLoading(true);
    setError(null);
    setErrorHint(null);
    setResult(null);

    try {
      const resp = await apolloApi.import(filters, enrich);
      setResult(resp);
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data || {};

      if (status === 503) {
        setError(body.error || 'Apollo not configured');
        setErrorHint(
          body.hint ||
            'Ask the operator to set APOLLO_API_KEY in the backend .env (lives on EC2 only per CLAUDE.md).',
        );
        setErrorSeverity('warning');
      } else if (status === 401 || status === 403) {
        setError('Not authorized — please log in again.');
        setErrorSeverity('error');
      } else {
        setError(body.error || e?.message || 'Import failed');
        setErrorSeverity('error');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#F1F5F9',
            margin: 0,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}
        >
          Apollo Prospecting
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#94A3B8',
            margin: 0,
            lineHeight: '1.5',
          }}
        >
          Search Apollo.io for new prospects, enrich their emails, and import them as contacts
          tagged <code style={codeStyle}>source=apollo</code>. After import you can launch a
          NetSuite Campaign over the resulting batch.
        </p>
      </header>

      {/* Search form */}
      <ApolloSearchForm onSubmit={handleSearch} isLoading={isLoading} />

      {/* Loading state */}
      {isLoading && (
        <div
          style={{
            marginTop: '24px',
            padding: '32px 24px',
            background: 'rgba(22, 22, 37, 0.6)',
            border: '1px solid rgba(99, 102, 241, 0.18)',
            borderRadius: '16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(99, 102, 241, 0.18)',
              borderTop: '3px solid #818CF8',
              borderRadius: '50%',
              animation: 'apollo-spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#CBD5E1', margin: 0, fontWeight: 600 }}>Searching Apollo…</p>
          <p style={{ color: '#64748B', margin: '6px 0 0', fontSize: '13px' }}>
            Enriching emails — this can take 30–90 seconds.
          </p>
          <style>{`@keyframes apollo-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error / 503 state */}
      {error && !isLoading && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px 18px',
            background:
              errorSeverity === 'warning'
                ? 'rgba(234, 179, 8, 0.10)'
                : 'rgba(239, 68, 68, 0.10)',
            border:
              errorSeverity === 'warning'
                ? '1px solid rgba(234, 179, 8, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)',
            color: errorSeverity === 'warning' ? '#FCD34D' : '#FCA5A5',
            borderRadius: '12px',
          }}
        >
          <strong style={{ fontSize: '14px' }}>
            {errorSeverity === 'warning' ? '⚠' : '⛔'} {error}
          </strong>
          {errorHint && (
            <p style={{ marginTop: '8px', marginBottom: 0, fontSize: '13px', lineHeight: '1.5' }}>
              {errorHint}
            </p>
          )}
        </div>
      )}

      {/* Result panel */}
      {result && !isLoading && (
        <div style={{ marginTop: '24px' }}>
          <div
            style={{
              padding: '20px 22px',
              background: 'rgba(22, 22, 37, 0.6)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.08)',
            }}
          >
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#F1F5F9',
                marginTop: 0,
                marginBottom: '14px',
              }}
            >
              Import results
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                marginBottom: '18px',
              }}
            >
              <StatCard label="Imported" value={result.imported} accent="#34D399" />
              <StatCard label="Skipped (dedup)" value={result.skipped} accent="#94A3B8" />
              <StatCard label="Total returned" value={result.total} accent="#A5B4FC" />
              <StatCard label="Suggested stream" value={result.suggestedStream} accent="#FCD34D" />
            </div>

            {result.errors.length > 0 && (
              <details
                style={{
                  marginBottom: '18px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#CBD5E1',
                  fontSize: '13px',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                  {result.errors.length} record(s) skipped — see why
                </summary>
                <ul style={{ marginTop: '10px', paddingLeft: '18px' }}>
                  {result.errors.map((e, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>
                      <code style={codeStyle}>{e.apolloPersonId}</code>: {e.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {/*
                PLACEHOLDER button — plan 04-05 wires this to launch NetSuiteCampaignWizard
                with result.contactIds + result.suggestedStream as props.
              */}
              <button
                type="button"
                disabled
                title="Wizard handoff lands in plan 04-05"
                style={{
                  padding: '10px 18px',
                  background: 'rgba(99, 102, 241, 0.18)',
                  color: 'rgba(165, 180, 252, 0.6)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'not-allowed',
                }}
              >
                📧 Start campaign with these contacts →
              </button>
              <a
                href="/contacts?source=apollo"
                style={{
                  padding: '10px 18px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#CBD5E1',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '13px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                See imported contacts
                <ArrowTopRightOnSquareIcon style={{ width: '14px', height: '14px' }} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  accent: string;
}

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div
      style={{
        padding: '14px 12px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
      }}
    >
      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '20px', color: accent, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

const codeStyle: React.CSSProperties = {
  background: 'rgba(99, 102, 241, 0.12)',
  color: '#A5B4FC',
  padding: '1px 6px',
  borderRadius: '4px',
  fontSize: '0.85em',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};
