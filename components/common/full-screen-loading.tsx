'use client'

interface FullScreenLoadingProps {
  message?: string
}

export function FullScreenLoading({ message = '로딩 중...' }: FullScreenLoadingProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* 스피너 애니메이션 */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        
        {/* 로딩 메시지 */}
        <div className="text-lg font-medium text-foreground">
          {message}
        </div>
      </div>
    </div>
  )
} 