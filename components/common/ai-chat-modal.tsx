'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useT } from '@/lib/i18n'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AiChatModalProps {
  isOpen: boolean
  onClose: () => void
  onSavePrd: (content: string) => void
}

export default function AiChatModal({ isOpen, onClose, onSavePrd }: AiChatModalProps) {
  const t = useT()
  // 최초 안내 메시지를 현재 언어로 설정
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t('ai.initial_message') },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // 전송 중 취소 플래그
  const isCancelledRef = useRef(false)

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
    // 취소 플래그 초기화
    isCancelledRef.current = false
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

      if (!data?.body) {
        throw new Error(t('ai.invalid_response'))
      }
      
      const reader = data.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      // 메시지 업데이트 간격(ms)
      const updateInterval = 300
      let lastEmit = Date.now()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (isCancelledRef.current) break

        assistantText += decoder.decode(value, { stream: true })

        const now = Date.now()
        if (now - lastEmit >= updateInterval) {
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: assistantText }
            return updated
          })
          lastEmit = now
        }
      }

      // 루프 종료 후(취소되지 않았다면) 최종 내용 반영
      if (!isCancelledRef.current) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantText }
          return updated
        })
      }
    } catch (error) {
      console.error('AI 채팅 오류:', error)
      const errorMessage = error instanceof Error ? error.message : t('common.error_generic')
      showError(t('ai.error_title'), errorMessage)
      // 오류 발생 시 빈 AI 메시지 제거
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  // Shift+Enter는 개행, Enter만 누르면 전송
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 전송 중단 (AI 응답 무시)
  const handleCancel = () => {
    if (!isLoading) return
    // 취소 플래그 설정
    isCancelledRef.current = true
    // 마지막 assistant placeholder 제거
    setMessages(prev => prev.slice(0, -1))
    setIsLoading(false)
    setIsStreaming(false)
  }

  const handleSavePrd = () => {
    // 마지막 AI 메시지(말풍선)만 PRD로 저장
    const lastAssistant = [...messages].reverse().find(msg => msg.role === 'assistant')
    if (!lastAssistant) return
    const prdContent = lastAssistant.content
    onSavePrd(prdContent)
    onClose()
  }

  // “그래도 닫기” 클릭 시: 메시지를 초기화하고 모달을 닫음
  const handleConfirmClose = () => {
    setMessages([{ role: 'assistant', content: t('ai.initial_message') }]) // 인사 메시지만 유지
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <CardTitle className="text-xl">{t('ai.modal_title')}</CardTitle>
          <div className="flex gap-2">
            {/* PRD 저장 확인 모달 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={messages.length <= 1}
                >
                  {t('ai.save_to_prd')}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('ai.save_confirm_title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('ai.save_confirm_desc')}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSavePrd}>
                    {t('ai.save_to_prd')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* 확인 모달 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  {t('ai.close')}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('ai.close_confirm_title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('ai.close_confirm_desc')}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmClose}>
                    {t('ai.close')}
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
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ai.input_placeholder')}
              disabled={isLoading}
              className="flex-1 h-20 resize-none border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? t('ai.sending') : t('buttons.send')}
            </Button>

            {isLoading && (
              <Button variant="outline" onClick={handleCancel}>
                {t('ai.abort')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 