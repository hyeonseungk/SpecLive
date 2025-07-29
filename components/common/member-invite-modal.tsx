'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { useErrorStore } from '@/lib/error-store'
import { useSuccessStore } from '@/lib/success-store'
import supabase from '@/lib/supabase-browser'
import type { Tables } from '@/types/database'

type Project = Tables<'projects'>

interface MemberInviteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  project: Project
}

export function MemberInviteModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  project 
}: MemberInviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [isLoading, setIsLoading] = useState(false)
  const { showError } = useErrorStore()
  const { showSuccess } = useSuccessStore()

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async () => {
    if (!email.trim()) {
      showError('입력 오류', '이메일을 입력해주세요.')
      return
    }

    if (!validateEmail(email.trim())) {
      showError('입력 오류', '올바른 이메일 형식을 입력해주세요.')
      return
    }

    setIsLoading(true)
    
    try {
      // 이메일로 사용자 찾기 (실제로는 Supabase Auth에서 사용자를 찾아야 하지만,
      // 현재는 간단하게 이메일을 입력받는 것으로 구현)
      
      // 실제 구현에서는 다음과 같은 단계가 필요합니다:
      // 1. Supabase Admin API를 사용해 이메일로 사용자 검색
      // 2. 사용자가 없으면 초대 이메일 발송
      // 3. 사용자가 있으면 멤버십 직접 생성
      
      // 현재는 시연용으로 간단하게 구현
      showSuccess(
        '초대 완료',
        `${email}에게 "${project.name}" 프로젝트 초대 이메일이 발송되었습니다.\n(실제 구현에서는 Supabase Admin API를 사용해 초대 이메일을 발송합니다.)`
      )
      
      setEmail('')
      setRole('member')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Member invitation error:', error)
      showError(
        '초대 실패',
        '멤버 초대 중 오류가 발생했습니다. 다시 시도해주세요.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setEmail('')
      setRole('member')
      onClose()
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>멤버 초대</AlertDialogTitle>
          <AlertDialogDescription>
            "{project.name}" 프로젝트에 새로운 멤버를 초대합니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-4">
          <div>
            <label htmlFor="member-email" className="text-sm font-medium mb-2 block">
              이메일 주소
            </label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="예: member@company.com"
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div>
            <label htmlFor="member-role" className="text-sm font-medium mb-2 block">
              역할
            </label>
            <select
              id="member-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="member">멤버 - 용어/정책 제안 가능</option>
              <option value="admin">관리자 - 모든 권한</option>
            </select>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSubmit}
            disabled={isLoading || !email.trim() || !validateEmail(email.trim())}
          >
            {isLoading ? '초대 중...' : '초대 보내기'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 