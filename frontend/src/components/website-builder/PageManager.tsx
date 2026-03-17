'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  Plus,
  Trash2,
  Globe,
  LayoutTemplate,
  Check,
  GripVertical,
  Menu,
  Home,
  BookOpen,
  Wrench,
  ShoppingBag,
  Phone,
  Star,
  Image,
  DollarSign,
  HelpCircle,
  PanelBottom,
  Users,
  PenLine,
  Sparkles,
  BarChart3,
  FileText,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { PagesData, SitePage } from '@/types';
import SectionLibrary from './SectionLibrary';

const SECTION_LABELS: Record<string, string> = {
  header: 'Menú principal',
  hero: 'Inicio',
  about: 'Sobre Nosotros',
  services: 'Servicios',
  products: 'Productos',
  contact: 'Contacto',
  testimonials: 'Testimonios',
  gallery: 'Galería',
  pricing: 'Precios',
  faq: 'Preguntas frecuentes',
  footer: 'Pie de página',
  team: 'Equipo',
  blog: 'Blog',
  features: 'Características',
  stats: 'Estadísticas',
};

const SECTION_ICONS: Record<string, LucideIcon> = {
  header: Menu,
  hero: Home,
  about: BookOpen,
  services: Wrench,
  products: ShoppingBag,
  contact: Phone,
  testimonials: Star,
  gallery: Image,
  pricing: DollarSign,
  faq: HelpCircle,
  footer: PanelBottom,
  team: Users,
  blog: PenLine,
  features: Sparkles,
  stats: BarChart3,
};

const PAGE_ICONS: Record<string, LucideIcon> = {
  home: Home,
  about: BookOpen,
  services: Wrench,
  products: ShoppingBag,
  contact: Phone,
  pricing: DollarSign,
  blog: PenLine,
  gallery: Image,
  faq: HelpCircle,
};

interface SectionInfo {
  id: string;
  name: string;
  required: boolean;
}

interface PageManagerProps {
  pagesData: PagesData;
  activePage: string;
  activeSection: string;
  allSections: SectionInfo[];
  editorContent?: React.ReactNode;
  onSelectPage: (pageId: string) => void;
  onSelectSection: (sectionId: string) => void;
  onAddPage: (page: SitePage) => void;
  onRemovePage: (pageId: string) => void;
  onUpdatePages: (pagesData: PagesData) => void;
  onAddSectionWithContent?: (sectionId: string, initialContent?: Record<string, unknown>, variant?: string) => void;
}

