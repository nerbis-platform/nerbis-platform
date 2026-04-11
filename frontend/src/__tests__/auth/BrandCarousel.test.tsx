import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrandCarousel } from '@/components/auth/BrandCarousel';
import type { BrandSlide } from '@/components/auth/types';

const mockSlides: BrandSlide[] = [
  {
    id: 'slide-1',
    headline: 'Headline One',
    subtitle: 'Subtitle one description',
    features: ['Feature A', 'Feature B'],
  },
  {
    id: 'slide-2',
    headline: 'Headline Two',
    subtitle: 'Subtitle two description',
    features: ['Feature C'],
  },
  {
    id: 'slide-3',
    headline: 'Headline Three',
    subtitle: 'Subtitle three description',
    features: ['Feature D', 'Feature E'],
  },
];

// Mock matchMedia for reduced-motion detection
function mockMatchMedia(matches = false) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
}

describe('BrandCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders nothing with empty slides array', () => {
    const { container } = render(<BrandCarousel slides={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders all slide headlines', () => {
    render(<BrandCarousel slides={mockSlides} />);

    expect(screen.getByText('Headline One')).toBeInTheDocument();
    expect(screen.getByText('Headline Two')).toBeInTheDocument();
    expect(screen.getByText('Headline Three')).toBeInTheDocument();
  });

  it('renders feature chips for visible slide', () => {
    render(<BrandCarousel slides={mockSlides} />);

    expect(screen.getByText('Feature A')).toBeInTheDocument();
    expect(screen.getByText('Feature B')).toBeInTheDocument();
  });

  it('renders dot indicators for each slide', () => {
    render(<BrandCarousel slides={mockSlides} />);

    expect(screen.getByLabelText('Ir a slide 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir a slide 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir a slide 3')).toBeInTheDocument();
  });

  it('does not render dot indicators with single slide', () => {
    render(<BrandCarousel slides={[mockSlides[0]]} />);

    expect(screen.queryByLabelText('Ir a slide 1')).not.toBeInTheDocument();
  });

  it('changes slide on dot click', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<BrandCarousel slides={mockSlides} />);

    const dot2 = screen.getByLabelText('Ir a slide 2');
    await user.click(dot2);

    // Slide 2 should become active (aria-current)
    expect(dot2).toHaveAttribute('aria-current', 'true');
    vi.useFakeTimers();
  });

  it('does NOT auto-advance slides (manual navigation only)', async () => {
    render(<BrandCarousel slides={mockSlides} interval={3000} />);

    const dot1 = screen.getByLabelText('Ir a slide 1');
    expect(dot1).toHaveAttribute('aria-current', 'true');

    // After interval passes, slide should NOT change (auto-advance disabled)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Slide 1 should still be active
    expect(dot1).toHaveAttribute('aria-current', 'true');
  });

  it('has carousel accessibility attributes', () => {
    render(<BrandCarousel slides={mockSlides} />);

    const carousel = screen.getByRole('region', { name: 'Propuestas de valor de NERBIS' });
    expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
  });

  it('marks slides with aria-roledescription="slide"', () => {
    render(<BrandCarousel slides={mockSlides} />);

    const slides = screen.getAllByRole('group');
    for (const slide of slides) {
      expect(slide).toHaveAttribute('aria-roledescription', 'slide');
    }
  });

  it('hides inactive slides with aria-hidden', () => {
    render(<BrandCarousel slides={mockSlides} />);

    const slides = screen.getAllByRole('group', { hidden: true });
    // First slide visible, rest hidden
    expect(slides[0]).toHaveAttribute('aria-hidden', 'false');
    expect(slides[1]).toHaveAttribute('aria-hidden', 'true');
    expect(slides[2]).toHaveAttribute('aria-hidden', 'true');
  });
});
