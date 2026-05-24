/**
 * Toast notification component
 * Shows temporary messages at the bottom right of the screen
 */
import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error';
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 2500);
    const removeTimer = setTimeout(() => onRemove(toast.id), 2800);
    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  const bgColor = toast.type === 'error' ? 'bg-red-900/90' :
    toast.type === 'success' ? 'bg-green-900/90' : 'bg-surface2/90';

  const icon = toast.type === 'error' ? '✕' :
    toast.type === 'success' ? '✓' : 'ℹ';

  return (
    <div
      className={`${bgColor} ${exiting ? 'toast-exit' : 'toast-enter'} pointer-events-auto
        flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-text-primary border border-white/10
        shadow-xl backdrop-blur-sm max-w-sm`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
        ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
        {icon}
      </span>
      {toast.text}
    </div>
  );
}
