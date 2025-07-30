'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase-browser'
import { showError } from '@/lib/error-store'
import { 
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// 최초 안내 메시지 정의
const initialAssistantMessage: Message = {
  role: 'assistant',
  content: '어떤 프로젝트인지 간단히 설명해주시면 저와 질의응답을 통해 PRD를 만들 수 있어요',
}

interface AiChatModalProps {
  isOpen: boolean
  onClose: () => void
  onSavePrd: (content: string) => void
}

export default function AiChatModal({ isOpen, onClose, onSavePrd }: AiChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([initialAssistantMessage])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 메시지가 추가될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 모달이 열릴 때 입력창에 포커스
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    // 사용자 메시지 + AI placeholder 한 번에 추가
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ])

    try {
      // 스트리밍 시작 표시
      setIsStreaming(true)

      const { data, error } = await supabase.functions.invoke('ai-prd-chat', {
        body: {
          messages: [
            ...messages,
            { role: 'user', content: userMessage }
          ]
        },
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        // // TS 타입에 아직 반영되지 않았을 수 있음
        // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // // @ts-ignore
        // noResolveJson: true,
        // signal: abortRef.current.signal
      })

      
      
      console.log('data: ', data);
     
      

      const reader = data.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        assistantText += decoder.decode(value, { stream: true })

        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantText }
          return updated
        })
      }
    } catch (error) {
      console.error('AI 채팅 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      showError('AI와의 대화 중 오류가 발생했습니다.', errorMessage)
      // 오류 발생 시 빈 AI 메시지 제거
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSavePrd = () => {
    // AI 메시지들을 하나로 합쳐서 PRD로 저장
    const aiMessages = messages.filter(msg => msg.role === 'assistant')
    const prdContent = aiMessages.map(msg => msg.content).join('\n\n')
    onSavePrd(prdContent)
    onClose()
  }

  // “그래도 닫기” 클릭 시: 메시지를 초기화하고 모달을 닫음
  const handleConfirmClose = () => {
    setMessages([initialAssistantMessage]) // 인사 메시지만 유지
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <CardTitle className="text-xl">🤖 AI와의 대화로 PRD 작성</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSavePrd}
              disabled={messages.length <= 1}
            >
              최종 답변을 PRD로 저장
            </Button>

            {/* 확인 모달 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  닫기
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    대화를 닫으시겠어요?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    대화를 닫으면 이때까지의 대화가 모두 사라져요, 그래도 닫으시겠어요?
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmClose}>
                    그래도 닫기
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.role === 'assistant' && isStreaming && index === messages.length - 1 && (
                  <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1"></span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? '전송 중...' : '전송'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 