interface PublishModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function PublishModal({ open, onClose, onConfirm }: PublishModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-[rgba(10,20,35,0.55)] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[420px] max-w-[95vw] rounded-xl bg-white p-7 shadow-[0_24px_64px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-base font-bold text-[#1A2C3D]">Publish to Live?</h3>
        <p className="mb-5 text-[13px] leading-relaxed text-[#4A6580]">
          This will overwrite the active prompt used by the agent. A timestamped backup will be saved
          automatically.
          <br />
          <br />
          Make sure you&apos;ve tested your changes before publishing.
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[#E0E6ED] bg-transparent px-3.5 text-xs font-semibold text-[#4A6580] transition hover:bg-[#F5F6F8] hover:text-[#1A2C3D]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#16a34a] to-[#14532d] px-3.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Publish Now
          </button>
        </div>
      </div>
    </div>
  )
}
