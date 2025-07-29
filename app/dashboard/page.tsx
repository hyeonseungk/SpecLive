'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorModal } from '@/components/common/error-modal'
import { SuccessModal } from '@/components/common/success-modal'
import { OrganizationCreateModal } from '@/components/common/organization-create-modal'
import { ProjectCreateModal } from '@/components/common/project-create-modal'
import supabase from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

type Organization = Tables<'organizations'>
type Project = Tables<'projects'> & {
  organizations: Organization
  memberships: Tables<'memberships'>[]
}

interface OrganizationWithProjects extends Organization {
  projects: Project[]
  memberCount: number
  isOwner: boolean
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [organizationsWithProjects, setOrganizationsWithProjects] = useState<OrganizationWithProjects[]>([])
  const [loading, setLoading] = useState(true)
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        router.push('/')
        return
      }

      await loadUserProjects(session.user.id)
    }

    getSession()
  }, [router])

  const loadUserProjects = async (userId: string) => {
    setLoading(true)
    try {
      // 사용자가 속한 프로젝트들을 멤버십을 통해 가져오기
      const { data: userProjects, error } = await supabase
        .from('memberships')
        .select(`
          *,
          projects (
            *,
            organizations (
              *
            )
          )
        `)
        .eq('user_id', userId)

      if (error) throw error

      // 조직별로 프로젝트들을 그룹화하고 추가 정보 계산
      const orgMap = new Map<string, OrganizationWithProjects>()

      // 각 조직의 멤버 수를 계산하기 위한 쿼리
      const organizationIds = Array.from(new Set(
        userProjects?.map(membership => {
          const project = membership.projects as Project
          return project?.organizations?.id
        }).filter(Boolean) || []
      ))

      // 각 조직의 총 멤버 수 계산
      const memberCounts = new Map<string, number>()
      for (const orgId of organizationIds) {
        const { count } = await supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .in('project_id', 
            userProjects
              ?.filter(m => (m.projects as Project)?.organizations?.id === orgId)
              .map(m => m.project_id) || []
          )
        
        memberCounts.set(orgId, count || 0)
      }

      userProjects?.forEach((membership) => {
        const project = membership.projects as Project
        if (!project) return

        const org = project.organizations
        if (!org) return

        // 프로젝트에 멤버십 정보 추가
        project.memberships = [membership]

        if (!orgMap.has(org.id)) {
          orgMap.set(org.id, {
            ...org,
            projects: [],
            memberCount: memberCounts.get(org.id) || 0,
            isOwner: org.owner_id === userId
          })
        }

        orgMap.get(org.id)!.projects.push(project)
      })

      const groupedOrgs = Array.from(orgMap.values()).sort((a, b) => {
        // 소유자인 조직을 먼저 정렬, 그 다음은 생성일 순
        if (a.isOwner && !b.isOwner) return -1
        if (!a.isOwner && b.isOwner) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setOrganizationsWithProjects(groupedOrgs)
    } catch (error) {
      console.error('Error loading user projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleModalSuccess = () => {
    if (user) {
      loadUserProjects(user.id)
    }
  }

  const totalProjects = organizationsWithProjects.reduce((sum, org) => sum + org.projects.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">UbiLang</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">대시보드</h2>
          <p className="text-muted-foreground">
            조직과 프로젝트를 생성하고 용어와 정책을 관리하세요.
          </p>
        </div>

        <div className="mb-6 flex gap-4">
          <Button onClick={() => setShowOrgModal(true)}>
            새 조직 생성
          </Button>
          <Button 
            onClick={() => setShowProjectModal(true)}
            variant="outline"
            disabled={organizationsWithProjects.length === 0}
          >
            새 프로젝트 생성
          </Button>
        </div>

        {totalProjects === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>프로젝트가 없습니다</CardTitle>
              <CardDescription>
                아직 참여 중인 프로젝트가 없습니다. 조직을 생성하고 프로젝트를 만들어보세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                1. 먼저 조직을 생성하세요 (회사, 팀 등)<br/>
                2. 조직 내에서 프로젝트를 생성하세요<br/>
                3. 프로젝트에서 용어와 정책을 관리하세요
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {organizationsWithProjects.map((org) => (
              <div key={org.id}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    🏢 {org.name}
                    {org.isOwner && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        소유자
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      ({org.projects.length}개 프로젝트, {org.memberCount}명 멤버)
                    </span>
                  </h3>
                  
                  {org.isOwner && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        조직 설정
                      </Button>
                      <Button variant="outline" size="sm">
                        멤버 관리
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {org.projects.map((project) => {
                    const membership = project.memberships[0]
                    return (
                      <Card 
                        key={project.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push(`/dashboard/${project.id}`)}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            {project.name}
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              membership.role === 'admin' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {membership.role === 'admin' ? '관리자' : '멤버'}
                            </span>
                          </CardTitle>
                          <CardDescription>
                            {new Date(project.created_at).toLocaleDateString()}에 생성됨
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            클릭하여 용어와 정책을 관리하세요
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 모달들 */}
      {user && (
        <>
          <OrganizationCreateModal
            isOpen={showOrgModal}
            onClose={() => setShowOrgModal(false)}
            onSuccess={handleModalSuccess}
            user={user}
          />
          <ProjectCreateModal
            isOpen={showProjectModal}
            onClose={() => setShowProjectModal(false)}
            onSuccess={handleModalSuccess}
            user={user}
          />
        </>
      )}
      
      <ErrorModal />
      <SuccessModal />
    </div>
  )
} 