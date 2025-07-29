'use client'

import { useState, useEffect } from 'react'
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
import type { Tables } from '@/types/database'

type Organization = Tables<'organizations'>

interface ProjectCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: User
  organizationId?: string // 조직이 미리 선택된 경우
}

export function ProjectCreateModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  user,
  organizationId 
}: ProjectCreateModalProps) {
  const [projectName, setProjectName] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false)
  const { showError } = useErrorStore()
  const { showSuccess } = useSuccessStore()

  // 조직 목록 로드 (organizationId가 없는 경우에만)
  useEffect(() => {
    if (isOpen) {
      if (organizationId) {
        // 조직이 미리 선택된 경우
        setSelectedOrgId(organizationId)
      } else {
        // 조직을 선택해야 하는 경우
        loadOrganizations()
      }
    }
  }, [isOpen, organizationId])

  const loadOrganizations = async () => {
    setIsLoadingOrgs(true)
    try {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setOrganizations(orgs || [])
      
      // 첫 번째 조직을 기본 선택
      if (orgs && orgs.length > 0) {
        setSelectedOrgId(orgs[0].id)
      }
    } catch (error) {
      console.error('Organizations loading error:', error)
      showError('조직 목록 로드 실패', '조직 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoadingOrgs(false)
    }
  }

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      showError('입력 오류', '프로젝트 이름을 입력해주세요.')
      return
    }

    const targetOrgId = organizationId || selectedOrgId
    if (!targetOrgId) {
      showError('선택 오류', '조직을 선택해주세요.')
      return
    }

    setIsLoading(true)
    
    try {
      // 프로젝트 생성
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectName.trim(),
          organization_id: targetOrgId
        })
        .select()
        .single()

      if (projectError) throw projectError

      // 프로젝트 생성자를 관리자로 멤버십 생성
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: 'admin'
        })

      if (membershipError) throw membershipError

      showSuccess(
        '프로젝트 생성 완료',
        `"${projectName}" 프로젝트가 성공적으로 생성되었습니다.`
      )
      
      setProjectName('')
      setSelectedOrgId('')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Project creation error:', error)
      showError(
        '프로젝트 생성 실패',
        '프로젝트 생성 중 오류가 발생했습니다. 다시 시도해주세요.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setProjectName('')
      setSelectedOrgId('')
      onClose()
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>새 프로젝트 생성</AlertDialogTitle>
          <AlertDialogDescription>
            조직 내에서 새로운 프로젝트를 생성합니다. 당신은 자동으로 프로젝트 관리자가 됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-4">
          {!organizationId && (
            <div>
              <label htmlFor="organization-select" className="text-sm font-medium mb-2 block">
                조직 선택
              </label>
              {isLoadingOrgs ? (
                <div className="text-sm text-muted-foreground">조직 목록 로딩 중...</div>
              ) : organizations.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  사용 가능한 조직이 없습니다. 먼저 조직을 생성해주세요.
                </div>
              ) : (
                <select
                  id="organization-select"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">조직을 선택하세요</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label htmlFor="project-name" className="text-sm font-medium mb-2 block">
              프로젝트 이름
            </label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="예: OOO 커머스, XXX 채팅 서비스 등"
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSubmit}
            disabled={isLoading || !projectName.trim() || (!organizationId && (!selectedOrgId || organizations.length === 0))}
          >
            {isLoading ? '생성 중...' : '생성'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 