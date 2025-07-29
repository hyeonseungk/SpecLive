'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MemberInviteModal } from '@/components/common/member-invite-modal'
import { FullScreenLoading } from '@/components/common/full-screen-loading'
import supabase from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

type Project = Tables<'projects'>
type Membership = Tables<'memberships'>

interface ProjectPageProps {
  params: {
    orgId: string
    projectId: string
  }
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'glossary' | 'policy' | 'management'>('glossary')
  const router = useRouter()

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
        .select(`
          *,
          organizations (name)
        `)
        .eq('id', params.projectId)
        .single()

      if (projectData) {
        setProject(projectData)
      }

      // 사용자의 멤버십 정보 가져오기
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('*')
        .eq('project_id', params.projectId)
        .eq('user_id', session.user.id)
        .single()

      if (membershipData) {
        setMembership(membershipData)
      }

      setLoading(false)
    }

    loadProjectData()
  }, [params.projectId, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleInviteSuccess = () => {
    // 초대 성공 후 필요한 업데이트 로직
    // 현재는 별다른 업데이트가 필요하지 않음
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'glossary':
        return (
          <div>
            <h2 className="text-3xl font-bold mb-2">용어 관리</h2>
            <p className="text-muted-foreground mb-6">
              프로젝트에서 사용하는 용어들을 정의하고 관리합니다.
            </p>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Button onClick={() => router.push(`/dashboard/organizations/${params.orgId}/projects/${params.projectId}/glossary`)}>
                    용어 관리 페이지로 이동
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      case 'policy':
        return (
          <div>
            <h2 className="text-3xl font-bold mb-2">정책 관리</h2>
            <p className="text-muted-foreground mb-6">
              프로젝트 정책과 가이드라인을 작성하고 관리합니다.
            </p>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Button onClick={() => router.push(`/dashboard/organizations/${params.orgId}/projects/${params.projectId}/policy`)}>
                    정책 관리 페이지로 이동
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      case 'management':
        return (
          <div>
            <h2 className="text-3xl font-bold mb-2">프로젝트 관리</h2>
            <p className="text-muted-foreground mb-6">
              프로젝트 설정과 멤버를 관리합니다.
            </p>
            
            {membership?.role === 'admin' ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>멤버 초대</CardTitle>
                    <CardDescription>
                      프로젝트에 새로운 멤버를 초대합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => setShowInviteModal(true)}>
                      멤버 초대
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>프로젝트 설정</CardTitle>
                    <CardDescription>
                      프로젝트 이름이나 설정을 변경합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" disabled>
                      설정 (준비중)
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>알림 설정</CardTitle>
                    <CardDescription>
                      프로젝트 알림을 관리합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" disabled>
                      알림 설정 (준비중)
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">
                    프로젝트 관리 기능은 관리자만 사용할 수 있습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return <FullScreenLoading />
  }

  if (!project || !membership) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>접근 권한이 없습니다</CardTitle>
            <CardDescription>
              이 프로젝트에 접근할 권한이 없습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>
              대시보드로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* 왼쪽 사이드바 */}
      <div className="w-64 border-r bg-card flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/dashboard/organizations/${params.orgId}`)}
            >
              ←
            </Button>
            <span className="text-sm text-muted-foreground">프로젝트</span>
          </div>
          <h1 className="text-xl font-bold">{project.name}</h1>
        </div>

        {/* 네비게이션 */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="space-y-2 flex-1">
            {/* 상단 메뉴 */}
            <button
              onClick={() => setActiveTab('glossary')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'glossary' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
            >
              <span className="text-lg">📚</span>
              <span>용어 관리</span>
            </button>
            
            <button
              onClick={() => setActiveTab('policy')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'policy' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
            >
              <span className="text-lg">📋</span>
              <span>정책 관리</span>
            </button>
          </div>
          
          {/* 하단 메뉴 */}
          <div className="pt-4 border-t">
            <button
              onClick={() => setActiveTab('management')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'management' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
            >
              <span className="text-lg">⚙️</span>
              <span>프로젝트 관리</span>
            </button>
          </div>
        </div>

        {/* 하단 사용자 정보 */}
        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground mb-2">
            {user?.email}
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            {membership.role === 'admin' ? '관리자' : '멤버'}
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
            로그아웃
          </Button>
        </div>
      </div>

      {/* 오른쪽 메인 콘텐츠 */}
      <div className="flex-1 p-8">
        {renderContent()}
      </div>

      {/* 모달들 */}
      {project && (
        <MemberInviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
          project={project}
        />
      )}
    </div>
  )
} 