'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { supabase } from '@/lib/supabase-browser'
import { Tables } from '@/types/database'

type User = {
  id: string
  email?: string
}

type Project = Tables<'projects'>
type Membership = Tables<'memberships'>

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const t = useT()
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const orgId = params.orgId as string
  const projectId = params.projectId as string

  useEffect(() => {
    const loadProjectData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        router.push('/')
        return
      }

      // 프로젝트 정보 가져오기
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (!projectData) {
        router.push('/dashboard')
        return
      }

      setProject(projectData)

      // 멤버십 확인
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', session.user.id)
        .single()

      if (!membershipData) {
        router.push('/dashboard')
        return
      }

      setMembership(membershipData)
      setLoading(false)
    }

    loadProjectData()
  }, [projectId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!project || !membership) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('common.no_access')}</p>
          <Button onClick={() => router.push('/dashboard')}>
            {t('buttons.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {/* 왼쪽 사이드바 - 고정 */}
      <div className="w-64 border-r bg-card flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/dashboard/organizations/${orgId}`)}
            >
              ←
            </Button>
            <span className="text-sm text-muted-foreground">{t('sidebar.project')}</span>
          </div>
          <h1 className="text-xl font-bold">{project.name}</h1>
        </div>

        {/* 네비게이션 */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="space-y-2 flex-1">
            {/* 상단 메뉴 */}
            <button
              onClick={() => router.push(`/dashboard/organizations/${orgId}/projects/${projectId}/prd`)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                pathname.includes('/prd') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <span className="text-lg">📄</span>
              <span>{t('sidebar.prd')}</span>
            </button>
            
            <button
              onClick={() => router.push(`/dashboard/organizations/${orgId}/projects/${projectId}/glossary`)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                pathname.includes('/glossary') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <span className="text-lg">📚</span>
              <span>{t('sidebar.glossary')}</span>
            </button>
            
            <button
              onClick={() => router.push(`/dashboard/organizations/${orgId}/projects/${projectId}/policy`)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                pathname.includes('/policy') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <span className="text-lg">📋</span>
              <span>{t('sidebar.policy')}</span>
            </button>
            
            <button
              onClick={() => router.push(`/dashboard/organizations/${orgId}/projects/${projectId}/management`)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                pathname.includes('/management') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <span className="text-lg">⚙️</span>
              <span>{t('sidebar.management')}</span>
            </button>
          </div>

          {/* 하단 메뉴 */}
          <div className="space-y-2 pt-4 border-t">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors hover:bg-accent"
            >
              <span className="text-lg">🏠</span>
              <span>{t('sidebar.dashboard')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
} 