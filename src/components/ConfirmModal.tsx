/**
 * Confirmation modal for destructive actions
 */
interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      className="modal-overlay fixed inset-0 z-[90] flex items-center justify-center p-6"
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-lg font-bold text-text-primary mb-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h3>
        <p className="text-text-dim text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn-press flex-1 py-3 rounded-xl bg-surface2 text-text-primary
              border border-white/10 text-sm font-semibold min-h-[44px]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="btn-press flex-1 py-3 rounded-xl bg-red-accent text-white
              text-sm font-semibold min-h-[44px] shadow-lg"
            style={{ boxShadow: '0 0 15px var(--red-glow)' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
