'use client';

import { useState, useRef, useCallback } from 'react';
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react';

interface ImagePickerProps {
  currentUrl?: string;
  label?: string;
  compact?: boolean;
  onUpload: (file: File) => Promise<{ url: string }>;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export default function ImagePicker({
  currentUrl,
  label = 'Imagen',
  compact = false,
  onUpload,
  onChange,
  disabled = false,
}: ImagePickerProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploading(true);
    try {
      const result = await onUpload(file);
      onChange(result.url);
    } catch {
      // Upload failed silently — parent can handle errors
    } finally {
      setUploading(false);
    }
  }, [onUpload, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
      }}
    />
  );

  // ─── Compact mode (for items) ─────────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-3 mb-2">
        {currentUrl ? (
          <div className="relative group/img">
            <img
              src={currentUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover border border-gray-100"
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-1 rounded-full bg-white/90 text-red-500 hover:bg-white cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center">
            <ImageIcon className="h-4 w-4 text-gray-300" />
          </div>
        )}

        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-[0.72rem] text-[#1C3B57] font-medium hover:underline cursor-pointer disabled:opacity-50"
          >
            {uploading ? 'Subiendo...' : currentUrl ? 'Cambiar' : 'Subir imagen'}
          </button>
        )}
        {fileInput}
      </div>
    );
  }

  // ─── Full mode (for sections) ─────────────────────────────
  return (
    <div>
      <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </label>

      {currentUrl ? (
        <div className="relative mt-1.5 rounded-xl overflow-hidden border border-gray-100 group/img">
          <img
            src={currentUrl}
            alt=""
            className="w-full h-36 object-cover"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-2 transition-opacity">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="h-8 px-3 rounded-lg bg-white/90 text-[0.75rem] font-medium text-gray-700 hover:bg-white flex items-center gap-1.5 cursor-pointer"
              >
                {uploading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Upload className="h-3.5 w-3.5" />
                }
                Cambiar
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="h-8 px-3 rounded-lg bg-white/90 text-[0.75rem] font-medium text-red-500 hover:bg-white flex items-center gap-1.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`mt-1.5 rounded-xl border-2 border-dashed ${
            dragOver ? 'border-[#95D0C9] bg-[#E2F3F1]/30' : 'border-gray-200 bg-gray-50/50'
          } p-6 flex flex-col items-center justify-center transition-colors ${
            disabled ? 'opacity-50' : 'cursor-pointer'
          }`}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={!disabled ? handleDrop : undefined}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-[#95D0C9] animate-spin mb-2" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#E2F3F1] flex items-center justify-center mb-2">
              <ImageIcon className="h-4 w-4 text-[#1C3B57]" />
            </div>
          )}
          <p className="text-[0.78rem] text-gray-500 font-medium">
            {uploading ? 'Subiendo...' : 'Arrastra una imagen o haz clic'}
          </p>
          <p className="text-[0.68rem] text-gray-400 mt-0.5">
            JPG, PNG, WebP (max 5MB)
          </p>
        </div>
      )}

      {fileInput}
    </div>
  );
}
