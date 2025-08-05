"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGlobalT } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const onboardingData = [
  {
    image: "/images/onboarding/onboarding_glossary.png",
    title: "약속된 용어로 소통해야 팀의 효율과 서비스 개발 속도가 빨라집니다.",
    description: "SpecLive에서 용어집을 제대로 관리해보세요.",
  },
  {
    image: "/images/onboarding/onboarding_policy.png",
    title: "그동안 여기저기 흩어져있던 서비스 기능과 정책들,",
    description: "SpecLive에서 체계적으로 관리할 수 있어요.",
  },
  {
    image: "/images/onboarding/onboarding_ai.png",
    title: "새롭게 기획하는 서비스? 더 발전시킬 서비스?",
    description: "어느 것이라도 AI의 스마트한 기능 및 정책 제안을 받아보세요.",
  },
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const t = useGlobalT();

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="relative">
          <DialogTitle className="text-center text-xl font-semibold">
            SpecLive 소개
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute right-0 top-0 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
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
                  <div className="relative w-full max-w-md h-64">
                    <Image
                      src={slide.image}
                      alt={`Onboarding slide ${index + 1}`}
                      fill
                      style={{ objectFit: "contain" }}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="text-center space-y-2 max-w-md">
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
