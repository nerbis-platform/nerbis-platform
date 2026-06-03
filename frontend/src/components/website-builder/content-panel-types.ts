export interface SectionContent {
  title?: string;
  subtitle?: string;
  content?: string;
  cta_text?: string;
  cta_link?: string;
  highlights?: string[];
  items?: Record<string, unknown>[];
  phone?: string;
  email?: string;
  address?: string;
  whatsapp?: string;
  hours?: string;
  [key: string]: unknown;
}

export interface ContentPanelProps {
  sectionKey: string;
  content: SectionContent;
  onSaveEdit: (content: SectionContent, mediaUpdates?: Record<string, unknown>, seoUpdates?: Record<string, unknown>) => Promise<void> | void;
  onVariantChange?: (variant: string) => void;
  isVariantLoading?: boolean;
  onUploadMedia?: (file: File) => Promise<{ url: string }>;
  onFieldChange?: (sectionKey: string, field: string, value: unknown) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onContentChange?: (content: SectionContent) => void;
  saveRef?: React.RefObject<(() => Promise<void>) | null>;
  contentSetRef?: React.RefObject<((content: SectionContent) => void) | null>;
  // Header/Footer specific
  mediaData?: Record<string, unknown>;
  seoData?: Record<string, unknown>;
  contactContent?: SectionContent;
  availableNavSections?: string[];
  onNavigateToSection?: (sectionId: string) => void;
  contactWhatsapp?: string;
  industry?: string;
}
