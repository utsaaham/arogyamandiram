'use client';

import { useState } from 'react';
import { Shield, Eye, EyeOff, CheckCircle2, Save, Key, Sparkles, Utensils, Dumbbell } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ApiKeysPage() {
  const { user, loading, refetch } = useUser();
  const [saving, setSaving] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [edamamAppId, setEdamamAppId] = useState('');
  const [edamamAppKey, setEdamamAppKey] = useState('');
  const [showOpenai, setShowOpenai] = useState(false);
  const [showEdamam, setShowEdamam] = useState(false);

  const saveApiKeys = async () => {
    setSaving(true);
    try {
      const keys: Record<string, string> = {};
      if (openaiKey) keys.openai = openaiKey;
      if (edamamAppId) keys.edamamAppId = edamamAppId;
      if (edamamAppKey) keys.edamamAppKey = edamamAppKey;

      if (Object.keys(keys).length === 0) {
        showToast('No keys to save', 'info');
        setSaving(false);
        return;
      }

      const res = await api.saveApiKeys(keys);
      if (res.success) {
        showToast('API keys saved securely', 'success');
        setOpenaiKey('');
        setEdamamAppId('');
        setEdamamAppKey('');
        refetch();
      } else {
        showToast(res.error || 'Failed to save keys', 'error');
      }
    } catch {
      showToast('Failed to save API keys', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <CardSkeleton className="h-96" />
      </div>
    );
  }

  const openAiActive = !!user?.hasOpenAiKey;
  const edamamActive = !!user?.hasEdamamKey;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="API Keys"
        subtitle="Connect AI and nutrition providers securely"
        icon={Key}
        actions={(
          <Link
            href="/ai-insights"
            className="glass-button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
          >
            <Sparkles className="h-4 w-4 text-accent-violet" />
            Insights
          </Link>
        )}
      />

      {/* Status summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={Sparkles}
          label="OpenAI"
          value={openAiActive ? 'Active' : 'Not connected'}
          subtitle="Meal ideas, workout plan, insights"
          iconColor={openAiActive ? 'text-accent-emerald' : 'text-text-muted'}
          className={cn(!openAiActive && 'opacity-90')}
        />
        <StatCard
          icon={Utensils}
          label="Edamam"
          value={edamamActive ? 'Active' : 'Optional'}
          subtitle="Adds international foods to search"
          iconColor={edamamActive ? 'text-accent-emerald' : 'text-text-muted'}
          className={cn(!edamamActive && 'opacity-90')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        {/* Left: security + usage */}
        <div className="flex flex-col gap-6 lg:min-h-0">
          <div className="glass-card rounded-2xl p-6 shrink-0">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-accent-cyan" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Encrypted storage</p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  Keys are encrypted with AES-256 before storage. They are never sent to the browser — only boolean
                  flags (has key / doesn&apos;t) are returned.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex-1 min-h-0 flex flex-col">
            <p className="text-sm font-semibold text-text-primary">Where these keys are used</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-accent-violet">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">Insights</p>
                  <p className="text-[11px] text-text-muted">Yesterday, weekly, monthly, yearly—private</p>
                </div>
                <Link href="/ai-insights" className="ml-auto text-xs font-medium text-accent-violet hover:underline">
                  Open
                </Link>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-accent-emerald">
                  <Utensils className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">Food</p>
                  <p className="text-[11px] text-text-muted">AI meal ideas + broader search</p>
                </div>
                <Link href="/food" className="ml-auto text-xs font-medium text-accent-violet hover:underline">
                  Open
                </Link>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-accent-rose">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">Workout</p>
                  <p className="text-[11px] text-text-muted">AI workout plan generation</p>
                </div>
                <Link href="/workout" className="ml-auto text-xs font-medium text-accent-violet hover:underline">
                  Open
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right: forms */}
        <div className="glass-card flex h-full flex-col rounded-2xl p-6 space-y-5 lg:min-h-0">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">OpenAI API Key</span>
                {openAiActive && (
                  <span className="flex items-center gap-1 rounded-md bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Required for AI-powered meal suggestions, workout plans, and insights.
            </p>
            <div className="relative mt-3">
              <input
                type={showOpenai ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={openAiActive ? '••••••••••••••••' : 'sk-...'}
                className="glass-input w-full rounded-xl px-3 py-2 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowOpenai(!showOpenai)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label={showOpenai ? 'Hide OpenAI key' : 'Show OpenAI key'}
              >
                {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">Edamam API Key</span>
                {edamamActive && (
                  <span className="flex items-center gap-1 rounded-md bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                )}
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] text-text-muted">Optional</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Adds 900k+ international foods to search alongside the built-in Indian database.
            </p>
            <div className="mt-3 space-y-2">
              <div className="relative">
                <input
                  type={showEdamam ? 'text' : 'password'}
                  value={edamamAppId}
                  onChange={(e) => setEdamamAppId(e.target.value)}
                  placeholder="App ID"
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="relative">
                <input
                  type={showEdamam ? 'text' : 'password'}
                  value={edamamAppKey}
                  onChange={(e) => setEdamamAppKey(e.target.value)}
                  placeholder="App Key"
                  className="glass-input w-full rounded-xl px-3 py-2 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowEdamam(!showEdamam)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  aria-label={showEdamam ? 'Hide Edamam keys' : 'Show Edamam keys'}
                >
                  {showEdamam ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={saveApiKeys}
              disabled={saving}
              className="glass-button-primary flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Keys
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
