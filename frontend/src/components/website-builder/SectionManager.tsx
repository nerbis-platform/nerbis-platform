'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
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
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import SectionLibrary from './SectionLibrary';

interface SectionInfo {
  id: string;
  name: string;
  required: boolean;
}

interface SectionManagerProps {
  sections: string[];
  allSections: SectionInfo[];
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  onReorder: (newOrder: string[]) => void;
  onAdd: (sectionId: string, initialContent?: Record<string, unknown>, variant?: string) => void;
  onRemove: (sectionId: string) => void;
  onDuplicate?: (sectionId: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  header: 'Menú principal',
  hero: 'Inicio',
  about: 'Sobre nosotros',
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
};

const SECTION_ICONS: Record<string, string> = {
  header: '🧭',
  hero: '🏠',
  about: '📖',
  services: '⚙️',
  products: '🛍️',
  contact: '📞',
  testimonials: '⭐',
  gallery: '🖼️',
  pricing: '💰',
  faq: '❓',
  footer: '📋',
  team: '👥',
  blog: '✍️',
};

export default function SectionManager({
  sections,
  allSections,
  activeSection,
  onSelectSection,
  onReorder,
  onAdd,
  onRemove,
  onDuplicate,
}: SectionManagerProps) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oldIndex = sections.indexOf(String(active.id));
      const newIndex = sections.indexOf(String(over.id));
      const newOrder = arrayMove(sections, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  // Sections available to add (in template but not in content)
  const availableToAdd = allSections.filter((s) => !sections.includes(s.id));

  // Get required status for each section
  const requiredMap = new Map(allSections.map((s) => [s.id, s.required]));

  return (
    <div>
      <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
        Secciones
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sections} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {sections.map((id) => (
              <SortableSection
                key={id}
                id={id}
                isActive={activeSection === id}
                isRequired={requiredMap.get(id) ?? false}
                isDragTarget={activeId !== null && activeId !== id}
                onClick={() => onSelectSection(id)}
                onRemove={() => onRemove(id)}
                onDuplicate={onDuplicate ? () => onDuplicate(id) : undefined}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        }}>
          {activeId ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl shadow-lg border-2 border-[#0D9488] scale-[1.02]">
              <GripVertical className="h-3.5 w-3.5 text-[#0D9488]" />
              <span className="text-base">{SECTION_ICONS[activeId] || '📄'}</span>
              <span className="text-[0.82rem] font-medium text-[#1C3B57]">
                {SECTION_LABELS[activeId] || activeId}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add section button */}
      {availableToAdd.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-gray-300 text-[0.78rem] text-gray-500 font-medium hover:border-[#0D9488] hover:text-[#1C3B57] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar sección
          </button>
        </div>
      )}

      {/* Section Library Modal */}
      {showLibrary && (
        <SectionLibrary
          availableSections={availableToAdd}
          onAdd={(id, content, variant) => {
            onAdd(id, content, variant);
            setShowLibrary(false);
          }}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}

// ─── Sortable section item ───────────────────────────────────
function SortableSection({
  id,
  isActive,
  isRequired,
  isDragTarget,
  onClick,
  onRemove,
  onDuplicate,
}: {
  id: string;
  isActive: boolean;
  isRequired: boolean;
  isDragTarget: boolean;
  onClick: () => void;
  onRemove: () => void;
  onDuplicate?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    transition: {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center rounded-lg transition-all duration-200 ${
        isDragging
          ? 'opacity-40 bg-[#E2F3F1]/50 border border-dashed border-[#0D9488] rounded-lg'
          : isActive
            ? 'bg-[#E2F3F1] text-[#1C3B57]'
            : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      {/* Drop indicator line */}
      {isOver && isDragTarget && (
        <div className="absolute -top-0.75 left-2 right-2 h-0.5 bg-[#0D9488] rounded-full z-10">
          <div className="absolute -left-1 -top-0.75 w-2 h-2 rounded-full bg-[#0D9488]" />
          <div className="absolute -right-1 -top-0.75 w-2 h-2 rounded-full bg-[#0D9488]" />
        </div>
      )}

      {/* Drag handle */}
      <button
        type="button"
        className="p-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-[#0D9488] transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Section button */}
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 flex items-center gap-2 py-2.5 pr-2 text-left text-[0.82rem] cursor-pointer ${
          isActive ? 'font-medium' : ''
        }`}
      >
        <span className="text-base">{SECTION_ICONS[id] || '📄'}</span>
        {SECTION_LABELS[id] || id}
      </button>

      {/* Action buttons */}
      {!isDragging && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1.5 rounded-md text-gray-400 hover:text-[#1C3B57] hover:bg-[#E2F3F1] transition-all cursor-pointer"
              title="Duplicar sección"
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
          {!isRequired && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-1.5 mr-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
              title="Eliminar sección"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
