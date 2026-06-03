// src/app/(platform)/admin/settings/onboarding/page.tsx
//
// Platform superadmin: onboarding configuration page.
// Tabs: Preguntas | Páginas | Secciones | Variantes | Prompt Blocks
// All requests go through `adminClient` (via `admin-settings` helpers) —
// never the tenant-scoped `apiClient`.
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  FileText,
  HelpCircle,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import {
  adminListModules,
  adminListQuestions,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminListPages,
  adminCreatePage,
  adminUpdatePage,
  adminDeletePage,
  adminListSections,
  adminCreateSection,
  adminUpdateSection,
  adminDeleteSection,
} from '@/lib/api/admin-settings';
import { toast } from 'sonner';
import type {
  AdminOnboardingQuestion,
  AdminOnboardingQuestionPayload,
  AdminPlatformModule,
  AdminWebsitePage,
  AdminWebsitePagePayload,
  AdminWebsiteSection,
  AdminWebsiteSectionPayload,
} from '@/types/admin';
import { VariantsTab } from './_components/VariantsTab';
import { PromptBlocksTab } from './_components/PromptBlocksTab';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  modulesLabel,
  truncate,
  type QuestionFormState,
  EMPTY_QUESTION_FORM,
  QUESTION_TYPE_OPTIONS,
  INPUT_TYPE_OPTIONS,
  SECTION_OPTIONS,
  SECTION_BADGE_CLASSES,
  QUESTION_TYPE_BADGE_CLASSES,
  type PageFormState,
  EMPTY_PAGE_FORM,
  type SectionFormState,
  EMPTY_SECTION_FORM,
  INPUT_CLASS,
  TEXTAREA_CLASS,
  BTN_PRIMARY,
  BTN_SECONDARY,
  ACTION_TRIGGER,
} from './_helpers';

