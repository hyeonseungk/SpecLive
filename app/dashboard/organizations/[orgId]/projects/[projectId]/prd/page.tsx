'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { Tables } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError, showSimpleError } from '@/lib/error-store'
import { showSimpleSuccess } from '@/lib/success-store'
import AiChatModal from '@/components/common/ai-chat-modal'

type User = {
  id: string
  email?: string
}

type Project = Tables<'projects'>
type Membership = Tables<'memberships'>
type Prd = Tables<'prds'>

interface PrdPageProps {
  params: {
    orgId: string
    projectId: string
  }
}

export default function PrdPage({ params }: PrdPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  
  // PRD 관련 상태
  const [prd, setPrd] = useState<Prd | null>(null)
  const [prdContent, setPrdContent] = useState('')
  const [prdLoading, setPrdLoading] = useState(false)
  const [prdSaving, setPrdSaving] = useState(false)
  
  // AI 채팅 모달 상태
  const [isAiChatOpen, setIsAiChatOpen] = useState(false)
  
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
        .select('*')
        .eq('id', params.projectId)
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
        .eq('project_id', params.projectId)
        .eq('user_id', session.user.id)
        .single()

      if (!membershipData) {
        router.push('/dashboard')
        return
      }

      setMembership(membershipData)

      // PRD 로드
      await loadPrdForProject(params.projectId)

      setLoading(false)
    }

    loadProjectData()
  }, [params.projectId, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // PRD 로드 함수 (project ID를 직접 받는 버전)
  const loadPrdForProject = async (projectId: string) => {
    setPrdLoading(true)
    try {
      const { data, error } = await supabase
        .from('prds')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setPrd(data)
        setPrdContent(data.contents || '')
      } else {
        setPrdContent('')
      }
    } catch (error) {
      console.error('Error loading PRD:', error)
      showError('PRD 로드 실패', 'PRD를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setPrdLoading(false)
    }
  }

  /**
   * PRD 저장 함수
   * @param contentOverride  저장할 내용을 명시적으로 전달(옵션). 전달하지 않으면 현재 prdContent state 사용
   */
  const savePrd = async (contentOverride?: string) => {
    if (!project || !user) return

    setPrdSaving(true)
    try {
      const contentToSave = contentOverride ?? prdContent
      if (prd) {
        // 기존 PRD 업데이트
        const { error } = await supabase
          .from('prds')
          .update({
            contents: contentToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', prd.id)

        if (error) throw error
      } else {
        // 새 PRD 생성
        const { data: newPrd, error } = await supabase
          .from('prds')
          .insert({
            project_id: project.id,
            contents: contentToSave,
            author_id: user.id
          })
          .select()
          .single()

        if (error) throw error
        setPrd(newPrd)
      }

      showSimpleSuccess('PRD가 저장되었습니다.')
    } catch (error) {
      console.error('Error saving PRD:', error)
      showError('PRD 저장 실패', 'PRD를 저장하는 중 오류가 발생했습니다.')
    } finally {
      setPrdSaving(false)
    }
  }

  // AI 모달에서 호출: 내용 반영 후 즉시 Supabase에 저장
  const handleSavePrdFromAi = async (content: string) => {
    setPrdContent(content)
    await savePrd(content)
  }

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
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>접근 권한이 없습니다</CardTitle>
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

  const canEditPrd = membership?.role === 'admin'

  return (
    <div className="p-6">
        <div>
          {/* 헤더 영역 */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">프로젝트 PRD</h2>
            <p className="text-muted-foreground">
              프로젝트의 요구사항과 목표를 정의합니다.
            </p>
          </div>

          {/* PRD 편집 영역 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>제품 요구사항 문서</CardTitle>
                {canEditPrd && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setIsAiChatOpen(true)}
                    >
                      🤖 AI와의 대화를 통해 작성
                    </Button>
                    <Button 
                      onClick={() => savePrd()}
                      disabled={prdSaving}
                    >
                      {prdSaving ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {prdLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">PRD를 불러오는 중...</p>
                </div>
              ) : (
                <div>
                  {canEditPrd ? (
                    <textarea
                      value={prdContent}
                      onChange={(e) => setPrdContent(e.target.value)}
                      placeholder="프로젝트의 요구사항과 목표를 작성해주세요..."
                      className="w-full h-96 p-4 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={prdSaving}
                    />
                  ) : (
                    <div className="w-full h-96 p-4 border rounded-md bg-muted/50 overflow-y-auto whitespace-pre-wrap">
                      {prdContent || '아직 작성된 PRD가 없습니다.'}
                    </div>
                  )}
                  
                  {prd && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      최종 수정: {new Date(prd.updated_at).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI 채팅 모달 */}
        <AiChatModal
          isOpen={isAiChatOpen}
          onClose={() => setIsAiChatOpen(false)}
          onSavePrd={handleSavePrdFromAi}
        />
      </div>
    )
  } 