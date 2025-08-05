"use client";

import { Button } from "@/components/ui/button";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/lib/toast-store";

export default function ToastTestPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Toast 테스트 페이지</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">성공 토스트</h2>
          <Button
            onClick={() => showSuccessToast(" 저장되었습니다!")}
            className="bg-green-600 hover:bg-green-700"
          >
            성공 토스트 표시
          </Button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">에러 토스트</h2>
          <Button
            onClick={() =>
              showErrorToast("오류가 발생했습니다. 다시 시도해주세요.")
            }
            className="bg-red-600 hover:bg-red-700"
          >
            에러 토스트 표시
          </Button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">정보 토스트</h2>
          <Button
            onClick={() => showInfoToast("새로운 업데이트가 있습니다.")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            정보 토스트 표시
          </Button>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">사용법:</h3>
        <pre className="text-sm">
          {`import { showSuccessToast } from "@/lib/toast-store";

// 성공 메시지 표시
showSuccessToast(" 저장되었습니다!");

// 에러 메시지 표시
showErrorToast("오류가 발생했습니다.");

// 정보 메시지 표시
showInfoToast("새로운 업데이트가 있습니다.");`}
        </pre>
      </div>
    </div>
  );
}