export default function AdminOnboardingSettingsPage() {
  useEffect(() => {
    document.title = 'Onboarding — NERBIS Admin';
  }, []);

  // ── Shared state ──
  const [modules, setModules] = useState<AdminPlatformModule[]>([]);

  // ── Questions state ──
  const [questions, setQuestions] = useState<AdminOnboardingQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // ── Questions dialog state ──
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminOnboardingQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(EMPTY_QUESTION_FORM);
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionFormError, setQuestionFormError] = useState<string | null>(null);

  // ── Questions delete state ──
  const [deletingQuestion, setDeletingQuestion] = useState<AdminOnboardingQuestion | null>(null);
  const [deleteQuestionSubmitting, setDeleteQuestionSubmitting] = useState(false);

  // ── Pages state ──
  const [pages, setPages] = useState<AdminWebsitePage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pagesError, setPagesError] = useState<string | null>(null);

  // ── Pages dialog state ──
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<AdminWebsitePage | null>(null);
  const [pageForm, setPageForm] = useState<PageFormState>(EMPTY_PAGE_FORM);
  const [pageSubmitting, setPageSubmitting] = useState(false);
  const [pageFormError, setPageFormError] = useState<string | null>(null);

  // ── Pages delete state ──
  const [deletingPage, setDeletingPage] = useState<AdminWebsitePage | null>(null);
  const [deletePageSubmitting, setDeletePageSubmitting] = useState(false);

  // ── Sections state ──
  const [sections, setSections] = useState<AdminWebsiteSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState<string | null>(null);

  // ── Sections dialog state ──
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<AdminWebsiteSection | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormState>(EMPTY_SECTION_FORM);
  const [sectionSubmitting, setSectionSubmitting] = useState(false);
  const [sectionFormError, setSectionFormError] = useState<string | null>(null);

  // ── Sections delete state ──
  const [deletingSection, setDeletingSection] = useState<AdminWebsiteSection | null>(null);
  const [deleteSectionSubmitting, setDeleteSectionSubmitting] = useState(false);

  // ── Data fetching ──

  const loadModules = useCallback(async () => {
    try {
      const data = await adminListModules();
      setModules(data);
    } catch {
      // Modules are auxiliary — don't block the page
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    try {
      const data = await adminListQuestions();
      setQuestions(data);
    } catch (err) {
      setQuestionsError(extractErrorMessage(err, 'No se pudo cargar la lista de preguntas.'));
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  const loadPages = useCallback(async () => {
    setPagesLoading(true);
    setPagesError(null);
    try {
      const data = await adminListPages();
      setPages(data);
    } catch (err) {
      setPagesError(extractErrorMessage(err, 'No se pudo cargar la lista de paginas.'));
    } finally {
      setPagesLoading(false);
    }
  }, []);

  const loadSections = useCallback(async () => {
    setSectionsLoading(true);
    setSectionsError(null);
    try {
      const data = await adminListSections();
      setSections(data);
    } catch (err) {
      setSectionsError(extractErrorMessage(err, 'No se pudo cargar la lista de secciones.'));
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModules();
    void loadQuestions();
    void loadPages();
    void loadSections();
  }, [loadModules, loadQuestions, loadPages, loadSections]);

  // ── Module checkbox helpers ──

  function toggleModule(moduleId: number, list: number[]): number[] {
    return list.includes(moduleId)
      ? list.filter((id) => id !== moduleId)
      : [...list, moduleId];
  }

  // ── Question handlers ──

  function openCreateQuestion() {
    setEditingQuestion(null);
    setQuestionForm(EMPTY_QUESTION_FORM);
    setQuestionFormError(null);
    setQuestionDialogOpen(true);
  }

  function openEditQuestion(q: AdminOnboardingQuestion) {
    setEditingQuestion(q);
    setQuestionForm({
      question_key: q.question_key,
      question_text: q.question_text,
      message: q.message,
      question_type: q.question_type,
      input_type: q.input_type,
      section: q.section,
      placeholder: q.placeholder,
      hint: q.hint,
      help_text: q.help_text,
      is_required: q.is_required,
      min_length: q.min_length != null ? String(q.min_length) : '',
      max_length: q.max_length != null ? String(q.max_length) : '',
      required_modules: q.required_modules_detail?.map((m) => m.id) ?? [],
      template: q.template != null ? String(q.template) : '',
      ai_context: q.ai_context,
      options: q.options ? JSON.stringify(q.options, null, 2) : '',
      sort_order: q.sort_order,
      is_active: q.is_active,
    });
    setQuestionFormError(null);
    setQuestionDialogOpen(true);
  }

  async function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuestionFormError(null);
    setQuestionSubmitting(true);

    let parsedOptions: Record<string, unknown> | null = null;
    if (questionForm.options.trim()) {
      try {
        parsedOptions = JSON.parse(questionForm.options.trim());
      } catch {
        setQuestionFormError('El campo "opciones" no contiene JSON valido.');
        setQuestionSubmitting(false);
        return;
      }
    }

    const payload: AdminOnboardingQuestionPayload = {
      question_key: questionForm.question_key.trim(),
      question_text: questionForm.question_text.trim(),
      message: questionForm.message.trim(),
      question_type: questionForm.question_type,
      input_type: questionForm.input_type,
      section: questionForm.section,
      placeholder: questionForm.placeholder.trim(),
      hint: questionForm.hint.trim(),
      help_text: questionForm.help_text.trim(),
      is_required: questionForm.is_required,
      min_length: (() => { const v = questionForm.min_length.trim(); if (!v) return null; const n = parseInt(v, 10); return isNaN(n) ? null : n; })(),
      max_length: (() => { const v = questionForm.max_length.trim(); if (!v) return null; const n = parseInt(v, 10); return isNaN(n) ? null : n; })(),
      required_modules: questionForm.required_modules,
      template: (() => { const v = questionForm.template.trim(); if (!v) return null; const n = parseInt(v, 10); return isNaN(n) ? null : n; })(),
      ai_context: questionForm.ai_context.trim(),
      options: parsedOptions,
      sort_order: questionForm.sort_order,
      is_active: questionForm.is_active,
    };

    try {
      if (editingQuestion) {
        await adminUpdateQuestion(editingQuestion.id, payload);
        toast.success('Pregunta actualizada correctamente.');
      } else {
        await adminCreateQuestion(payload);
        toast.success('Pregunta creada correctamente.');
      }
      setQuestionDialogOpen(false);
      setEditingQuestion(null);
      setQuestionForm(EMPTY_QUESTION_FORM);
      await loadQuestions();
    } catch (err) {
      setQuestionFormError(
        extractErrorMessage(err, editingQuestion ? 'No se pudo actualizar la pregunta.' : 'No se pudo crear la pregunta.'),
      );
    } finally {
      setQuestionSubmitting(false);
    }
  }

  async function handleToggleQuestion(q: AdminOnboardingQuestion) {
    try {
      await adminUpdateQuestion(q.id, { is_active: !q.is_active });
      toast.success(q.is_active ? `${q.question_key} desactivada.` : `${q.question_key} activada.`);
      await loadQuestions();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo cambiar el estado.'));
    }
  }

  async function handleConfirmDeleteQuestion() {
    if (!deletingQuestion) return;
    setDeleteQuestionSubmitting(true);
    try {
      await adminDeleteQuestion(deletingQuestion.id);
      toast.success(`${deletingQuestion.question_key} eliminada.`);
      setDeletingQuestion(null);
      await loadQuestions();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo eliminar la pregunta.'));
    } finally {
      setDeleteQuestionSubmitting(false);
    }
  }

  // ── Page handlers ──

  function openCreatePage() {
    setEditingPage(null);
    setPageForm(EMPTY_PAGE_FORM);
    setPageFormError(null);
    setPageDialogOpen(true);
  }

  function openEditPage(p: AdminWebsitePage) {
    setEditingPage(p);
    setPageForm({
      key: p.key,
      label: p.label,
      description: p.description,
      icon: p.icon,
      is_mandatory: p.is_mandatory,
      is_default: p.is_default,
      sort_order: p.sort_order,
      is_active: p.is_active,
      auto_include_modules: p.auto_include_modules_detail?.map((m) => m.id) ?? [],
    });
    setPageFormError(null);
    setPageDialogOpen(true);
  }

  async function handlePageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageFormError(null);
    setPageSubmitting(true);

    const payload: AdminWebsitePagePayload = {
      key: pageForm.key.trim(),
      label: pageForm.label.trim(),
      description: pageForm.description.trim(),
      icon: pageForm.icon.trim(),
      is_mandatory: pageForm.is_mandatory,
      is_default: pageForm.is_default,
      sort_order: pageForm.sort_order,
      is_active: pageForm.is_active,
      auto_include_modules: pageForm.auto_include_modules,
    };

    try {
      if (editingPage) {
        await adminUpdatePage(editingPage.id, payload);
        toast.success('Pagina actualizada correctamente.');
      } else {
        await adminCreatePage(payload);
        toast.success('Pagina creada correctamente.');
      }
      setPageDialogOpen(false);
      setEditingPage(null);
      setPageForm(EMPTY_PAGE_FORM);
      await loadPages();
    } catch (err) {
      setPageFormError(
        extractErrorMessage(err, editingPage ? 'No se pudo actualizar la pagina.' : 'No se pudo crear la pagina.'),
      );
    } finally {
      setPageSubmitting(false);
    }
  }

  async function handleTogglePage(p: AdminWebsitePage) {
    try {
      await adminUpdatePage(p.id, { is_active: !p.is_active });
      toast.success(p.is_active ? `${p.key} desactivada.` : `${p.key} activada.`);
      await loadPages();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo cambiar el estado.'));
    }
  }

  async function handleConfirmDeletePage() {
    if (!deletingPage) return;
    setDeletePageSubmitting(true);
    try {
      await adminDeletePage(deletingPage.id);
      toast.success(`${deletingPage.key} eliminada.`);
      setDeletingPage(null);
      await loadPages();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo eliminar la pagina.'));
    } finally {
      setDeletePageSubmitting(false);
    }
  }

  // ── Section handlers ──

  function openCreateSection() {
    setEditingSection(null);
    setSectionForm(EMPTY_SECTION_FORM);
    setSectionFormError(null);
    setSectionDialogOpen(true);
  }

  function openEditSection(s: AdminWebsiteSection) {
    setEditingSection(s);
    setSectionForm({
      key: s.key,
      label: s.label,
      description: s.description,
      page: s.page != null ? String(s.page) : '',
      is_default: s.is_default,
      sort_order: s.sort_order,
      is_active: s.is_active,
    });
    setSectionFormError(null);
    setSectionDialogOpen(true);
  }

  async function handleSectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSectionFormError(null);
    setSectionSubmitting(true);

    const payload: AdminWebsiteSectionPayload = {
      key: sectionForm.key.trim(),
      label: sectionForm.label.trim(),
      description: sectionForm.description.trim(),
      page: sectionForm.page ? parseInt(sectionForm.page, 10) : null,
      is_default: sectionForm.is_default,
      sort_order: sectionForm.sort_order,
      is_active: sectionForm.is_active,
    };

    try {
      if (editingSection) {
        await adminUpdateSection(editingSection.id, payload);
        toast.success('Seccion actualizada correctamente.');
      } else {
        await adminCreateSection(payload);
        toast.success('Seccion creada correctamente.');
      }
      setSectionDialogOpen(false);
      setEditingSection(null);
      setSectionForm(EMPTY_SECTION_FORM);
      await loadSections();
    } catch (err) {
      setSectionFormError(
        extractErrorMessage(err, editingSection ? 'No se pudo actualizar la seccion.' : 'No se pudo crear la seccion.'),
      );
    } finally {
      setSectionSubmitting(false);
    }
  }

  async function handleToggleSection(s: AdminWebsiteSection) {
    try {
      await adminUpdateSection(s.id, { is_active: !s.is_active });
      toast.success(s.is_active ? `${s.key} desactivada.` : `${s.key} activada.`);
      await loadSections();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo cambiar el estado.'));
    }
  }

  async function handleConfirmDeleteSection() {
    if (!deletingSection) return;
    setDeleteSectionSubmitting(true);
    try {
      await adminDeleteSection(deletingSection.id);
      toast.success(`${deletingSection.key} eliminada.`);
      setDeletingSection(null);
      await loadSections();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo eliminar la seccion.'));
    } finally {
      setDeleteSectionSubmitting(false);
    }
  }

  // ── Render ──

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
          Configuracion de onboarding
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configura preguntas, paginas, secciones, variantes de diseno y bloques de prompt.
        </p>
      </div>

      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="questions">Preguntas</TabsTrigger>
          <TabsTrigger value="pages">Paginas</TabsTrigger>
          <TabsTrigger value="sections">Secciones</TabsTrigger>
          <TabsTrigger value="variants">Variantes</TabsTrigger>
          <TabsTrigger value="prompt-blocks">Prompt Blocks</TabsTrigger>
        </TabsList>

        {/* ────────────────────────────────────────────────────────────── */}
        {/* Tab: Preguntas                                                */}
        {/* ────────────────────────────────────────────────────────────── */}
        <TabsContent value="questions">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Preguntas que Pipe le hace a los nuevos negocios.
            </p>
            <button onClick={openCreateQuestion} className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva pregunta
            </button>
          </div>

          {questionsError && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span>{questionsError}</span>
              <button
                type="button"
                onClick={() => void loadQuestions()}
                className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Reintentar
              </button>
            </div>
          )}

          {questionsLoading ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-4"
                    aria-hidden="true"
                  >
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Cargando preguntas...
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <HelpCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                No hay preguntas configuradas
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Las preguntas guian el flujo de onboarding de los nuevos tenants.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[1100px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Key
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Mensaje
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Seccion
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Modulos requeridos
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Orden
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {questions.map((q) => (
                    <tr
                      key={q.id}
                      className="group transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">
                          {q.question_key}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-4 py-3 text-slate-600">
                        {truncate(q.message, 60)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`${QUESTION_TYPE_BADGE_CLASSES[q.question_type] ?? 'border-slate-200 bg-slate-50 text-slate-700'} hover:bg-inherit`}
                        >
                          {q.question_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`${SECTION_BADGE_CLASSES[q.section] ?? 'border-slate-200 bg-slate-50 text-slate-700'} hover:bg-inherit`}
                        >
                          {q.section}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {modulesLabel(q.required_modules_detail)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">
                        {q.sort_order}
                      </td>
                      <td className="px-4 py-3">
                        {q.is_active ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-slate-500">
                            Inactiva
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`Acciones para ${q.question_key}`}
                            className={ACTION_TRIGGER}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                openEditQuestion(q);
                              }}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                void handleToggleQuestion(q);
                              }}
                            >
                              <Power className="h-4 w-4" aria-hidden="true" />
                              {q.is_active ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setDeletingQuestion(q);
                              }}
                              className="text-red-600 focus:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ────────────────────────────────────────────────────────────── */}
        {/* Tab: Paginas                                                  */}
        {/* ────────────────────────────────────────────────────────────── */}
        <TabsContent value="pages">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Paginas disponibles para los sitios web generados.
            </p>
            <button onClick={openCreatePage} className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva pagina
            </button>
          </div>

          {pagesError && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span>{pagesError}</span>
              <button
                type="button"
                onClick={() => void loadPages()}
                className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Reintentar
              </button>
            </div>
          )}

          {pagesLoading ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-4"
                    aria-hidden="true"
                  >
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Cargando paginas...
              </div>
            </div>
          ) : pages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                No hay paginas configuradas
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Las paginas definen la estructura de los sitios web generados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[1100px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Key
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Label
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Icono
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Obligatoria
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Default
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Orden
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pages.map((p) => (
                    <tr
                      key={p.id}
                      className="group transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">
                          {p.key}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.label}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {p.icon || '\u2014'}
                      </td>
                      <td className="px-4 py-3">
                        {p.is_mandatory ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            Obligatoria
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-slate-500">
                            Opcional
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.is_default && (
                          <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                            Default
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">
                        {p.sort_order}
                      </td>
                      <td className="px-4 py-3">
                        {p.is_active ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-slate-500">
                            Inactiva
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`Acciones para ${p.key}`}
                            className={ACTION_TRIGGER}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                openEditPage(p);
                              }}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                void handleTogglePage(p);
                              }}
                            >
                              <Power className="h-4 w-4" aria-hidden="true" />
                              {p.is_active ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setDeletingPage(p);
                              }}
                              className="text-red-600 focus:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ────────────────────────────────────────────────────────────── */}
        {/* Tab: Secciones                                                */}
        {/* ────────────────────────────────────────────────────────────── */}
        <TabsContent value="sections">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Secciones que componen las paginas del sitio web.
            </p>
            <button onClick={openCreateSection} className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva seccion
            </button>
          </div>

          {sectionsError && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span>{sectionsError}</span>
              <button
                type="button"
                onClick={() => void loadSections()}
                className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Reintentar
              </button>
            </div>
          )}

          {sectionsLoading ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-4"
                    aria-hidden="true"
                  >
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Cargando secciones...
              </div>
            </div>
          ) : sections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <LayoutGrid className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                No hay secciones configuradas
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Las secciones definen los bloques de contenido dentro de cada pagina.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Key
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Label
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Pagina
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Default
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Orden
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sections.map((s) => (
                    <tr
                      key={s.id}
                      className="group transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">
                          {s.key}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.label}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`${s.page_detail ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-700'} hover:bg-inherit`}
                        >
                          {s.page_detail ? s.page_detail.label : 'Home'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {s.is_default && (
                          <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                            Default
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">
                        {s.sort_order}
                      </td>
                      <td className="px-4 py-3">
                        {s.is_active ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-slate-500">
                            Inactiva
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`Acciones para ${s.key}`}
                            className={ACTION_TRIGGER}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                openEditSection(s);
                              }}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                void handleToggleSection(s);
                              }}
                            >
                              <Power className="h-4 w-4" aria-hidden="true" />
                              {s.is_active ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setDeletingSection(s);
                              }}
                              className="text-red-600 focus:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ────────────────────────────────────────────────────────────── */}
        {/* Tab: Variantes                                                */}
        {/* ────────────────────────────────────────────────────────────── */}
        <TabsContent value="variants">
          <VariantsTab />
        </TabsContent>

        {/* ────────────────────────────────────────────────────────────── */}
        {/* Tab: Prompt Blocks                                            */}
        {/* ────────────────────────────────────────────────────────────── */}
        <TabsContent value="prompt-blocks">
          <PromptBlocksTab />
        </TabsContent>
      </Tabs>

      {/* ── Question Dialog (Create / Edit) ── */}
      <Dialog
        open={questionDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setQuestionDialogOpen(false);
            setEditingQuestion(null);
            setQuestionForm(EMPTY_QUESTION_FORM);
            setQuestionFormError(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Editar pregunta' : 'Nueva pregunta'}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion
                ? 'Modifica los datos de la pregunta de onboarding.'
                : 'Define una nueva pregunta para el flujo de onboarding.'}
            </DialogDescription>
          </DialogHeader>

          {questionFormError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {questionFormError}
            </div>
          )}

          <form onSubmit={(e) => void handleQuestionSubmit(e)} className="space-y-6">
            {/* ── Section: Basico ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Basico
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="q-key" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Key
                  </label>
                  <input
                    id="q-key"
                    type="text"
                    required
                    value={questionForm.question_key}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, question_key: e.target.value }))}
                    placeholder="ej. business_name"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="q-text" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Texto de la pregunta
                  </label>
                  <input
                    id="q-text"
                    type="text"
                    required
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, question_text: e.target.value }))}
                    placeholder="ej. Cual es el nombre de tu negocio?"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="q-message" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Mensaje
                </label>
                <textarea
                  id="q-message"
                  rows={2}
                  value={questionForm.message}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Mensaje visible para el usuario en el flujo de onboarding"
                  className={TEXTAREA_CLASS}
                />
              </div>
            </div>

            {/* ── Section: Configuracion ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Configuracion
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="q-type" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Tipo de pregunta
                  </label>
                  <Select
                    value={questionForm.question_type}
                    onValueChange={(v) => setQuestionForm((f) => ({ ...f, question_type: v }))}
                  >
                    <SelectTrigger id="q-type" className="h-10 border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="q-input" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Tipo de input
                  </label>
                  <Select
                    value={questionForm.input_type}
                    onValueChange={(v) => setQuestionForm((f) => ({ ...f, input_type: v }))}
                  >
                    <SelectTrigger id="q-input" className="h-10 border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INPUT_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="q-section" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Seccion
                  </label>
                  <Select
                    value={questionForm.section}
                    onValueChange={(v) => setQuestionForm((f) => ({ ...f, section: v }))}
                  >
                    <SelectTrigger id="q-section" className="h-10 border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Section: Presentacion ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Presentacion
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="q-placeholder" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Placeholder
                  </label>
                  <input
                    id="q-placeholder"
                    type="text"
                    value={questionForm.placeholder}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, placeholder: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="q-hint" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Hint
                  </label>
                  <input
                    id="q-hint"
                    type="text"
                    value={questionForm.hint}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, hint: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="q-help" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Texto de ayuda
                </label>
                <input
                  id="q-help"
                  type="text"
                  value={questionForm.help_text}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, help_text: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* ── Section: Validacion ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Validacion
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <label htmlFor="q-required" className="text-sm font-medium text-slate-700">
                    Requerida
                  </label>
                  <Switch
                    id="q-required"
                    checked={questionForm.is_required}
                    onCheckedChange={(v) => setQuestionForm((f) => ({ ...f, is_required: v }))}
                  />
                </div>
                <div>
                  <label htmlFor="q-minlen" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Min. longitud
                  </label>
                  <input
                    id="q-minlen"
                    type="number"
                    value={questionForm.min_length}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, min_length: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                  />
                </div>
                <div>
                  <label htmlFor="q-maxlen" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Max. longitud
                  </label>
                  <input
                    id="q-maxlen"
                    type="number"
                    value={questionForm.max_length}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, max_length: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Relaciones ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Relaciones
              </h3>

              <div>
                <label htmlFor="q-template" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Template ID
                </label>
                <input
                  id="q-template"
                  type="number"
                  value={questionForm.template}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, template: e.target.value }))}
                  placeholder="Dejar vacio si no aplica"
                  className={`${INPUT_CLASS} sm:max-w-[200px]`}
                />
              </div>

              {modules.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Modulos requeridos
                  </label>
                  <div className="space-y-2 rounded-lg border border-slate-200 px-3 py-3">
                    {modules.map((m) => (
                      <label
                        key={m.id}
                        className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
                      >
                        <Checkbox
                          checked={questionForm.required_modules.includes(m.id)}
                          onCheckedChange={() =>
                            setQuestionForm((f) => ({
                              ...f,
                              required_modules: toggleModule(m.id, f.required_modules),
                            }))
                          }
                        />
                        {m.label}
                        <span className="text-xs text-slate-400">({m.key})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Section: IA ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                IA
              </h3>

              <div>
                <label htmlFor="q-ai" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Contexto IA
                </label>
                <textarea
                  id="q-ai"
                  rows={3}
                  value={questionForm.ai_context}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, ai_context: e.target.value }))}
                  placeholder="Contexto adicional que se envia al modelo de IA"
                  className={TEXTAREA_CLASS}
                />
              </div>

              <div>
                <label htmlFor="q-options" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Opciones (JSON)
                </label>
                <textarea
                  id="q-options"
                  rows={4}
                  value={questionForm.options}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, options: e.target.value }))}
                  placeholder='{"choices": ["opcion1", "opcion2"]}'
                  className={`${TEXTAREA_CLASS} font-mono`}
                />
              </div>
            </div>

            {/* ── Section: Meta ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Meta
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="q-sort" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Orden
                  </label>
                  <input
                    id="q-sort"
                    type="number"
                    value={questionForm.sort_order}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 self-end">
                  <label htmlFor="q-active" className="text-sm font-medium text-slate-700">
                    Activa
                  </label>
                  <Switch
                    id="q-active"
                    checked={questionForm.is_active}
                    onCheckedChange={(v) => setQuestionForm((f) => ({ ...f, is_active: v }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setQuestionDialogOpen(false)}
                disabled={questionSubmitting}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={questionSubmitting}
                className={`${BTN_PRIMARY} disabled:opacity-50`}
              >
                {questionSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {editingQuestion ? 'Guardar cambios' : 'Crear pregunta'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Question Delete Confirmation ── */}
      <AlertDialog
        open={deletingQuestion !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingQuestion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pregunta</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingQuestion
                ? `Se eliminara permanentemente la pregunta "${deletingQuestion.question_key}". Esta accion no se puede deshacer.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteQuestionSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteQuestion();
              }}
              disabled={deleteQuestionSubmitting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-500"
            >
              {deleteQuestionSubmitting ? 'Eliminando...' : 'Si, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Page Dialog (Create / Edit) ── */}
      <Dialog
        open={pageDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPageDialogOpen(false);
            setEditingPage(null);
            setPageForm(EMPTY_PAGE_FORM);
            setPageFormError(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPage ? 'Editar pagina' : 'Nueva pagina'}
            </DialogTitle>
            <DialogDescription>
              {editingPage
                ? 'Modifica los datos de la pagina del sitio web.'
                : 'Define una nueva pagina para los sitios web generados.'}
            </DialogDescription>
          </DialogHeader>

          {pageFormError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {pageFormError}
            </div>
          )}

          <form onSubmit={(e) => void handlePageSubmit(e)} className="space-y-6">
            {/* ── Section: Basico ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Basico
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-key" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Key
                  </label>
                  <input
                    id="p-key"
                    type="text"
                    required
                    value={pageForm.key}
                    onChange={(e) => setPageForm((f) => ({ ...f, key: e.target.value }))}
                    placeholder="ej. about"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="p-label" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Label
                  </label>
                  <input
                    id="p-label"
                    type="text"
                    required
                    value={pageForm.label}
                    onChange={(e) => setPageForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="ej. Acerca de"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="p-description" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Descripcion
                </label>
                <textarea
                  id="p-description"
                  rows={2}
                  value={pageForm.description}
                  onChange={(e) => setPageForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descripcion breve de la pagina"
                  className={TEXTAREA_CLASS}
                />
              </div>

              <div>
                <label htmlFor="p-icon" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Icono
                </label>
                <input
                  id="p-icon"
                  type="text"
                  value={pageForm.icon}
                  onChange={(e) => setPageForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="Nombre Lucide ej: info"
                  className={`${INPUT_CLASS} sm:max-w-[300px]`}
                />
              </div>
            </div>

            {/* ── Section: Configuracion ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Configuracion
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <label htmlFor="p-mandatory" className="text-sm font-medium text-slate-700">
                    Obligatoria
                  </label>
                  <Switch
                    id="p-mandatory"
                    checked={pageForm.is_mandatory}
                    onCheckedChange={(v) => setPageForm((f) => ({ ...f, is_mandatory: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <label htmlFor="p-default" className="text-sm font-medium text-slate-700">
                    Default
                  </label>
                  <Switch
                    id="p-default"
                    checked={pageForm.is_default}
                    onCheckedChange={(v) => setPageForm((f) => ({ ...f, is_default: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <label htmlFor="p-active" className="text-sm font-medium text-slate-700">
                    Activa
                  </label>
                  <Switch
                    id="p-active"
                    checked={pageForm.is_active}
                    onCheckedChange={(v) => setPageForm((f) => ({ ...f, is_active: v }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="p-sort" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Orden
                </label>
                <input
                  id="p-sort"
                  type="number"
                  value={pageForm.sort_order}
                  onChange={(e) => setPageForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                  className={`${INPUT_CLASS} sm:max-w-[200px]`}
                />
              </div>
            </div>

            {/* ── Section: Modulos ── */}
            {modules.length > 0 && (
              <div className="space-y-4">
                <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Auto-incluir en modulos
                </h3>

                <div className="space-y-2 rounded-lg border border-slate-200 px-3 py-3">
                  {modules.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
                    >
                      <Checkbox
                        checked={pageForm.auto_include_modules.includes(m.id)}
                        onCheckedChange={() =>
                          setPageForm((f) => ({
                            ...f,
                            auto_include_modules: toggleModule(m.id, f.auto_include_modules),
                          }))
                        }
                      />
                      {m.label}
                      <span className="text-xs text-slate-400">({m.key})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setPageDialogOpen(false)}
                disabled={pageSubmitting}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pageSubmitting}
                className={`${BTN_PRIMARY} disabled:opacity-50`}
              >
                {pageSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {editingPage ? 'Guardar cambios' : 'Crear pagina'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Page Delete Confirmation ── */}
      <AlertDialog
        open={deletingPage !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingPage(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pagina</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPage
                ? `Se eliminara permanentemente la pagina "${deletingPage.key}". Esta accion no se puede deshacer.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePageSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeletePage();
              }}
              disabled={deletePageSubmitting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-500"
            >
              {deletePageSubmitting ? 'Eliminando...' : 'Si, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Section Dialog (Create / Edit) ── */}
      <Dialog
        open={sectionDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSectionDialogOpen(false);
            setEditingSection(null);
            setSectionForm(EMPTY_SECTION_FORM);
            setSectionFormError(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Editar seccion' : 'Nueva seccion'}
            </DialogTitle>
            <DialogDescription>
              {editingSection
                ? 'Modifica los datos de la seccion del sitio web.'
                : 'Define una nueva seccion para las paginas del sitio web.'}
            </DialogDescription>
          </DialogHeader>

          {sectionFormError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {sectionFormError}
            </div>
          )}

          <form onSubmit={(e) => void handleSectionSubmit(e)} className="space-y-6">
            {/* ── Section: Basico ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Basico
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="s-key" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Key
                  </label>
                  <input
                    id="s-key"
                    type="text"
                    required
                    value={sectionForm.key}
                    onChange={(e) => setSectionForm((f) => ({ ...f, key: e.target.value }))}
                    placeholder="ej. hero"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="s-label" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Label
                  </label>
                  <input
                    id="s-label"
                    type="text"
                    required
                    value={sectionForm.label}
                    onChange={(e) => setSectionForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="ej. Hero principal"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="s-description" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Descripcion
                </label>
                <textarea
                  id="s-description"
                  rows={2}
                  value={sectionForm.description}
                  onChange={(e) => setSectionForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descripcion breve de la seccion"
                  className={TEXTAREA_CLASS}
                />
              </div>
            </div>

            {/* ── Section: Configuracion ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Configuracion
              </h3>

              <div>
                <label htmlFor="s-page" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Pagina
                </label>
                <Select
                  value={sectionForm.page}
                  onValueChange={(v) => setSectionForm((f) => ({ ...f, page: v === '__null__' ? '' : v }))}
                >
                  <SelectTrigger id="s-page" className="h-10 border-slate-200 text-sm sm:max-w-[300px]">
                    <SelectValue placeholder="Seleccionar pagina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__null__">Home (sin pagina)</SelectItem>
                    {pages.filter((p) => p.is_active).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <label htmlFor="s-default" className="text-sm font-medium text-slate-700">
                    Default
                  </label>
                  <Switch
                    id="s-default"
                    checked={sectionForm.is_default}
                    onCheckedChange={(v) => setSectionForm((f) => ({ ...f, is_default: v }))}
                  />
                </div>
                <div>
                  <label htmlFor="s-sort" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Orden
                  </label>
                  <input
                    id="s-sort"
                    type="number"
                    value={sectionForm.sort_order}
                    onChange={(e) => setSectionForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <label htmlFor="s-active" className="text-sm font-medium text-slate-700">
                    Activa
                  </label>
                  <Switch
                    id="s-active"
                    checked={sectionForm.is_active}
                    onCheckedChange={(v) => setSectionForm((f) => ({ ...f, is_active: v }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setSectionDialogOpen(false)}
                disabled={sectionSubmitting}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sectionSubmitting}
                className={`${BTN_PRIMARY} disabled:opacity-50`}
              >
                {sectionSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {editingSection ? 'Guardar cambios' : 'Crear seccion'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Section Delete Confirmation ── */}
      <AlertDialog
        open={deletingSection !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingSection(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar seccion</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSection
                ? `Se eliminara permanentemente la seccion "${deletingSection.key}". Esta accion no se puede deshacer.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSectionSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteSection();
              }}
              disabled={deleteSectionSubmitting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-500"
            >
              {deleteSectionSubmitting ? 'Eliminando...' : 'Si, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
