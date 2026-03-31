"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

interface ImageGalleryProps {
  mainImage: string;
  images: string[];
  title: string;
}

export default function ImageGallery({ mainImage, images, title }: ImageGalleryProps) {
  const allImages = [mainImage, ...images];
  const [activeIndex, setActiveIndex] = useState(0);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % allImages.length);
  }, [allImages.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  return (
    <div className="space-y-3">
      {/* Hero Image */}
      <div className="relative w-full h-[400px] rounded-xl overflow-hidden group">
        <Image
          src={allImages[activeIndex]}
          alt={`${title} — image ${activeIndex + 1}`}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 1200px"
        />

        {/* Left arrow */}
        <button
          onClick={goPrev}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-navy/60 hover:bg-navy/80 text-white rounded-full p-2 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Right arrow */}
        <button
          onClick={goNext}
          aria-label="Next image"
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-navy/60 hover:bg-navy/80 text-white rounded-full p-2 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Image counter badge */}
        <div className="absolute bottom-4 right-4 bg-navy/70 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
          {activeIndex + 1} / {allImages.length}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-3">
        {allImages.slice(1, 5).map((img, i) => {
          const realIndex = i + 1;
          return (
            <button
              key={img}
              onClick={() => setActiveIndex(realIndex)}
              className={`relative h-24 rounded-lg overflow-hidden transition-all ${
                activeIndex === realIndex
                  ? "ring-2 ring-ardhi ring-offset-2"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={img}
                alt={`${title} — thumbnail ${realIndex}`}
                fill
                className="object-cover"
                sizes="300px"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
