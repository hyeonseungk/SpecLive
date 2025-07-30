'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { useLangStore } from '@/lib/i18n-store'
import { FullScreenLoading } from '@/components/common/full-screen-loading'
import { ProjectCreateModal } from '@/components/common/project-create-modal'
import { OrganizationSelector } from '@/components/common/organization-selector'
import supabase from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

type Organization = Tables<'organizations'>
type Project = Tables<'projects'> & {
  memberships: Tables<'memberships'>[]
}

interface OrganizationPageProps {
  params: {
    orgId: string
  }
}

export default function OrganizationPage({ params }: OrganizationPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [userMembership, setUserMembership] = useState<Tables<'memberships'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const t = useT()
  const { locale } = useLangStore()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        router.push('/')
        return
      }

      await loadOrganizationData(session.user.id)
    }

    loadData()
  }, [params.orgId, router])

  const loadOrganizationData = async (userId: string) => {
    setLoading(true)
    try {
      // 1. 조직 정보 가져오기
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', params.orgId)
        .single()

      if (orgError) throw orgError
      setOrganization(orgData)

      // 2. 해당 조직의 프로젝트들과 사용자의 멤버십 정보 가져오기
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          memberships!inner (
            *
          )
        `)
        .eq('organization_id', params.orgId)
        .eq('memberships.user_id', userId)

      if (projectsError) throw projectsError

      // 프로젝트 데이터 구조화
      const formattedProjects: Project[] = projectsData?.map(project => ({
        ...project,
        memberships: Array.isArray(project.memberships) ? project.memberships : [project.memberships]
      })) || []

      setProjects(formattedProjects)

      // 3. 사용자가 이 조직에 대한 권한이 있는지 확인 (소유자이거나 멤버십이 있는지)
      const isOwner = orgData.owner_id === userId
      const hasMembership = formattedProjects.length > 0

      if (!isOwner && !hasMembership) {
        router.push('/dashboard')
        return
      }

      // 첫 번째 프로젝트의 멤버십 정보를 설정 (권한 확인용)
      if (formattedProjects.length > 0) {
        setUserMembership(formattedProjects[0].memberships[0])
      } else if (isOwner) {
        // 소유자이지만 프로젝트가 없는 경우
        setUserMembership({ role: 'admin' } as Tables<'memberships'>)
      }

    } catch (error) {
      console.error('Error loading organization data:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleModalSuccess = () => {
    if (user) {
      loadOrganizationData(user.id)
    }
  }

  const handleOrgChange = (newOrgId: string | null) => {
    if (newOrgId && newOrgId !== params.orgId) {
      router.push(`/dashboard/organizations/${newOrgId}`)
    } else if (newOrgId === null) {
      router.push('/dashboard')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return <FullScreenLoading message={t('common.loading')} />
  }

  if (!organization) {
    return <FullScreenLoading message={t('org.not_found')} />
  }

  const isOwner = organization.owner_id === user?.id
  const canCreateProjects = isOwner || userMembership?.role === 'admin'

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
              🏢
            </div>
            <div>
              <h2 className="text-3xl font-bold">{organization.name}</h2>
              <p className="text-muted-foreground">{t('org.tagline')}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-4 mb-2">
            {canCreateProjects && (
              <Button onClick={() => setShowProjectModal(true)}>
                {t('org.create_project')}
              </Button>
            )}
            
            {isOwner && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  {t('org.settings')}
                </Button>
              </div>
            )}
          </div>
          
          {projects.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('org.total_prefix')}{projects.length}{t('org.total_suffix')}
            </p>
          )}
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('org.no_projects_title')}</CardTitle>
              <CardDescription>{t('org.no_projects_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {canCreateProjects && (
                <Button onClick={() => setShowProjectModal(true)}>
                  {t('org.first_project_button')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const membership = project.memberships[0]
              return (
                <Card 
                  key={project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/dashboard/organizations/${params.orgId}/projects/${project.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {project.name}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        membership.role === 'admin' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {membership.role === 'admin' ? t('org.admin_role') : t('org.member_role')}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {new Date(project.created_at).toLocaleDateString(locale)} {t('org.created_suffix')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">{t('org.card_hint')}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

      {/* 프로젝트 생성 모달 */}
      {user && (
        <ProjectCreateModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onSuccess={handleModalSuccess}
          user={user}
          organizationId={params.orgId}
        />
      )}
    </div>
  )
} 