"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGlobalT } from "@/lib/i18n";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getOnboardingData = (t: any) => [
  {
    image: "/images/onboarding/onboarding_glossary.png",
    title: t("onboarding.slides.glossary.title"),
    description: t("onboarding.slides.glossary.description"),
  },
  {
    image: "/images/onboarding/onboarding_policy.png",
    title: t("onboarding.slides.policy.title"),
    description: t("onboarding.slides.policy.description"),
  },
  {
    image: "/images/onboarding/onboarding_ai.png",
    title: t("onboarding.slides.ai.title"),
    description: t("onboarding.slides.ai.description"),
  },
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const t = useGlobalT();
  const onboardingData = getOnboardingData(t);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % onboardingData.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? onboardingData.length - 1 : prev - 1
    );
  };

  const handleClose = () => {
    setCurrentSlide(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[98vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            {t("onboarding.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Carousel Container */}
          <div className="relative overflow-hidden rounded-lg">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              {onboardingData.map((slide, index) => (
                <div
                  key={index}
                  className="w-full flex-shrink-0 flex flex-col items-center space-y-6 p-6"
                >
                  <div className="relative w-full max-w-4xl h-[500px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg transform rotate-1 scale-105 opacity-15"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl shadow-lg transform -rotate-1 scale-105 opacity-15"></div>
                    <div className="relative w-full h-full bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                      <Image
                        src={slide.image}
                        alt={`Onboarding slide ${index + 1}`}
                        fill
                        style={{ objectFit: "contain" }}
                        className="rounded-2xl p-4"
                      />
                    </div>
                  </div>
                  <div className="text-center space-y-2 max-w-2xl">
                    <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
                      {slide.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {slide.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full bg-white/80 hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full bg-white/80 hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-2 mt-6">
            {onboardingData.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSlide
                    ? "bg-primary"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
