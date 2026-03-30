"use client";

import Image from "next/image";
import { useState } from "react";

interface ImageGalleryProps {
  mainImage: string;
  images: string[];
  title: string;
}

export default function ImageGallery({ mainImage, images, title }: ImageGalleryProps) {
  const allImages = [mainImage, ...images];
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="space-y-3">
      {/* Hero Image */}
      <div className="relative w-full h-[400px] rounded-xl overflow-hidden">
        <Image
          src={allImages[activeIndex]}
          alt={`${title} — image ${activeIndex + 1}`}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 1200px"
        />
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
