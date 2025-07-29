'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { Tables } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError, showSimpleError } from '@/lib/error-store'
import { showSimpleSuccess } from '@/lib/success-store'

type User = {
  id: string
  email?: string
}

type Project = Tables<'projects'>
type Membership = Tables<'memberships'>

interface PolicyPageProps {
  params: {
    orgId: string
    projectId: string
  }
}

export default function PolicyPage({ params }: PolicyPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 정책 관련 상태
  const [policies, setPolicies] = useState<Tables<'policies'>[]>([])
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  
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

      // 정책 로드
      await loadPoliciesForProject(params.projectId)

      setLoading(false)
    }

    loadProjectData()
  }, [params.projectId, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // 정책 로드 함수
  const loadPoliciesForProject = async (projectId: string) => {
    setPoliciesLoading(true)
    try {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPolicies(data || [])
    } catch (error) {
      console.error('Error loading policies:', error)
      showError('정책 로드 실패', '정책을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setPoliciesLoading(false)
    }
  }

  // 필터링된 정책 목록
  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.body.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || policy.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // 고유한 카테고리 목록
  const categories = Array.from(new Set(policies.map(policy => policy.category)))

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

  return (
    <div className="p-6">
        <div>
          {/* 헤더 영역 */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">정책 관리</h2>
            <p className="text-muted-foreground">
              프로젝트 정책과 가이드라인을 작성하고 관리합니다.
            </p>
          </div>

          {/* 검색 및 필터 */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="정책 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">모든 카테고리</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <Button variant="outline" disabled>
              ➕ 정책 추가
            </Button>
          </div>

          {/* 정책 목록 */}
          {policiesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">정책을 불러오는 중...</p>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8">
                <div className="text-center text-muted-foreground">
                  <p className="mb-4">
                    {searchTerm || categoryFilter ? '검색 결과가 없습니다.' : '아직 등록된 정책이 없습니다.'}
                  </p>
                  {!searchTerm && !categoryFilter && (
                    <p className="text-sm mb-6">
                      첫 번째 정책을 추가하여 팀의 가이드라인을 만들어보세요.
                    </p>
                  )}
                  {!searchTerm && !categoryFilter && (
                    <Button variant="outline" disabled>
                      첫 번째 정책 추가하기
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPolicies.map((policy) => (
                <Card key={policy.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{policy.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {policy.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(policy.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p 
                      className="text-sm text-muted-foreground overflow-hidden" 
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        maxHeight: '4.5rem'
                      } as React.CSSProperties}
                    >
                      {policy.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
    </div>
  )
} 