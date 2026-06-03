'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SectionData } from '@/contexts/WebsiteContentContext';
import { UnsplashAttribution } from './shared';

export function GallerySection({ data }: { data: SectionData }) {
  const variant = data._variant || 'masonry';
  switch (variant) {
    case 'grid-uniform': return <GalleryGridUniform data={data} />;
    case 'slider': return <GallerySlider data={data} />;
    default: return <GalleryMasonry data={data} />;
  }
}

function GalleryLightbox({ images, currentIndex, onClose, onPrev, onNext }: {
  images: SectionData[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="gallery-lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="gallery-lightbox-close" onClick={onClose} aria-label="Cerrar">&times;</button>
      {images.length > 1 && (
        <>
          <button className="gallery-lightbox-nav gallery-lightbox-prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Anterior">&lsaquo;</button>
          <button className="gallery-lightbox-nav gallery-lightbox-next" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Siguiente">&rsaquo;</button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[currentIndex]?._image?.url || images[currentIndex]?.url || ''}
        alt={images[currentIndex]?._image?.alt || images[currentIndex]?.alt || `Imagen ${currentIndex + 1}`}
        onClick={(e) => e.stopPropagation()}
      />
      <UnsplashAttribution image={images[currentIndex]?._image || images[currentIndex]} className="hero-attribution" />
    </div>
  );
}

function useGalleryLightbox(images: SectionData[]) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => prev !== null ? (prev - 1 + images.length) % images.length : null);
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => prev !== null ? (prev + 1) % images.length : null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, images.length]);

  return {
    lightboxIndex,
    openLightbox: (i: number) => setLightboxIndex(i),
    closeLightbox: () => setLightboxIndex(null),
    prevImage: () => setLightboxIndex((prev) => prev !== null ? (prev - 1 + images.length) % images.length : null),
    nextImage: () => setLightboxIndex((prev) => prev !== null ? (prev + 1) % images.length : null),
  };
}

function getGalleryImages(data: SectionData): SectionData[] {
  return data.items || [];
}

function GalleryPlaceholder() {
  return (
    <div className="gallery-placeholder anim-fade-up">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="ph">Imagen {i + 1}</div>
      ))}
    </div>
  );
}

function GalleryMasonry({ data }: { data: SectionData }) {
  const images = getGalleryImages(data);
  const { lightboxIndex, openLightbox, closeLightbox, prevImage, nextImage } = useGalleryLightbox(images);
  const hasRealImages = images.some((img) => img._image?.url || img.url);

  return (
    <section className="section" data-section="gallery">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Galería</span>
          <h2 className="section-title">{data.title || 'Galería'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        {hasRealImages ? (
          <div className="gallery-masonry anim-fade-up stagger">
            {images.map((img, i) => {
              const url = img._image?.url || img.url;
              if (!url) return null;
              return (
                <button key={i} className="gallery-masonry-item" onClick={() => openLightbox(i)} type="button">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={img._image?.alt || img.alt || `Imagen ${i + 1}`} loading="lazy" />
                  <div className="gallery-item-overlay">
                    <span className="gallery-item-zoom">&#x2922;</span>
                  </div>
                  <UnsplashAttribution image={img._image || img} className="img-attribution" />
                </button>
              );
            })}
          </div>
        ) : (
          <GalleryPlaceholder />
        )}
      </div>
      {lightboxIndex !== null && (
        <GalleryLightbox images={images} currentIndex={lightboxIndex} onClose={closeLightbox} onPrev={prevImage} onNext={nextImage} />
      )}
    </section>
  );
}

function GalleryGridUniform({ data }: { data: SectionData }) {
  const images = getGalleryImages(data);
  const { lightboxIndex, openLightbox, closeLightbox, prevImage, nextImage } = useGalleryLightbox(images);
  const hasRealImages = images.some((img) => img._image?.url || img.url);

  return (
    <section className="section" data-section="gallery">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Galería</span>
          <h2 className="section-title">{data.title || 'Galería'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        {hasRealImages ? (
          <div className="gallery-grid anim-fade-up stagger">
            {images.map((img, i) => {
              const url = img._image?.url || img.url;
              if (!url) return null;
              return (
                <button key={i} className="gallery-item" onClick={() => openLightbox(i)} type="button">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={img._image?.alt || img.alt || `Imagen ${i + 1}`} loading="lazy" />
                  <div className="gallery-item-overlay">
                    <span className="gallery-item-zoom">&#x2922;</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <GalleryPlaceholder />
        )}
      </div>
      {lightboxIndex !== null && (
        <GalleryLightbox images={images} currentIndex={lightboxIndex} onClose={closeLightbox} onPrev={prevImage} onNext={nextImage} />
      )}
    </section>
  );
}

function GallerySlider({ data }: { data: SectionData }) {
  const images = getGalleryImages(data);
  const { lightboxIndex, openLightbox, closeLightbox, prevImage, nextImage } = useGalleryLightbox(images);
  const sliderRef = useRef<HTMLDivElement>(null);
  const hasRealImages = images.some((img) => img._image?.url || img.url);

  const scrollTo = useCallback((direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const amount = sliderRef.current.clientWidth * 0.8;
    sliderRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  return (
    <section className="section" data-section="gallery">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Galería</span>
          <h2 className="section-title">{data.title || 'Galería'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        {hasRealImages ? (
          <div className="gallery-slider-wrap anim-fade-up">
            <button className="gallery-slider-nav gallery-slider-prev" onClick={() => scrollTo('left')} type="button" aria-label="Anterior">&lsaquo;</button>
            <div ref={sliderRef} className="gallery-slider">
              {images.map((img, i) => {
                const url = img._image?.url || img.url;
                if (!url) return null;
                return (
                  <button key={i} className="gallery-slider-item" onClick={() => openLightbox(i)} type="button">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={img._image?.alt || img.alt || `Imagen ${i + 1}`} loading="lazy" />
                  </button>
                );
              })}
            </div>
            <button className="gallery-slider-nav gallery-slider-next" onClick={() => scrollTo('right')} type="button" aria-label="Siguiente">&rsaquo;</button>
          </div>
        ) : (
          <GalleryPlaceholder />
        )}
      </div>
      {lightboxIndex !== null && (
        <GalleryLightbox images={images} currentIndex={lightboxIndex} onClose={closeLightbox} onPrev={prevImage} onNext={nextImage} />
      )}
    </section>
  );
}
