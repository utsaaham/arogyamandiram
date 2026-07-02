'use client';

import { useEffect, useRef } from 'react';
import type { ConversationEntry } from '@/contexts/OrchestratorSidebarContext';
import MessageBubble from './MessageBubble';

interface ConversationHistoryProps {
  entries: ConversationEntry[];
  onConfirmSimple: (id: string) => Promise<string | undefined>;
  onConfirmFood: (id: string, mealType: string, time: string) => Promise<string | undefined>;
  onConfirmWorkout: (id: string) => Promise<string | undefined>;
  onCancel: (id: string) => void;
  onConfirmSuccess?: (route: string) => void;
}

export default function ConversationHistory({
  entries,
  onConfirmSimple,
  onConfirmFood,
  onConfirmWorkout,
  onCancel,
  onConfirmSuccess,
}: ConversationHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the conversation container itself to the bottom on new messages.
  // Using scrollTop on the known container avoids scrollIntoView walking up to an
  // ancestor (which on mobile could scroll the page instead of the list).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries.length, entries[entries.length - 1]?.status]);

  if (entries.length === 0) {
    return <div className="flex-1" />;
  }

  return (
    <div
      ref={scrollRef}
      className="hide-scrollbar flex-1 overflow-y-auto"
      style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
    >
      <div className="flex flex-col pb-2">
        {entries.map((entry) => (
          <MessageBubble
            key={entry.id}
            entry={entry}
            onConfirmSimple={async () => {
              const route = await onConfirmSimple(entry.id);
              if (route) onConfirmSuccess?.(route);
            }}
            onConfirmFood={async (mealType, time) => {
              const route = await onConfirmFood(entry.id, mealType, time);
              if (route) onConfirmSuccess?.(route);
            }}
            onConfirmWorkout={async () => {
              const route = await onConfirmWorkout(entry.id);
              if (route) onConfirmSuccess?.(route);
            }}
            onCancel={() => onCancel(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}
