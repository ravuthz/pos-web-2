import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ProductImageLightboxProps {
  open: boolean;
  imageUrl?: string;
  title: string;
  onClose: () => void;
}

export function ProductImageLightbox({ open, imageUrl, title, onClose }: ProductImageLightboxProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !imageUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/85 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="btn btn-circle btn-sm absolute right-4 top-4 border-none bg-base-100/90 text-base-content shadow-lg"
        onClick={onClose}
        aria-label="Close image preview"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="max-h-[92vh] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
        <img src={imageUrl} alt={title} className="max-h-[92vh] max-w-[92vw] rounded-box object-contain shadow-2xl" />
      </div>
    </div>
  );
}
