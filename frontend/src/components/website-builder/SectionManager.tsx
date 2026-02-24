'use client';

import { useState } from 'react';
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
import { GripVertical, Plus, Trash2, X } from 'lucide-react';

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
  onAdd: (sectionId: string) => void;
  onRemove: (sectionId: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  header: 'Menú / Nav',
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
}: SectionManagerProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {sections.map((id) => (
              <SortableSection
                key={id}
                id={id}
                isActive={activeSection === id}
                isRequired={requiredMap.get(id) ?? false}
                onClick={() => onSelectSection(id)}
                onRemove={() => onRemove(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add section button */}
      {availableToAdd.length > 0 && (
        <div className="relative mt-3">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-gray-300 text-[0.78rem] text-gray-500 font-medium hover:border-[#95D0C9] hover:text-[#1C3B57] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar sección
          </button>

          {showAddMenu && (
            <div className="absolute top-11 left-0 right-0 z-20 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <p className="text-[0.72rem] font-medium text-gray-500">Secciones disponibles</p>
                <button
                  type="button"
                  onClick={() => setShowAddMenu(false)}
                  className="p-0.5 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </button>
              </div>
              {availableToAdd.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    onAdd(section.id);
                    setShowAddMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[0.82rem] text-gray-600 hover:bg-[#E2F3F1]/50 transition-colors cursor-pointer"
                >
                  <span className="text-base">{SECTION_ICONS[section.id] || '📄'}</span>
                  {SECTION_LABELS[section.id] || section.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sortable section item ───────────────────────────────────
function SortableSection({
  id,
  isActive,
  isRequired,
  onClick,
  onRemove,
}: {
  id: string;
  isActive: boolean;
  isRequired: boolean;
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
          ? 'bg-[#E2F3F1] text-[#1C3B57]'
          : 'text-gray-500 hover:bg-gray-50'
      } ${isDragging ? 'shadow-md' : ''}`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="p-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
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

      {/* Delete button (only for non-required sections) */}
      {!isRequired && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 mr-1 rounded-md text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
