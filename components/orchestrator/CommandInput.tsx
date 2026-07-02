'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { ArrowUp, Mic, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLACEHOLDERS = [
  "What's up?",
  "Did you hit the gym?",
  "How much water today?",
  "Did you eat lunch?",
  "How did you sleep?",
  "Any workout today?",
  "Feeling healthy today?",
  "Log your dinner?",
  "Did you drink water?",
  "How's your weight?",
  "Had a good breakfast?",
  "Did you run today?",
  "Log your steps?",
  "How are you feeling?",
  "Any snacks today?",
];

interface ImageAttachment {
  base64: string;
  mimeType: string;
  preview: string;
}

interface CommandInputProps {
  onSubmit: (text: string, imageBase64?: string, imageMimeType?: string) => Promise<void>;
  disabled?: boolean;
  open?: boolean;
}

export default function CommandInput({ onSubmit, disabled, open }: CommandInputProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [listening, setListening] = useState(false);
  const [hasSpeech, setHasSpeech] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(() => Math.floor(Math.random() * PLACEHOLDERS.length));

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    setHasSpeech('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  // Focus textarea whenever the sidebar opens
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !image) || loading || disabled) return;
    setLoading(true);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = '';
    const img = image;
    setImage(null);
    try {
      await onSubmit(trimmed, img?.base64, img?.mimeType);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Downscale + JPEG-encode so phone photos stay well under request limits.
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setImage({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: objectUrl });
    };
    img.onerror = () => URL.revokeObjectURL(objectUrl);
    img.src = objectUrl;
    e.target.value = '';
  }, []);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.lang = 'en-US';
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      setText(e.results[0][0].transcript as string);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec as { stop: () => void };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    rec.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const hasContent = text.trim().length > 0 || !!image;

  return (
    <div className="px-3 pb-2 pt-2">
      {/* Image preview */}
      {image && (
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.preview} alt="attachment" className="h-12 w-12 rounded-lg object-cover" />
            <button
              onClick={() => setImage(null)}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input bar — always stacked, no layout switch */}
      <div
        className={cn(
          'flex flex-col rounded-2xl border border-neutral-800/40 bg-neutral-900/70 pt-3 pb-1 cursor-text',
          disabled && 'opacity-60'
        )}
        onClick={() => textareaRef.current?.focus()}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); autoResize(e.target); }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          disabled={disabled}
          style={{ outline: 'none', boxShadow: 'none', border: 'none', background: 'transparent' }}
          className="w-full resize-none py-0 px-4 text-sm text-neutral-100 placeholder:text-neutral-600 leading-5 max-h-40 overflow-y-auto hide-scrollbar"
        />

        {/* Bottom row: + left, mic/send right */}
        <div className="flex items-center justify-between mt-0.5 px-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex h-7 w-7 items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {hasContent ? (
            <button
              onClick={() => void handleSubmit()}
              disabled={disabled}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 hover:bg-white transition-colors"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <button
              onClick={hasSpeech ? (listening ? stopListening : startListening) : undefined}
              disabled={disabled}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full',
                listening ? 'text-rose-400 animate-pulse' : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-0.5 mb-0.5 text-center text-[10px] text-neutral-700">
        AI can make mistakes. Check important info.
      </p>
    </div>
  );
}
