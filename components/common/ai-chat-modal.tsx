'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase-browser'
import { showError } from '@/lib/error-store'

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
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '어떤 프로젝트인지 간단히 설명해주시면 저와 질의응답을 통해 PRD를 만들 수 있어요'
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
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

    // 사용자 메시지 추가
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    // 이전 스트림 중단
    abortRef.current?.abort()
    abortRef.current = new AbortController()

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
        // @ts-ignore - noResolveJson is supported at runtime
        noResolveJson: true,
        signal: abortRef.current.signal
      })

      if (error || !(data instanceof Response)) {
        throw error || new Error('Invalid response')
      }

      const reader = data.body!.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      let firstChunk = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        assistantText += decoder.decode(value, { stream: true })

        setMessages(prev => {
          if (firstChunk) {
            firstChunk = false
            return [...prev, { role: 'assistant', content: assistantText }]
          }
          const newPrev = [...prev]
          newPrev[newPrev.length - 1] = {
            role: 'assistant',
            content: assistantText
          }
          return newPrev
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
              PRD로 저장
            </Button>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
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
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
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