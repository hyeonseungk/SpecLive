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
import { showSimpleSuccess } from '@/lib/success-store'
import { showError, showSimpleError } from '@/lib/error-store'

type Project = Tables<'projects'>
type Membership = Tables<'memberships'>
type Prd = Tables<'prds'>

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
  const [activeTab, setActiveTab] = useState<'prd' | 'glossary' | 'policy' | 'management'>('prd')
  
  // PRD 관련 상태
  const [prd, setPrd] = useState<Prd | null>(null)
  const [prdContent, setPrdContent] = useState('')
  const [prdLoading, setPrdLoading] = useState(false)
  const [prdSaving, setPrdSaving] = useState(false)
  
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

      // PRD 로딩 (프로젝트와 멤버십이 모두 로드된 후)
      if (projectData && membershipData) {
        // PRD 로딩을 별도로 처리 (로딩 상태를 분리하기 위해)
        loadPrdForProject(projectData.id)
      }
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

  // PRD 로드 함수 (project ID를 직접 받는 버전)
  const loadPrdForProject = async (projectId: string) => {
    setPrdLoading(true)
    try {
      const { data, error } = await supabase
        .from('prds')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setPrd(data)
        setPrdContent(data.contents)
      } else {
        setPrd(null)
        setPrdContent('')
      }
    } catch (error) {
      console.error('Error loading PRD:', error)
      showError('PRD 로드 실패', 'PRD를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setPrdLoading(false)
    }
  }

  // PRD 로드 함수
  const loadPrd = async () => {
    if (!project) return
    await loadPrdForProject(project.id)
  }

  // PRD 저장 함수
  const savePrd = async () => {
    if (!project || !user) return

    setPrdSaving(true)
    try {
      const prdData = {
        project_id: project.id,
        contents: prdContent.trim(),
        author_id: user.id
      }

      const { data, error } = await supabase
        .from('prds')
        .upsert(prd ? { ...prdData, id: prd.id } : prdData)
        .select()
        .single()

      if (error) throw error

      setPrd(data)
      showSimpleSuccess('PRD가 저장되었습니다.')
    } catch (error) {
      console.error('Error saving PRD:', error)
      showError('PRD 저장 실패', 'PRD를 저장하는 중 오류가 발생했습니다.')
    } finally {
      setPrdSaving(false)
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'prd':
        const canEditPrd = membership?.role === 'admin'
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">프로젝트 PRD</h2>
                <p className="text-muted-foreground">
                  용어 및 정책 추천을 AI로부터 잘 받을 수 있도록 자세한 내용의 PRD를 넣어주세요.
                </p>
              </div>
              {canEditPrd && (
                <Button 
                  onClick={savePrd}
                  disabled={prdSaving}
                  className="min-w-[100px]"
                >
                  {prdSaving ? '저장 중...' : '저장'}
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="pt-6">
                {prdLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">PRD를 불러오는 중...</p>
                  </div>
                ) : canEditPrd ? (
                  <div>
                    <textarea
                      value={prdContent}
                      onChange={(e) => setPrdContent(e.target.value)}
                      placeholder="프로젝트 요구사항 정의서(PRD)를 작성하세요.&#10;&#10;예시:&#10;## 프로젝트 개요&#10;- 목적: &#10;- 목표: &#10;&#10;## 기능 요구사항&#10;1. 사용자 기능&#10;2. 관리자 기능&#10;&#10;## 비기능 요구사항&#10;- 성능: &#10;- 보안: "
                      className="w-full min-h-[500px] p-4 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      style={{ fontFamily: 'inherit' }}
                    />
                    <div className="mt-4 text-sm text-muted-foreground">
                      {prd && (
                        <p>
                          마지막 수정: {new Date(prd.updated_at).toLocaleString('ko-KR')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    {prdContent ? (
                      <div className="whitespace-pre-wrap break-words min-h-[200px] p-4 bg-gray-50 rounded-md">
                        {prdContent}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>아직 작성된 PRD가 없습니다.</p>
                        <p className="text-sm mt-2">관리자가 PRD를 작성할 때까지 기다려주세요.</p>
                      </div>
                    )}
                    {prd && (
                      <div className="mt-4 text-sm text-muted-foreground">
                        <p>
                          마지막 수정: {new Date(prd.updated_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
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
              onClick={() => setActiveTab('prd')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'prd' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
            >
              <span className="text-lg">📄</span>
              <span>프로젝트 PRD</span>
            </button>
            
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