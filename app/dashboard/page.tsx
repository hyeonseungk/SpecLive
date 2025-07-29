'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FullScreenLoading } from '@/components/common/full-screen-loading'
import { OrganizationCreateModal } from '@/components/common/organization-create-modal'
import supabase from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

type Organization = Tables<'organizations'>

interface OrganizationWithStats extends Organization {
  projectCount: number
  memberCount: number
  isOwner: boolean
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showOrgCreateModal, setShowOrgCreateModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        router.push('/')
        return
      }

      await loadUserOrganizations(session.user.id)
    }

    getSession()
  }, [router])

  const loadUserOrganizations = async (userId: string) => {
    setLoading(true)
    try {
      // 1. 사용자가 속한 조직들을 멤버십을 통해 가져오기
      const { data: userMemberships, error: membershipError } = await supabase
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

      if (membershipError) throw membershipError

      // 2. 사용자가 소유한 조직들도 별도로 가져오기
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', userId)

      if (ownedError) throw ownedError

      // 조직별로 통계 계산
      const orgMap = new Map<string, OrganizationWithStats>()

      // 멤버십을 통한 조직들 처리
      userMemberships?.forEach((membership) => {
        const project = membership.projects as any
        if (!project?.organizations) return

        const org = project.organizations
        if (!orgMap.has(org.id)) {
          orgMap.set(org.id, {
            ...org,
            projectCount: 0,
            memberCount: 0,
            isOwner: org.owner_id === userId
          })
        }

        orgMap.get(org.id)!.projectCount++
      })

      // 소유한 조직들 중 아직 추가되지 않은 것들 추가
      ownedOrgs?.forEach((org) => {
        if (!orgMap.has(org.id)) {
          orgMap.set(org.id, {
            ...org,
            projectCount: 0,
            memberCount: 0,
            isOwner: true
          })
        }
      })

      // 각 조직의 멤버 수 계산
      for (const [orgId, orgData] of Array.from(orgMap.entries())) {
        // 해당 조직의 모든 프로젝트의 멤버 수 계산
        const { count } = await supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .in('project_id', 
            userMemberships
              ?.filter(m => (m.projects as any)?.organizations?.id === orgId)
              .map(m => m.project_id) || []
          )
        
        orgData.memberCount = count || 0
      }

      const orgList = Array.from(orgMap.values()).sort((a, b) => {
        // 소유자인 조직을 먼저 정렬, 그 다음은 생성일 순
        if (a.isOwner && !b.isOwner) return -1
        if (!a.isOwner && b.isOwner) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setOrganizations(orgList)
    } catch (error) {
      console.error('Error loading user organizations:', error)
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
      loadUserOrganizations(user.id)
    }
  }

  if (loading) {
    return <FullScreenLoading />
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">UbiLang</h1>
          </div>
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
        {organizations.length === 0 ? (
          // 조직이 없는 경우 - 조직 생성을 유도하는 UI  
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4">환영합니다!</h2>
              <p className="text-lg text-muted-foreground mb-2">
                UbiLang을 시작하려면 먼저 조직을 만들어주세요.
              </p>
              <p className="text-muted-foreground">
                조직 안에서 여러 프로젝트를 생성하고<br></br>프로젝트 별로 용어와 정책을 관리할 수 있습니다.
              </p>
            </div>
            
            <Card className="w-full max-w-md">
              <CardContent className="pt-8 pb-8">
                <Button 
                  onClick={() => setShowOrgCreateModal(true)}
                  className="w-full mb-6"
                  size="lg"
                >
                  새 조직 만들기
                </Button>
                <div className="text-sm text-muted-foreground">
                  <p className="mb-3 font-medium">조직을 만든 후에는:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>프로젝트를 생성할 수 있습니다</li>
                    <li>프로젝트 멤버를 초대할 수 있습니다</li>
                    <li>용어와 정책을 관리할 수 있습니다</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // 조직이 있는 경우 - 조직 목록 표시
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">조직 선택</h2>
              <p className="text-muted-foreground">
                관리하고 싶은 조직을 선택하세요. ({organizations.length}개 조직)
              </p>
            </div>

            <div className="mb-6">
              <Button onClick={() => setShowOrgCreateModal(true)}>
                새 조직 만들기
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org) => (
                <Card 
                  key={org.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                          🏢
                        </div>
                        {org.name}
                      </div>
                      {org.isOwner && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          소유자
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {new Date(org.created_at).toLocaleDateString()}에 생성됨
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>프로젝트: {org.projectCount}개</span>
                      <span>멤버: {org.memberCount}명</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* 조직 생성 모달 */}
      {user && (
        <OrganizationCreateModal
          isOpen={showOrgCreateModal}
          onClose={() => setShowOrgCreateModal(false)}
          onSuccess={handleModalSuccess}
          user={user}
        />
      )}
    </div>
  )
} 