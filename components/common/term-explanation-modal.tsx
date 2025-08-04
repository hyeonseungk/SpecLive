"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalT } from "@/lib/i18n";
import { FileText, Target, Users, X, Zap } from "lucide-react";

interface TermExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermExplanationModal({
  isOpen,
  onClose,
}: TermExplanationModalProps) {
  const t = useGlobalT();

  if (!isOpen) return null;

  const terms = [
    {
      icon: Users,
      title: "액터 (Actor)",
      description:
        "시스템과 상호작용하는 사용자나 외부 시스템을 의미합니다. 예를 들어, '관리자', '일반 사용자', '결제 시스템' 등이 액터가 될 수 있습니다.",
      examples: [
        "• 웹사이트의 일반 사용자",
        "• 시스템 관리자",
        "• 외부 결제 서비스",
        "• 모바일 앱 사용자",
      ],
    },
    {
      icon: Target,
      title: "유즈케이스 (Use Case)",
      description:
        "액터가 시스템을 통해 달성하려는 목표나 수행하려는 작업을 의미합니다. 각 유즈케이스는 특정 액터와 연결되어 있습니다.",
      examples: [
        "• 회원가입하기",
        "• 상품 주문하기",
        "• 결제 처리하기",
        "• 주문 내역 조회하기",
      ],
    },
    {
      icon: Zap,
      title: "기능 (Feature)",
      description:
        "유즈케이스를 구현하기 위해 필요한 구체적인 시스템 기능을 의미합니다. 각 기능은 특정 유즈케이스에 속하며, 실제로 개발되어야 할 기능들입니다.",
      examples: [
        "• 이메일 인증 코드 발송",
        "• 카드 결제 처리",
        "• 주문 상태 업데이트",
        "• 배송 정보 조회",
      ],
    },
    {
      icon: FileText,
      title: "정책 (Policy)",
      description:
        "기능이 어떻게 동작해야 하는지에 대한 규칙과 가이드라인을 의미합니다. 정책은 기능의 구현 방향과 제약사항을 정의합니다.",
      examples: [
        "• 비밀번호는 8자 이상이어야 함",
        "• 결제 실패 시 3회까지 재시도 가능",
        "• 개인정보는 암호화하여 저장",
        "• 주문 취소는 배송 전까지만 가능",
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">용어 설명</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 스크롤 가능한 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {terms.map((term, index) => {
              const IconComponent = term.icon;
              return (
                <Card
                  key={index}
                  className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg text-gray-900">
                        {term.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {term.description}
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">예시:</h4>
                      <ul className="space-y-1">
                        {term.examples.map((example, exampleIndex) => (
                          <li
                            key={exampleIndex}
                            className="text-sm text-gray-600"
                          >
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              이 용어들은 시스템 설계와 개발 과정에서 일관된 소통을 돕습니다.
            </p>
            <Button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              이해했습니다
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
