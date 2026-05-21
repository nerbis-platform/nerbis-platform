// src/app/(platform)/admin/settings/onboarding/page.tsx
//
// Platform superadmin: onboarding configuration page.
//
// Manages WebsitePages and OnboardingQuestions via two tabs.
// All requests go through `adminClient` (via `admin-settings` helpers) —
// never the tenant-scoped `apiClient`.
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { PipeAdmin } from '@/components/pipe-avatar';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Loader2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import {
  adminListModules,
  adminListPages,
  adminCreatePage,
  adminUpdatePage,
  adminDeletePage,
  adminListQuestions,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
} from '@/lib/api/admin-settings';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import type {
  AdminModuleRef,
  AdminOnboardingQuestion,
  AdminOnboardingQuestionPayload,
  AdminPlatformModule,
  AdminWebsitePage,
  AdminWebsitePagePayload,
} from '@/types/admin';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

function modulesLabel(detail: AdminModuleRef[]): string {
  if (detail.length === 0) return '\u2014';
  return detail.map((m) => m.label).join(', ');
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\u2026';
}

// ──────────────────────────────────────────────────────────────────────
// Page form state
// ──────────────────────────────────────────────────────────────────────

interface PageFormState {
  key: string;
  label: string;
  description: string;
  icon: string;
  is_mandatory: boolean;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
  auto_include_modules: number[];
}

const EMPTY_PAGE_FORM: PageFormState = {
  key: '',
  label: '',
  description: '',
  icon: '',
  is_mandatory: false,
  is_default: false,
  sort_order: 0,
  is_active: true,
  auto_include_modules: [],
};

// ──────────────────────────────────────────────────────────────────────
// Question form state
// ──────────────────────────────────────────────────────────────────────

interface QuestionFormState {
  question_key: string;
  question_text: string;
  message: string;
  question_type: string;
  input_type: string;
  section: string;
  placeholder: string;
  hint: string;
  help_text: string;
  is_required: boolean;
  min_length: string;
  max_length: string;
  required_modules: number[];
  template: string;
  ai_context: string;
  options: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_QUESTION_FORM: QuestionFormState = {
  question_key: '',
  question_text: '',
  message: '',
  question_type: 'text',
  input_type: 'input',
  section: 'basic',
  placeholder: '',
  hint: '',
  help_text: '',
  is_required: false,
  min_length: '',
  max_length: '',
  required_modules: [],
  template: '',
  ai_context: '',
  options: '',
  sort_order: 0,
  is_active: true,
};

const QUESTION_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'choice', label: 'Seleccion unica' },
  { value: 'multi_choice', label: 'Seleccion multiple' },
  { value: 'color', label: 'Color' },
  { value: 'image', label: 'Imagen' },
  { value: 'number', label: 'Numero' },
  { value: 'url', label: 'URL' },
];

const INPUT_TYPE_OPTIONS = [
  { value: 'input', label: 'Input' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'multiselect', label: 'Multiselect' },
  { value: 'modules', label: 'Modules' },
];

const SECTION_OPTIONS = [
  { value: 'basic', label: 'Basico' },
  { value: 'branding', label: 'Branding' },
  { value: 'content', label: 'Contenido' },
  { value: 'contact', label: 'Contacto' },
];

