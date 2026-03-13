'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Bold, Italic, Link2, RemoveFormatting } from 'lucide-react';

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'A', 'BR', 'P', 'SPAN']);

function sanitizeHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Remove dangerous elements
  doc.querySelectorAll('script, style, iframe, object, embed, form, input, textarea, select, button')
    .forEach(el => el.remove());
  // Remove event handler attributes and dangerous attrs
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on') || attr.name === 'srcdoc') {
        el.removeAttribute(attr.name);
      }
    }
    // For links, only allow safe href (no javascript:)
    if (el.tagName === 'A') {
      const href = el.getAttribute('href') || '';
      if (href.replace(/\s/g, '').toLowerCase().startsWith('javascript:')) {
        el.removeAttribute('href');
      }
    }
    // Remove tags not in allowlist but keep their text content
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(document.createTextNode(el.textContent || ''));
    }
  });
  return doc.body.innerHTML;
}

interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  compact?: boolean;
  disabled?: boolean;
}

export default function RichTextField({
  value,
  onChange,
  rows = 3,
  compact = false,
  disabled = false,
}: RichTextFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const isInternalUpdate = useRef(false);

  const sanitizedValue = useMemo(() => sanitizeHtml(value), [value]);

  // Sync external value → editor (only when value changes externally)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editorRef.current && editorRef.current.innerHTML !== sanitizedValue) {
      editorRef.current.innerHTML = sanitizedValue;
    }
  }, [sanitizedValue]);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(sanitizeHtml(editorRef.current.innerHTML));
    }
  }, [onChange]);

  const checkActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    setActiveFormats(formats);
  }, []);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      !editorRef.current?.contains(selection.anchorNode)
    ) {
      setToolbar(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    setToolbar({
      top: rect.top - editorRect.top - 40,
      left: rect.left - editorRect.left + rect.width / 2,
    });

    checkActiveFormats();
  }, [checkActiveFormats]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const execCommand = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emitChange();
    checkActiveFormats();
  };

  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');

  const handleLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const existingLink = selection.anchorNode?.parentElement?.closest('a');
    if (existingLink) {
      execCommand('unlink');
    } else {
      const url = prompt('URL del enlace:', 'https://');
      if (url) execCommand('createLink', url);
    }
  };

  const handleRemoveFormat = () => {
    execCommand('removeFormat');
    setToolbar(null);
  };

  const minHeight = compact ? `${(rows || 2) * 1.5}rem` : `${(rows || 3) * 1.6}rem`;

  const toolbarBtnClass = (active: boolean) =>
    `p-1 rounded transition-colors cursor-pointer ${
      active
        ? 'bg-[#1C3B57] text-white'
        : 'text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={() => {
          setTimeout(() => setToolbar(null), 200);
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
        style={{ minHeight }}
        className={`${
          compact
            ? 'w-full mt-1 px-2.5 py-2 rounded-lg border border-gray-200 text-[0.82rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] transition-colors'
            : 'w-full mt-1.5 px-3 py-2.5 rounded-lg border border-gray-200 text-[0.88rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors'
        } overflow-auto [&_b]:font-bold [&_i]:italic [&_a]:text-[#1C3B57] [&_a]:underline`}
      />

      {/* Floating toolbar */}
      {toolbar && !disabled && (
        <div
          className="absolute z-30 flex items-center gap-0.5 px-1.5 py-1 bg-white rounded-lg shadow-lg border border-gray-200 animate-in fade-in duration-150"
          style={{
            top: toolbar.top,
            left: toolbar.left,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            type="button"
            onClick={handleBold}
            className={toolbarBtnClass(activeFormats.has('bold'))}
            title="Negrita"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleItalic}
            className={toolbarBtnClass(activeFormats.has('italic'))}
            title="Cursiva"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button
            type="button"
            onClick={handleLink}
            className={toolbarBtnClass(false)}
            title="Enlace"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRemoveFormat}
            className={toolbarBtnClass(false)}
            title="Limpiar formato"
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
