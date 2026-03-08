'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const CARD_BORDER = 'border border-[#1e1e1e]';
const CONNECTOR_COLOR = '#2a2a2a';

export const SECTION_IDS = ['input', 'step1', 'step2', 'metadata'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200',
        className
      )}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

/** Simple JSON syntax highlighting (keys, strings, numbers). */
export function JsonHighlight({ raw }: { raw: string }) {
  try {
    const parsed = JSON.parse(raw);
    const str = JSON.stringify(parsed, null, 2);
    const parts: { type: 'key' | 'string' | 'number' | 'other'; text: string }[] = [];
    let i = 0;
    const keyRe = /^"(?:[^"\\]|\\.)*"(?=\s*:)/;
    const strRe = /^"(?:[^"\\]|\\.)*"/;
    const numRe = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i;
    while (i < str.length) {
      const rest = str.slice(i);
      const ws = rest.match(/^\s+/);
      if (ws) {
        parts.push({ type: 'other', text: ws[0] });
        i += ws[0].length;
        continue;
      }
      if (rest.startsWith('"')) {
        const keyMatch = rest.match(keyRe);
        const key = keyMatch && rest[keyMatch[0].length].match(/\s/) ? keyMatch[0] : null;
        if (key) {
          parts.push({ type: 'key', text: key });
          i += key.length;
          continue;
        }
        const strMatch = rest.match(strRe);
        if (strMatch) {
          parts.push({ type: 'string', text: strMatch[0] });
          i += strMatch[0].length;
          continue;
        }
      }
      const numMatch = rest.match(numRe);
      if (numMatch) {
        parts.push({ type: 'number', text: numMatch[0] });
        i += numMatch[0].length;
        continue;
      }
      const one = rest[0];
      parts.push({ type: 'other', text: one });
      i += 1;
    }
    return (
      <code className="block whitespace-pre text-left font-mono text-[11px] leading-relaxed">
        {parts.map((p, idx) => (
          <span
            key={idx}
            className={
              p.type === 'key'
                ? 'text-amber-400/90'
                : p.type === 'string'
                  ? 'text-emerald-300/90'
                  : p.type === 'number'
                    ? 'text-sky-400'
                    : 'text-zinc-500'
            }
          >
            {p.text}
          </span>
        ))}
      </code>
    );
  } catch {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-400">
        {raw}
      </pre>
    );
  }
}

const ConnectorLine = ({ className = '' }: { className?: string }) => (
  <div className={`w-[2px] shrink-0 rounded-full ${className}`} style={{ backgroundColor: CONNECTOR_COLOR }} />
);

const DownArrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0" style={{ color: CONNECTOR_COLOR }}>
    <path d="M7 12L1 4h12L7 12z" fill="currentColor" />
  </svg>
);

/** Vertical connector: line → arrow → small line → label → small line → arrow → line */
export function PipelineConnector({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-2" aria-hidden>
      <ConnectorLine className="h-4" />
      <DownArrow />
      <ConnectorLine className="h-1.5" />
      <span className="my-1 max-w-[220px] text-center text-[10px] leading-tight text-zinc-500">{label}</span>
      <ConnectorLine className="h-1.5" />
      <DownArrow />
      <ConnectorLine className="h-3" />
    </div>
  );
}

/** Collapsible zone card with 1px #1e1e1e border */
export function PipelineZone({
  label,
  open,
  onToggle,
  badges,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  badges?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('w-full overflow-hidden rounded-md bg-white/[0.02]', CARD_BORDER)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <div className="flex min-w-0 items-center gap-2">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          )}
          <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            {label}
          </span>
          {badges}
        </div>
      </button>
      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[#1e1e1e] px-3 pb-3 pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Step2ResponseBlock({ raw, isJson }: { raw: string; isJson: boolean }) {
  const [formatted, setFormatted] = useState(true);
  const displayRaw = !formatted || !isJson;
  const displayContent = displayRaw
    ? raw
    : (() => {
        try {
          return JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          return raw;
        }
      })();
  return (
    <div className="relative">
      <div className="max-h-[320px] overflow-auto pr-24">
        {displayRaw ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-400">
            {raw}
          </pre>
        ) : (
          <JsonHighlight raw={displayContent} />
        )}
      </div>
      <div className="absolute right-0 top-0 flex items-center gap-1.5">
        {isJson && (
          <button
            type="button"
            onClick={() => setFormatted((f) => !f)}
            className="rounded border border-white/10 bg-[#0d0d0f]/95 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500 shadow-sm hover:bg-white/10 hover:text-zinc-400"
          >
            {formatted ? 'Raw' : 'Formatted'}
          </button>
        )}
        <CopyButton text={raw} className="bg-[#0d0d0f]/95 shadow-sm" />
      </div>
    </div>
  );
}

/** Thin vertical divider: small line + down arrow + line between prompt and response inside a step card */
export function StepDivider() {
  return (
    <div className="mt-2 mb-2 flex flex-col items-center">
      <div className="h-1.5 w-px shrink-0 rounded-full" style={{ backgroundColor: CONNECTOR_COLOR }} aria-hidden />
      <svg width="12" height="12" viewBox="0 0 14 14" className="shrink-0" style={{ color: CONNECTOR_COLOR }}>
        <path d="M7 12L1 4h12L7 12z" fill="currentColor" />
      </svg>
      <div className="h-1.5 w-px shrink-0 rounded-full" style={{ backgroundColor: CONNECTOR_COLOR }} aria-hidden />
    </div>
  );
}
