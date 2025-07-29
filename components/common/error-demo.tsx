'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { showError, showSimpleError } from '@/lib/error-store'
import { useErrorHandler } from '@/lib/hooks/use-error-handler'

export function ErrorDemo() {
  const { handleError, handleAsyncError } = useErrorHandler()

  const simulateApiError = async () => {
    throw new Error('API 서버에 연결할 수 없습니다.')
  }

  const handleSimpleError = () => {
    showSimpleError('간단한 오류 메시지입니다.')
  }

  const handleDetailedError = () => {
    showError(
      '상세 오류 정보',
      '이것은 상세한 오류 메시지입니다.\n여러 줄로 표시될 수 있습니다.\n\n추가 정보:\n- 오류 코드: E001\n- 발생 시간: ' + new Date().toLocaleString(),
      () => {
        console.log('에러 모달 확인 버튼이 클릭되었습니다.')
      }
    )
  }

  const handleAsyncErrorDemo = async () => {
    const result = await handleAsyncError(
      simulateApiError,
      'API 호출 중 오류 발생'
    )
    
    if (result === null) {
      console.log('에러가 발생하여 null이 반환되었습니다.')
    }
  }

  const handleManualError = () => {
    try {
      throw new Error('수동으로 발생시킨 오류입니다.')
    } catch (error) {
      handleError(error, '수동 오류 처리')
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🧪 에러 모달 데모</CardTitle>
        <CardDescription>
          다양한 방식으로 에러 모달을 테스트해볼 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={handleSimpleError}
            className="h-auto p-4 flex flex-col items-start"
          >
            <span className="font-semibold">간단한 에러</span>
            <span className="text-sm text-muted-foreground mt-1">
              showSimpleError() 사용
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={handleDetailedError}
            className="h-auto p-4 flex flex-col items-start"
          >
            <span className="font-semibold">상세한 에러</span>
            <span className="text-sm text-muted-foreground mt-1">
              showError() 콜백 포함
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={handleAsyncErrorDemo}
            className="h-auto p-4 flex flex-col items-start"
          >
            <span className="font-semibold">비동기 에러</span>
            <span className="text-sm text-muted-foreground mt-1">
              handleAsyncError() 사용
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={handleManualError}
            className="h-auto p-4 flex flex-col items-start"
          >
            <span className="font-semibold">수동 에러 처리</span>
            <span className="text-sm text-muted-foreground mt-1">
              try-catch + handleError()
            </span>
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">📝 사용법</h4>
          <div className="text-sm space-y-2">
            <div>
              <code className="bg-background px-2 py-1 rounded">showSimpleError(message)</code>
              <span className="ml-2 text-muted-foreground">- 간단한 에러 메시지</span>
            </div>
            <div>
              <code className="bg-background px-2 py-1 rounded">showError(title, message, onConfirm?)</code>
              <span className="ml-2 text-muted-foreground">- 상세한 에러 정보</span>
            </div>
            <div>
              <code className="bg-background px-2 py-1 rounded">useErrorHandler()</code>
              <span className="ml-2 text-muted-foreground">- 컴포넌트에서 훅 사용</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 