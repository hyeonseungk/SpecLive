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
import type { User } from '@supabase/supabase-js'

interface OrganizationCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: User
}

export function OrganizationCreateModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  user 
}: OrganizationCreateModalProps) {
  const [organizationName, setOrganizationName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { showError } = useErrorStore()
  const { showSuccess } = useSuccessStore()

  const handleSubmit = async () => {
    if (!organizationName.trim()) {
      showError('입력 오류', '조직 이름을 입력해주세요.')
      return
    }

    setIsLoading(true)
    
    try {
      // 조직 생성 (owner_id 포함)
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName.trim(),
          owner_id: user.id  // 생성자를 조직 소유자로 설정
        })
        .select()
        .single()

      if (orgError) {
        throw orgError
      }

      showSuccess(
        '조직 생성 완료',
        `"${organizationName}" 조직이 성공적으로 생성되었습니다.\n당신이 조직의 소유자가 되었습니다.`
      )
      
      setOrganizationName('')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Organization creation error:', error)
      showError(
        '조직 생성 실패',
        '조직 생성 중 오류가 발생했습니다. 다시 시도해주세요.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setOrganizationName('')
      onClose()
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>새 조직 생성</AlertDialogTitle>
          <AlertDialogDescription>
            새로운 조직을 생성하고 프로젝트들을 관리하세요. 당신이 조직의 소유자가 됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <label htmlFor="organization-name" className="text-sm font-medium mb-2 block">
            조직 이름
          </label>
          <Input
            id="organization-name"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="예: 우리회사, ABC팀"
            disabled={isLoading}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSubmit}
            disabled={isLoading || !organizationName.trim()}
          >
            {isLoading ? '생성 중...' : '생성'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 