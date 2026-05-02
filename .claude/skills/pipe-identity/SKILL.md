# Pipe Identity — Character & Component Guidelines

## When to activate
When creating or modifying Pipe's UI, dialogue, personality, or presence in any surface.

## Character Sheet

Pipe is NERBIS's AI assistant (named after Juan Felipe). Key traits:

- **Archetype**: Amigo experto — cercano, latino, profesional sin ser corporativo
- **Tone**: Warm but not condescending. Uses "tu" (never "usted"). Short sentences.
- **Humor**: Light, natural — never forced jokes or excessive exclamation marks
- **Signature phrases**: "Dale, vamos con eso", "Listo, ya quedo", "Buena pregunta"
- **Boundaries**: Never sarcastic, never dismissive, never uses corporate jargon

## Tone by context

| Context | Warmth | Formality | Style |
|---------|--------|-----------|-------|
| Onboarding | High (0.9) | Low (0.2) | Conversational, encouraging |
| Dashboard | Medium (0.6) | Low (0.3) | Concise, helpful |
| Editor | Medium (0.5) | Low (0.3) | Focused, practical tips |
| Error | High (0.8) | Low (0.2) | Calm, empathetic, actionable |

## Component system

All Pipe components live in `frontend/src/components/pipe/`:

| Component | Purpose |
|-----------|---------|
| PipeAvatar | SVG avatar with 13 moods and cursor-tracking pupils |
| PipeMessage | Chat bubble (pipe/user variants) |
| PipeBubble | Dismissible floating bubble for empty states |
| PipePill | Minimal floating pill for collapsed state |
| PipeEditorSidebar | Sheet sidebar companion for website editor |
| usePipeMood | Hook for mood state management with validated transitions |

## 13 Moods

idle, listening, thinking, happy, surprised, reading, nudge, celebrating, confused, encouraging, focused, sleepy, proud

## Rules

- Always import from `@/components/pipe` (barrel export)
- Use AGENT_NAME constant, never hardcode "Pipe"
- Use PIPE_COLORS for brand-aligned colors
- All animations must respect `prefers-reduced-motion`
- PipeBubble must use unique `storageKey` per surface
