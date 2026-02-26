'use client';

import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, CheckCircle2, Save } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';

export default function ApiKeysPage() {
  const { user, loading, refetch } = useUser();
  const [saving, setSaving] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [edamamAppId, setEdamamAppId] = useState('');
  const [edamamAppKey, setEdamamAppKey] = useState('');
  const [showOpenai, setShowOpenai] = useState(false);
  const [showEdamam, setShowEdamam] = useState(false);

  useEffect(() => {
    // No need to populate keys from server (they are never sent to browser)
  }, [user]);

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
        <CardSkeleton className="h-96 max-w-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">API Keys</h1>

      <div className="glass-card rounded-2xl p-6 max-w-2xl space-y-5">
        <div className="flex items-start gap-2 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" />
          <p className="text-xs text-text-secondary">
            Keys are encrypted with AES-256 before storage. They are never sent to the browser — only boolean flags
            (has key / doesn&apos;t) are returned.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">OpenAI API Key</span>
              {user?.hasOpenAiKey && (
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
              placeholder={user?.hasOpenAiKey ? '••••••••••••••••' : 'sk-...'}
              className="glass-input w-full rounded-xl px-3 py-2 pr-10 text-sm"
            />
            <button
              onClick={() => setShowOpenai(!showOpenai)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">Edamam API Key</span>
              {user?.hasEdamamKey && (
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
                onClick={() => setShowEdamam(!showEdamam)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showEdamam ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-white/[0.06] pt-4">
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
  );
}
