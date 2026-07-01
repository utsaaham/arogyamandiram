'use client';

import { useRouter } from 'next/navigation';
import { Maximize2, X, Sparkles } from 'lucide-react';
import { useOrchestratorSidebar } from '@/contexts/OrchestratorSidebarContext';
import { useUserContext } from '@/contexts/UserContext';
import CommandInput from '@/components/orchestrator/CommandInput';
import ConversationHistory from '@/components/orchestrator/ConversationHistory';

export default function OrchestratorSidebar() {
  const {
    isOpen,
    sidebarWidth,
    closeSidebar,
    conversation,
    submitCommand,
    confirmSimpleEntry,
    confirmFoodEntry,
    confirmWorkoutEntry,
    cancelEntry,
  } = useOrchestratorSidebar();
  const { user } = useUserContext();
  const router = useRouter();
  const aiEnabled = user?.settings?.aiEnabled !== false;

  if (!aiEnabled) return null;

  return (
    <>
      <aside
        className={[
          'fixed right-0 top-0 z-[51] flex h-[100dvh] max-w-[100vw] flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        style={{
          width: `${sidebarWidth}px`,
          background: 'linear-gradient(160deg, #111712 0%, #0c1410 100%)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm font-semibold text-neutral-200">Health Assistant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  closeSidebar();
                  router.push('/ai');
                }}
                aria-label="Open AI assistant page"
                className="hidden h-7 w-7 items-center justify-center text-neutral-500 transition-colors hover:text-neutral-300 lg:flex"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closeSidebar}
                className="flex h-7 w-7 items-center justify-center text-neutral-500 transition-colors hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conversation */}
          <ConversationHistory
            entries={conversation}
            onConfirmSimple={confirmSimpleEntry}
            onConfirmFood={(id, mealType) => confirmFoodEntry(id, mealType)}
            onConfirmWorkout={confirmWorkoutEntry}
            onCancel={cancelEntry}
          />

          {/* Command input */}
          <CommandInput open={isOpen} onSubmit={(text, imageBase64, imageMimeType) => submitCommand(text, imageBase64, imageMimeType)} />
        </div>
      </aside>
    </>
  );
}