const SECTION_BADGE_CLASSES: Record<string, string> = {
  basic: 'border-slate-200 bg-slate-50 text-slate-700',
  branding: 'border-violet-200 bg-violet-50 text-violet-700',
  content: 'border-blue-200 bg-blue-50 text-blue-700',
  contact: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const QUESTION_TYPE_BADGE_CLASSES: Record<string, string> = {
  text: 'border-slate-200 bg-slate-50 text-slate-700',
  textarea: 'border-slate-200 bg-slate-50 text-slate-700',
  choice: 'border-blue-200 bg-blue-50 text-blue-700',
  multi_choice: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  color: 'border-pink-200 bg-pink-50 text-pink-700',
  image: 'border-amber-200 bg-amber-50 text-amber-700',
  number: 'border-teal-200 bg-teal-50 text-teal-700',
  url: 'border-cyan-200 bg-cyan-50 text-cyan-700',
};

// ──────────────────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────────────────

export default function AdminOnboardingSettingsPage() {
  const { admin, logout } = useAdminAuth();

  useEffect(() => {
    document.title = 'Onboarding — NERBIS Admin';
  }, []);

  // ── Shared state ──
  const [modules, setModules] = useState<AdminPlatformModule[]>([]);
  const [activeTab, setActiveTab] = useState('pages');

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

  // ── Data fetching ──

  const loadModules = useCallback(async () => {
    try {
      const data = await adminListModules();
      setModules(data);
    } catch {
      // Modules are auxiliary — don't block the page
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

  useEffect(() => {
    void loadModules();
    void loadPages();
    void loadQuestions();
  }, [loadModules, loadPages, loadQuestions]);

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
      auto_include_modules: p.auto_include_modules,
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
      toast.success(p.is_active ? `${p.label} desactivada.` : `${p.label} activada.`);
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
      toast.success(`${deletingPage.label} eliminada.`);
      setDeletingPage(null);
      await loadPages();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo eliminar la pagina.'));
    } finally {
      setDeletePageSubmitting(false);
    }
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
      required_modules: q.required_modules,
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
      min_length: questionForm.min_length.trim() ? Number(questionForm.min_length) : null,
      max_length: questionForm.max_length.trim() ? Number(questionForm.max_length) : null,
      required_modules: questionForm.required_modules,
      template: questionForm.template.trim() ? Number(questionForm.template) : null,
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

  // ── Module checkbox helpers ──

  function toggleModule(moduleId: number, list: number[]): number[] {
    return list.includes(moduleId)
      ? list.filter((id) => id !== moduleId)
      : [...list, moduleId];
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <header
        className="relative overflow-hidden border-b border-white/5"
        style={{
          background:
            'linear-gradient(135deg, #1C1917 0%, #231F1E 50%, #1C1917 100%)',
        }}
      >
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-[0.07] blur-3xl"
          style={{
            background: 'radial-gradient(circle, #0D9488, transparent 70%)',
          }}
        />
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="Volver al panel">
              <PipeAdmin size={32} />
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">
                Configuracion de onboarding
              </h1>
              <p className="text-xs text-white/50">
                {admin?.email ?? 'superadmin'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.06] px-3.5 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="fade-up-auth mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Ruta" className="mb-4">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            <li>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 transition-colors hover:text-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Panel
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </li>
            <li>
              <span className="text-slate-500">Configuracion</span>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </li>
            <li className="font-medium text-slate-700">Onboarding</li>
          </ol>
        </nav>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
            Onboarding
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Administra las paginas del sitio web y las preguntas del flujo de onboarding.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="pages" className="gap-1.5">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Paginas
              </TabsTrigger>
              <TabsTrigger value="questions" className="gap-1.5">
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
                Preguntas
              </TabsTrigger>
            </TabsList>

            {activeTab === 'pages' && (
              <button
                onClick={openCreatePage}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-500"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nueva pagina
              </button>
            )}
            {activeTab === 'questions' && (
              <button
                onClick={openCreateQuestion}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-500"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nueva pregunta
              </button>
            )}
          </div>

          {/* ── Tab 1: Paginas ── */}
          <TabsContent value="pages">
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
                      <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
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
                  Las paginas definen las secciones disponibles en los sitios web generados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-[1000px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Nombre
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Icono
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Obligatoria
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Por defecto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Modulos auto-include
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
                          <span className="block font-medium text-slate-900">
                            {p.label}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {p.key}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {p.icon || '\u2014'}
                        </td>
                        <td className="px-4 py-3">
                          {p.is_mandatory ? (
                            <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                              Si
                            </Badge>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.is_default ? (
                            <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                              Si
                            </Badge>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {modulesLabel(p.auto_include_modules_detail)}
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
                              aria-label={`Acciones para ${p.label}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
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

          {/* ── Tab 2: Preguntas ── */}
          <TabsContent value="questions">
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
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
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
        </Tabs>
      </main>

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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPage ? 'Editar pagina' : 'Nueva pagina'}
            </DialogTitle>
            <DialogDescription>
              {editingPage
                ? 'Modifica los datos de la pagina del sitio web.'
                : 'Define una nueva pagina disponible para sitios web.'}
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

          <form onSubmit={(e) => void handlePageSubmit(e)} className="space-y-4">
            {/* Key */}
            <div>
              <label htmlFor="page-key" className="mb-1.5 block text-sm font-medium text-slate-700">
                Key
              </label>
              <input
                id="page-key"
                type="text"
                required
                value={pageForm.key}
                onChange={(e) => setPageForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="ej. home, about, services"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Label */}
            <div>
              <label htmlFor="page-label" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                id="page-label"
                type="text"
                required
                value={pageForm.label}
                onChange={(e) => setPageForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="ej. Inicio, Nosotros, Servicios"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="page-description" className="mb-1.5 block text-sm font-medium text-slate-700">
                Descripcion
              </label>
              <textarea
                id="page-description"
                rows={2}
                value={pageForm.description}
                onChange={(e) => setPageForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Breve descripcion de la pagina"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Icon */}
            <div>
              <label htmlFor="page-icon" className="mb-1.5 block text-sm font-medium text-slate-700">
                Icono
              </label>
              <input
                id="page-icon"
                type="text"
                value={pageForm.icon}
                onChange={(e) => setPageForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="ej. home, info, briefcase"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Switches row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                <label htmlFor="page-mandatory" className="text-sm font-medium text-slate-700">
                  Obligatoria
                </label>
                <Switch
                  id="page-mandatory"
                  checked={pageForm.is_mandatory}
                  onCheckedChange={(v) => setPageForm((f) => ({ ...f, is_mandatory: v }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                <label htmlFor="page-default" className="text-sm font-medium text-slate-700">
                  Por defecto
                </label>
                <Switch
                  id="page-default"
                  checked={pageForm.is_default}
                  onCheckedChange={(v) => setPageForm((f) => ({ ...f, is_default: v }))}
                />
              </div>
            </div>

            {/* Sort order + Active */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="page-sort" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Orden
                </label>
                <input
                  id="page-sort"
                  type="number"
                  value={pageForm.sort_order}
                  onChange={(e) => setPageForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 self-end">
                <label htmlFor="page-active" className="text-sm font-medium text-slate-700">
                  Activa
                </label>
                <Switch
                  id="page-active"
                  checked={pageForm.is_active}
                  onCheckedChange={(v) => setPageForm((f) => ({ ...f, is_active: v }))}
                />
              </div>
            </div>

            {/* Auto-include modules */}
            {modules.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Modulos auto-include
                </label>
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
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pageSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-500 disabled:opacity-50"
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
                ? `Se eliminara permanentemente la pagina "${deletingPage.label}" (${deletingPage.key}). Esta accion no se puede deshacer.`
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
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
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
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
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
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
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
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
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
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
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
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20 sm:max-w-[200px]"
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
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
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={questionSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-500 disabled:opacity-50"
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
    </div>
  );
}
