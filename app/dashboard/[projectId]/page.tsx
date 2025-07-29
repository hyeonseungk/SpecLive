'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MemberInviteModal } from '@/components/common/member-invite-modal'
import supabase from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

type Project = Tables<'projects'>
type Membership = Tables<'memberships'>

interface ProjectPageProps {
  params: {
    projectId: string
  }
}

export default function ProjectPage({ params }: ProjectPageProps) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/dashboard')}
            >
              ← 대시보드
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                조직: {(project as any).organizations?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email} ({membership.role === 'admin' ? '관리자' : '멤버'})
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">프로젝트 관리</h2>
          <p className="text-muted-foreground">
            용어와 정책을 관리하여 팀의 커뮤니케이션을 개선하세요.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/dashboard/${params.projectId}/glossary`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📖 용어 관리
              </CardTitle>
              <CardDescription>
                프로젝트에서 사용하는 용어들을 정의하고 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                팀 내 용어 불일치를 방지하고 명확한 소통을 돕습니다.
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/dashboard/${params.projectId}/policy`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📋 정책 관리
              </CardTitle>
              <CardDescription>
                프로젝트 정책과 가이드라인을 작성하고 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                업무 규칙과 절차를 문서화하여 일관성 있는 업무를 지원합니다.
              </div>
            </CardContent>
          </Card>
        </div>

        {membership.role === 'admin' && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>관리자 도구</CardTitle>
                <CardDescription>
                  프로젝트 관리자만 사용할 수 있는 기능들입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowInviteModal(true)}
                >
                  멤버 초대
                </Button>
                <Button variant="outline">
                  프로젝트 설정
                </Button>
                <Button variant="outline">
                  알림 설정
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

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