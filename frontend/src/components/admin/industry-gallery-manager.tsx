// src/components/admin/industry-gallery-manager.tsx
//
// Reusable component for industry gallery card management.
// Extracted from the industry-gallery page so it can be embedded
// in the unified "Home" admin page as well.
'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  adminListGalleryCards,
  adminCreateGalleryCard,
  adminUpdateGalleryCard,
  adminDeleteGalleryCard,
} from '@/lib/api/admin-industry-gallery';
import { toast } from 'sonner';
import type { IndustryGalleryCard } from '@/types/marketing';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  extractErrorMessage,
  EMPTY_CARD_FORM,
  type CardFormState,
} from './industry-gallery-helpers';

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────

export function IndustryGalleryManager() {
  // ── Data state ──
  const [cards, setCards] = useState<IndustryGalleryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Dialog state ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<IndustryGalleryCard | null>(null);
  const [form, setForm] = useState<CardFormState>(EMPTY_CARD_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Delete state ──
  const [deletingCard, setDeletingCard] = useState<IndustryGalleryCard | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ── Data fetching ──

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListGalleryCards();
      setCards(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'No se pudo cargar la galeria de industrias.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  // ── Derived data ──

  const row1Cards = cards
    .filter((c) => c.row === 1)
    .sort((a, b) => a.sort_order - b.sort_order);
  const row2Cards = cards
    .filter((c) => c.row === 2)
    .sort((a, b) => a.sort_order - b.sort_order);

  // ── Dialog handlers ──

  function openCreate() {
    setEditingCard(null);
    setForm(EMPTY_CARD_FORM);
    setImageFile(null);
    setImagePreview(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(card: IndustryGalleryCard) {
    setEditingCard(card);
    setForm({
      name: card.name,
      gradient: card.gradient,
      row: String(card.row) as '1' | '2',
      is_visible: card.is_visible,
    });
    setImageFile(null);
    setImagePreview(card.image);
    setFormError(null);
    setDialogOpen(true);
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(editingCard?.image ?? null);
    }
  }

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('gradient', form.gradient.trim());
    fd.append('row', form.row);
    fd.append('is_visible', String(form.is_visible));

    if (imageFile) {
      fd.append('image', imageFile);
    }

    // When editing and user cleared the image, send empty string to remove it
    if (editingCard && !imageFile && !imagePreview && editingCard.image) {
      fd.append('image', '');
    }

    try {
      if (editingCard) {
        await adminUpdateGalleryCard(editingCard.id, fd);
        toast.success('Tarjeta actualizada correctamente.');
      } else {
        await adminCreateGalleryCard(fd);
        toast.success('Tarjeta creada correctamente.');
      }
      setDialogOpen(false);
      setEditingCard(null);
      setForm(EMPTY_CARD_FORM);
      setImageFile(null);
      setImagePreview(null);
      await loadCards();
    } catch (err) {
      setFormError(
        extractErrorMessage(
          err,
          editingCard
            ? 'No se pudo actualizar la tarjeta.'
            : 'No se pudo crear la tarjeta.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Visibility toggle ──

  async function handleToggleVisibility(card: IndustryGalleryCard) {
    const fd = new FormData();
    fd.append('is_visible', String(!card.is_visible));
    try {
      await adminUpdateGalleryCard(card.id, fd);
      toast.success(
        card.is_visible
          ? `"${card.name}" ocultada del marquee.`
          : `"${card.name}" visible en el marquee.`,
      );
      await loadCards();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo cambiar la visibilidad.'));
    }
  }

  // ── Move between rows ──

  async function handleMoveRow(card: IndustryGalleryCard) {
    const newRow = card.row === 1 ? 2 : 1;
    const fd = new FormData();
    fd.append('row', String(newRow));
    try {
      await adminUpdateGalleryCard(card.id, fd);
      toast.success(`"${card.name}" movida a Fila ${newRow}.`);
      await loadCards();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo mover la tarjeta.'));
    }
  }

  // ── Delete ──

  async function handleConfirmDelete() {
    if (!deletingCard) return;
    setDeleteSubmitting(true);
    try {
      await adminDeleteGalleryCard(deletingCard.id);
      toast.success(`"${deletingCard.name}" eliminada.`);
      setDeletingCard(null);
      await loadCards();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo eliminar la tarjeta.'));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  // ── Card preview component ──

  function CardPreview({ card }: { card: IndustryGalleryCard }) {
    return (
      <div className="group relative h-[130px] w-[200px] overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
        {/* Background: image or gradient */}
        <div
          className="absolute inset-0"
          style={
            card.image
              ? {
                  backgroundImage: `url(${card.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : { background: card.gradient }
          }
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Visibility indicator */}
        <div className="absolute right-2 top-2">
          {card.is_visible ? (
            <span className="flex size-2.5 rounded-full bg-emerald-400 shadow-sm" />
          ) : (
            <span className="flex size-2.5 rounded-full bg-slate-400 shadow-sm" />
          )}
        </div>

        {/* Card name */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
          <span className="text-sm font-medium leading-tight text-white drop-shadow-sm">
            {card.name}
          </span>
        </div>

        {/* Hover actions overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Acciones para ${card.name}`}
              className="inline-flex size-8 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-white"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  openEdit(card);
                }}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  void handleToggleVisibility(card);
                }}
              >
                {card.is_visible ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
                {card.is_visible ? 'Ocultar' : 'Mostrar'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  void handleMoveRow(card);
                }}
              >
                <GripVertical className="size-4" aria-hidden="true" />
                Mover a Fila {card.row === 1 ? 2 : 1}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setDeletingCard(card);
                }}
                className="text-red-600 focus:text-red-700"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // ── Row section component ──

  function RowSection({
    label,
    rowCards,
  }: {
    label: string;
    rowCards: IndustryGalleryCard[];
  }) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {rowCards.length} {rowCards.length === 1 ? 'tarjeta' : 'tarjetas'}
          </Badge>
        </div>

        {rowCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-sm text-slate-500">
              No hay tarjetas en esta fila.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {rowCards.map((card) => (
              <CardPreview key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render ──

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
            Galeria de industrias
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Administra las tarjetas de industria que aparecen en el marquee del sitio.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          Agregar tarjeta
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadCards()}
            className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-8">
          {[1, 2].map((row) => (
            <div key={row}>
              <div className="mb-3 h-4 w-16 animate-pulse rounded bg-slate-100" />
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[130px] w-[200px] animate-pulse rounded-xl bg-slate-100"
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando galeria...
          </div>
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <ImageIcon className="size-5" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            No hay tarjetas configuradas
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Las tarjetas de industria aparecen como un marquee en la pagina principal del sitio.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <RowSection label="Fila 1" rowCards={row1Cards} />
          <RowSection label="Fila 2" rowCards={row2Cards} />
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditingCard(null);
            setForm(EMPTY_CARD_FORM);
            setImageFile(null);
            setImagePreview(null);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? 'Editar tarjeta' : 'Nueva tarjeta'}
            </DialogTitle>
            <DialogDescription>
              {editingCard
                ? 'Modifica los datos de la tarjeta de industria.'
                : 'Agrega una nueva tarjeta al marquee de industrias.'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
            {/* Name */}
            <div>
              <label htmlFor="card-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                id="card-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ej. Restaurantes"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Gradient */}
            <div>
              <label htmlFor="card-gradient" className="mb-1.5 block text-sm font-medium text-slate-700">
                Gradiente CSS
              </label>
              <div className="flex items-center gap-3">
                <div
                  className="size-10 shrink-0 rounded-lg border border-slate-200 shadow-sm"
                  style={{ background: form.gradient }}
                  aria-label="Vista previa del gradiente"
                />
                <input
                  id="card-gradient"
                  type="text"
                  required
                  value={form.gradient}
                  onChange={(e) => setForm((f) => ({ ...f, gradient: e.target.value }))}
                  placeholder="linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                />
              </div>
            </div>

            {/* Image */}
            <div>
              <label htmlFor="card-image" className="mb-1.5 block text-sm font-medium text-slate-700">
                Imagen (opcional)
              </label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Vista previa"
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                      aria-label="Quitar imagen"
                    >
                      <Trash2 className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                    <ImageIcon className="size-5" aria-hidden="true" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="card-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 file:transition-colors hover:file:bg-slate-200"
                />
              </div>
            </div>

            {/* Row + Visible */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="card-row" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Fila
                </label>
                <Select
                  value={form.row}
                  onValueChange={(v) => setForm((f) => ({ ...f, row: v as '1' | '2' }))}
                >
                  <SelectTrigger id="card-row" className="h-10 border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Fila 1</SelectItem>
                    <SelectItem value="2">Fila 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between self-end rounded-lg border border-slate-200 px-3 py-2.5">
                <label htmlFor="card-visible" className="text-sm font-medium text-slate-700">
                  Visible
                </label>
                <Switch
                  id="card-visible"
                  checked={form.is_visible}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_visible: v }))}
                />
              </div>
            </div>

            {/* Card preview */}
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Vista previa</p>
              <div
                className="relative h-[130px] w-[200px] overflow-hidden rounded-xl border border-slate-200 shadow-sm"
              >
                <div
                  className="absolute inset-0"
                  style={
                    imagePreview
                      ? {
                          backgroundImage: `url(${imagePreview})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : { background: form.gradient }
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
                  <span className="text-sm font-medium leading-tight text-white drop-shadow-sm">
                    {form.name || 'Nombre de industria'}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-500 disabled:opacity-50"
              >
                {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {editingCard ? 'Guardar cambios' : 'Crear tarjeta'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={deletingCard !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingCard(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tarjeta</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCard
                ? `Se eliminara permanentemente la tarjeta "${deletingCard.name}". Esta accion no se puede deshacer.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleteSubmitting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-500"
            >
              {deleteSubmitting ? 'Eliminando...' : 'Eliminar tarjeta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