export default function PageManager({
  pagesData,
  activePage,
  activeSection,
  allSections,
  editorContent,
  onSelectPage,
  onSelectSection,
  onAddPage,
  onRemovePage,
  onUpdatePages,
  onAddSectionWithContent,
}: PageManagerProps) {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set([activePage]));
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [addSectionForPage, setAddSectionForPage] = useState<string | null>(null);
  const [editorCollapsed, setEditorCollapsed] = useState(false);

  // Reset collapsed state when active section changes
  useEffect(() => {
    const t = setTimeout(() => setEditorCollapsed(false), 0);
    return () => clearTimeout(t);
  }, [activeSection]);

  const global = pagesData?.global || { sections: [], content: {} };
  const pages = pagesData?.pages || [];
  const globalSectionIds = new Set(global.sections);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleExpand = (pageId: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const handleSelectPage = (pageId: string) => {
    onSelectPage(pageId);
    setExpandedPages(prev => new Set(prev).add(pageId));
  };

  const handleAddPage = () => {
    const name = newPageName.trim();
    if (!name) return;
    const id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const slug = `/${id}`;
    const newPage: SitePage = {
      id,
      slug,
      name,
      order: pages.length,
      sections: [],
      content: {},
      seo: {},
    };
    onAddPage(newPage);
    setNewPageName('');
    setShowAddPage(false);
    setExpandedPages(prev => new Set(prev).add(id));
  };

  // ─── Section management within pages ─────────────────────

  const handleDragEnd = (pageId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const page = pages.find(p => p.id === pageId);
      if (!page) return;
      const oldIndex = page.sections.indexOf(String(active.id));
      const newIndex = page.sections.indexOf(String(over.id));
      const newSections = arrayMove(page.sections, oldIndex, newIndex);

      onUpdatePages({
        ...pagesData,
        pages: pages.map(p =>
          p.id === pageId ? { ...p, sections: newSections } : p
        ),
      });
    }
  };

  const handleAddSectionToPage = (pageId: string, sectionId: string, initialContent?: Record<string, unknown>, variant?: string) => {
    onUpdatePages({
      ...pagesData,
      pages: pages.map(p =>
        p.id === pageId ? { ...p, sections: [...p.sections, sectionId] } : p
      ),
    });
    setAddSectionForPage(null);
    handleSelectPage(pageId);
    onSelectSection(sectionId);
    // If initial content or variant provided, propagate via onAddSectionWithContent
    if (initialContent || variant) {
      onAddSectionWithContent?.(sectionId, initialContent, variant);
    }
  };

  const handleRemoveSectionFromPage = (pageId: string, sectionId: string) => {
    onUpdatePages({
      ...pagesData,
      pages: pages.map(p =>
        p.id === pageId ? { ...p, sections: p.sections.filter(s => s !== sectionId) } : p
      ),
    });
    if (activeSection === sectionId) onSelectSection('');
  };

  const getAvailableSections = (page: SitePage) => {
    const existingSet = new Set(page.sections);
    return allSections.filter(s => !globalSectionIds.has(s.id) && !existingSet.has(s.id));
  };

  const hasGlobal = global.sections.length > 0;

  return (
    <div className="space-y-1.5 bg-gray-50/80 rounded-2xl p-2">

      {/* ── GLOBAL (Header / Footer) ── */}
      {hasGlobal && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#E2F3F1]">
              <Globe className="h-3.5 w-3.5 text-[#1C3B57]" />
            </div>
            <span className="text-[0.78rem] font-semibold text-[#1C3B57]">Estructura</span>
          </div>
          <div className="px-3 pt-0 pb-2 space-y-1">
            {global.sections.map(sid => {
              const Icon = SECTION_ICONS[sid] || FileText;
              const isActive = activeSection === sid;
              const isEditorOpen = isActive && !!editorContent && !editorCollapsed;
              return (
                <React.Fragment key={sid}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isActive) setEditorCollapsed(prev => !prev);
                      else onSelectSection(sid);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[0.78rem] transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#E2F3F1] text-[#1C3B57] font-medium shadow-sm ring-1 ring-[#0D9488]/30'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-5 h-5 rounded-md transition-colors duration-200 ${
                      isActive ? 'bg-[#1C3B57]/10' : 'bg-white'
                    }`}>
                      <Icon className={`h-3 w-3 transition-colors duration-200 ${
                        isActive ? 'text-[#1C3B57]' : 'text-gray-400'
                      }`} />
                    </div>
                    <span className="flex-1">{SECTION_LABELS[sid] || sid}</span>
                    {isActive && editorContent && (
                      <ChevronDown className={`h-3 w-3 text-[#1C3B57]/40 transition-transform duration-200 ${editorCollapsed ? '-rotate-90' : ''}`} />
                    )}
                  </button>
                  {isActive && editorContent && (
                    <div
                      className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                      style={{ gridTemplateRows: isEditorOpen ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden min-h-0">
                        <div className="mt-1 mb-1.5 ml-1 pl-3 border-l-2 border-[#0D9488]/30">
                          {editorContent}
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PAGINAS ── */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#E2F3F1]">
            <LayoutTemplate className="h-3.5 w-3.5 text-[#1C3B57]" />
          </div>
          <span className="text-[0.78rem] font-semibold text-[#1C3B57]">Paginas</span>
        </div>

        <div className="px-3 pt-0 pb-2 space-y-0.5">
          {pages.map(page => {
            const isActive = activePage === page.id;
            const isExpanded = expandedPages.has(page.id);
            const isHome = page.id === 'home';
            const availableSections = getAvailableSections(page);
            const isAddingSection = addSectionForPage === page.id;
            const PageIcon = PAGE_ICONS[page.id] || FileText;

            return (
              <div key={page.id} className="group/page">
                {/* Page header */}
                <div
                  className={`flex items-center gap-1 rounded-lg transition-all ${
                    isActive ? 'bg-[#E2F3F1]' : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(page.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPage(page.id)}
                    className={`flex-1 flex items-center gap-2.5 py-2 pr-1 text-left text-[0.78rem] cursor-pointer ${
                      isActive ? 'text-[#1C3B57] font-semibold' : 'text-gray-600'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-5 h-5 rounded-md transition-colors duration-200 ${
                      isActive ? 'bg-[#1C3B57]/10' : 'bg-gray-100'
                    }`}>
                      <PageIcon className={`h-3 w-3 transition-colors duration-200 ${
                        isActive ? 'text-[#1C3B57]' : 'text-gray-400'
                      }`} />
                    </div>
                    <span className="flex-1">{page.name}</span>
                  </button>

                  {!isHome && (
                    <button
                      type="button"
                      onClick={() => onRemovePage(page.id)}
                      className="p-1.5 mr-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer opacity-0 group-hover/page:opacity-100"
                      title="Eliminar pagina"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Expanded: page sections with drag & drop */}
                {isExpanded && (
                  <div className="ml-6 mt-0.5 pb-1 border-l border-gray-100 pl-2">
                    {page.sections.length > 0 ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd(page.id)}
                      >
                        <SortableContext
                          items={page.sections}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-1">
                            {page.sections.map(sid => {
                              const isSectionActive = activeSection === sid && isActive;
                              const isSectionEditorOpen = isSectionActive && !!editorContent && !editorCollapsed;
                              return (
                                <React.Fragment key={sid}>
                                  <SortablePageSection
                                    id={sid}
                                    isActive={isSectionActive}
                                    hasEditor={isSectionActive && !!editorContent}
                                    isEditorCollapsed={editorCollapsed}
                                    onClick={() => {
                                      if (isSectionActive) {
                                        setEditorCollapsed(prev => !prev);
                                      } else {
                                        handleSelectPage(page.id);
                                        onSelectSection(sid);
                                      }
                                    }}
                                    onRemove={() => handleRemoveSectionFromPage(page.id, sid)}
                                  />
                                  {isSectionActive && editorContent && (
                                    <div
                                      className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                                      style={{ gridTemplateRows: isSectionEditorOpen ? '1fr' : '0fr' }}
                                    >
                                      <div className="overflow-hidden min-h-0">
                                        <div className="mt-1 mb-1.5 ml-1 pl-3 border-l-2 border-[#0D9488]/30">
                                          {editorContent}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      !availableSections.length && (
                        <p className="text-[0.72rem] text-gray-400 italic px-2 py-1">
                          Sin secciones
                        </p>
                      )
                    )}

                    {availableSections.length > 0 && (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => setAddSectionForPage(page.id)}
                          className="w-full flex items-center justify-center gap-1 h-7 rounded-lg border border-dashed border-gray-200 text-[0.7rem] text-gray-400 font-medium hover:border-[#0D9488] hover:text-[#1C3B57] transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          Agregar seccion
                        </button>

                        {isAddingSection && (
                          <SectionLibrary
                            availableSections={availableSections}
                            onAdd={(sectionId, content, variant) => {
                              handleAddSectionToPage(page.id, sectionId, content, variant);
                            }}
                            onClose={() => setAddSectionForPage(null)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add page */}
          {showAddPage ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                value={newPageName}
                onChange={e => setNewPageName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddPage();
                  if (e.key === 'Escape') { setShowAddPage(false); setNewPageName(''); }
                }}
                placeholder="Ej: Nosotros"
                className="flex-1 h-8 text-[0.78rem] border border-gray-200 rounded-lg px-2.5 focus:outline-none focus:border-[#0D9488]"
              />
              <button
                type="button"
                onClick={handleAddPage}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#1C3B57] text-white hover:bg-[#1C3B57]/90 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { setShowAddPage(false); setNewPageName(''); }}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddPage(true)}
              className="mt-1.5 w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-dashed border-gray-200 text-[0.72rem] text-gray-400 font-medium hover:border-[#0D9488] hover:text-[#1C3B57] transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Nueva pagina
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable section within a page ─────────────────────────
function SortablePageSection({
  id,
  isActive,
  hasEditor,
  isEditorCollapsed,
  onClick,
  onRemove,
}: {
  id: string;
  isActive: boolean;
  hasEditor?: boolean;
  isEditorCollapsed?: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto' as number | string,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center rounded-lg transition-all ${
        isActive
          ? 'bg-[#E2F3F1] text-[#1C3B57] shadow-sm ring-1 ring-[#0D9488]/30'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
      } ${isDragging ? 'shadow-md' : ''}`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="p-1.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>

      {/* Section button */}
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 flex items-center gap-2 py-1.5 pr-1 text-left text-[0.78rem] font-medium cursor-pointer`}
      >
        {(() => { const Icon = SECTION_ICONS[id] || FileText; return (
          <div className={`flex items-center justify-center w-5 h-5 rounded-md transition-colors duration-200 ${
            isActive ? 'bg-[#1C3B57]/10' : 'bg-white'
          }`}>
            <Icon className={`h-3 w-3 transition-colors duration-200 ${
              isActive ? 'text-[#1C3B57]' : 'text-gray-400'
            }`} />
          </div>
        ); })()}
        <span className="flex-1">{SECTION_LABELS[id] || id}</span>
        {hasEditor && (
          <ChevronDown className={`h-3 w-3 text-[#1C3B57]/40 transition-transform duration-200 ${isEditorCollapsed ? '-rotate-90' : ''}`} />
        )}
      </button>

      {/* Remove section */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="p-1 mr-1 rounded-md text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
