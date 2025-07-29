'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { Tables } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError, showSimpleError } from '@/lib/error-store'
import { showSimpleSuccess } from '@/lib/success-store'
import { MemberInviteModal } from '@/components/common/member-invite-modal'

type User = {
  id: string
  email?: string
}

type Project = Tables<'projects'>
type Membership = Tables<'memberships'>

interface ManagementPageProps {
  params: {
    orgId: string
    projectId: string
  }
}

export default function ManagementPage({ params }: ManagementPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  
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

      setLoading(false)
    }

    loadProjectData()
  }, [params.projectId, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleInviteSuccess = () => {
    setShowInviteModal(false)
    showSimpleSuccess('초대가 성공적으로 전송되었습니다.')
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

  const isAdmin = membership?.role === 'admin'

  return (
    <div className="p-6">
        <div>
          {/* 헤더 영역 */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">프로젝트 관리</h2>
            <p className="text-muted-foreground">
              프로젝트 설정과 멤버를 관리합니다.
            </p>
          </div>

          {/* 관리자 전용 기능 */}
          {isAdmin ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>멤버 초대</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    프로젝트에 새로운 멤버를 초대합니다.
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    프로젝트 이름이나 설정을 변경합니다.
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    프로젝트 알림을 관리합니다.
                  </p>
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

      {/* 멤버 초대 모달 */}
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