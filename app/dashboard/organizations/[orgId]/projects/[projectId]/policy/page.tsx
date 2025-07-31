'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { Tables } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError, showSimpleError } from '@/lib/error-store'
import { showSimpleSuccess } from '@/lib/success-store'
import { useT } from '@/lib/i18n'
import { useLangStore } from '@/lib/i18n-store'

type User = {
  id: string
  email?: string
}

type Project = Tables<'projects'>
type Membership = Tables<'memberships'>

// 새로 생성한 테이블들의 타입을 직접 정의
type Actor = {
  id: string
  name: string
  project_id: string | null
  author_id: string | null
  created_at: string | null
  updated_at: string | null
}

type Usecase = {
  id: string
  name: string
  actor_id: string | null
  author_id: string | null
  created_at: string | null
  updated_at: string | null
}

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
  const t = useT()
  const { locale } = useLangStore()
  
  // 액터와 유즈케이스 상태
  const [actors, setActors] = useState<Actor[]>([])
  const [usecases, setUsecases] = useState<Usecase[]>([])
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null)
  const [selectedUsecase, setSelectedUsecase] = useState<Usecase | null>(null)
  const [actorsLoading, setActorsLoading] = useState(false)
  
  // 정책 관련 상태
  const [policies, setPolicies] = useState<Tables<'policies'>[]>([])
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // 액터 추가 모달 상태
  const [showActorModal, setShowActorModal] = useState(false)
  const [actorName, setActorName] = useState('')
  const [actorSaving, setActorSaving] = useState(false)

  // 유즈케이스 추가 모달 상태
  const [showUsecaseModal, setShowUsecaseModal] = useState(false)
  const [usecaseName, setUsecaseName] = useState('')
  const [usecaseSaving, setUsecaseSaving] = useState(false)
  
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

      // 액터 로드
      await loadActorsForProject(params.projectId)

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

  // 액터 로드 함수
  const loadActorsForProject = async (projectId: string) => {
    setActorsLoading(true)
    try {
      const { data, error } = await supabase
        .from('actors')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setActors(data || [])
      
      // 첫 번째 액터를 자동 선택
      if (data && data.length > 0) {
        setSelectedActor(data[0])
        await loadUsecasesForActor(data[0].id)
      }
    } catch (error) {
      console.error('Error loading actors:', error)
      showError('액터 로드 실패', '액터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setActorsLoading(false)
    }
  }

  // 유즈케이스 로드 함수
  const loadUsecasesForActor = async (actorId: string) => {
    try {
      const { data, error } = await supabase
        .from('usecases')
        .select('*')
        .eq('actor_id', actorId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setUsecases(data || [])
      
      // 첫 번째 유즈케이스를 자동 선택
      if (data && data.length > 0) {
        setSelectedUsecase(data[0])
      } else {
        setSelectedUsecase(null)
      }
    } catch (error) {
      console.error('Error loading usecases:', error)
      showError('유즈케이스 로드 실패', '유즈케이스를 불러오는 중 오류가 발생했습니다.')
    }
  }

  // 액터 선택 핸들러
  const handleActorSelect = async (actor: Actor) => {
    setSelectedActor(actor)
    setSelectedUsecase(null)
    await loadUsecasesForActor(actor.id)
  }

  // 액터 추가 함수
  const addActor = async () => {
    if (!project || !user) return
    if (!actorName.trim()) {
      showSimpleError('액터 이름을 입력해주세요.')
      return
    }

    setActorSaving(true)
    try {
      const { data: actor, error } = await supabase
        .from('actors')
        .insert({
          project_id: project.id,
          name: actorName.trim(),
          author_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      setActors(prev => [...prev, actor])
      setActorName('')
      setShowActorModal(false)
      
      // 첫 번째 액터라면 자동 선택
      if (actors.length === 0) {
        setSelectedActor(actor)
        setUsecases([])
        setSelectedUsecase(null)
      }
      
      showSimpleSuccess('액터가 추가되었습니다.')
    } catch (error) {
      console.error('Error adding actor:', error)
      showError('액터 추가 실패', '액터를 추가하는 중 오류가 발생했습니다.')
    } finally {
      setActorSaving(false)
    }
  }

  // 유즈케이스 추가 함수
  const addUsecase = async () => {
    if (!selectedActor || !user) return
    if (!usecaseName.trim()) {
      showSimpleError('유즈케이스 이름을 입력해주세요.')
      return
    }

    setUsecaseSaving(true)
    try {
      const { data: usecase, error } = await supabase
        .from('usecases')
        .insert({
          actor_id: selectedActor.id,
          name: usecaseName.trim(),
          author_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      setUsecases(prev => [...prev, usecase])
      setUsecaseName('')
      setShowUsecaseModal(false)
      
      // 첫 번째 유즈케이스라면 자동 선택
      if (usecases.length === 0) {
        setSelectedUsecase(usecase)
      }
      
      showSimpleSuccess('유즈케이스가 추가되었습니다.')
    } catch (error) {
      console.error('Error adding usecase:', error)
      showError('유즈케이스 추가 실패', '유즈케이스를 추가하는 중 오류가 발생했습니다.')
    } finally {
      setUsecaseSaving(false)
    }
  }

  // 정책 로드 함수
  const loadPoliciesForProject = async (projectId: string) => {
    setPoliciesLoading(true)
    try {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      setPolicies(data || [])
    } catch (error) {
      console.error('Error loading policies:', error)
      showError(t('policy.load_error_title'), t('policy.load_error_desc'))
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
            <CardTitle>{t('common.no_access')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>
              {t('buttons.back')}
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
            <h2 className="text-3xl font-bold mb-2">{t('policy.header')}</h2>
            <p className="text-muted-foreground">{t('policy.sub')}</p>
          </div>

          {/* 액터 및 유즈케이스 선택 영역 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              {/* 액터 선택 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">액터:</span>
                {actors.length === 0 ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowActorModal(true)}
                    disabled={membership?.role !== 'admin'}
                  >
                    + 액터 추가
                  </Button>
                ) : (
                  <select
                    value={selectedActor?.id || ''}
                    onChange={(e) => {
                      const actor = actors.find(a => a.id === e.target.value)
                      if (actor) handleActorSelect(actor)
                    }}
                    className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {actors.map(actor => (
                      <option key={actor.id} value={actor.id}>
                        {actor.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 유즈케이스 선택 */}
              {selectedActor && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">유즈케이스:</span>
                  {usecases.length === 0 ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowUsecaseModal(true)}
                      disabled={membership?.role !== 'admin'}
                    >
                      + 유즈케이스 추가
                    </Button>
                  ) : (
                    <select
                      value={selectedUsecase?.id || ''}
                      onChange={(e) => {
                        const usecase = usecases.find(u => u.id === e.target.value)
                        setSelectedUsecase(usecase || null)
                      }}
                      className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">유즈케이스 선택</option>
                      {usecases.map(usecase => (
                        <option key={usecase.id} value={usecase.id}>
                          {usecase.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 검색 및 필터 */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder={t('policy.search_placeholder')}
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
                <option value="">{t('policy.all_categories')}</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <Button variant="outline" disabled>
              ➕ {t('policy.add_button')}
            </Button>
          </div>

          {/* 정책 목록 */}
          {policiesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">{t('policy.loading')}</p>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8">
                <div className="text-center text-muted-foreground">
                  <p className="mb-4">
                    {searchTerm || categoryFilter ? t('policy.no_results') : t('policy.no_policies')}
                  </p>
                  {!searchTerm && !categoryFilter && (
                    <p className="text-sm mb-6">{t('policy.first_policy_sub')}</p>
                  )}
                  {!searchTerm && !categoryFilter && (
                    <Button variant="outline" disabled>
                      {t('policy.first_policy_button')}
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
                            {policy.updated_at && new Date(policy.updated_at).toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

        {/* 액터 추가 모달 */}
        {showActorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">액터 추가</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">액터 이름 *</label>
                  <input
                    type="text"
                    value={actorName}
                    onChange={(e) => setActorName(e.target.value)}
                    placeholder="예: 일반 사용자, 관리자, 고객, ..."
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={actorSaving}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowActorModal(false)
                    setActorName('')
                  }}
                  disabled={actorSaving}
                >
                  취소
                </Button>
                <Button 
                  onClick={addActor}
                  disabled={actorSaving || !actorName.trim()}
                >
                  {actorSaving ? '추가 중...' : '추가'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 유즈케이스 추가 모달 */}
        {showUsecaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">유즈케이스 추가</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    유즈케이스 이름 * 
                    <span className="text-xs text-gray-500 font-normal">
                      (액터: {selectedActor?.name})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={usecaseName}
                    onChange={(e) => setUsecaseName(e.target.value)}
                    placeholder="예: 상품 구매, 로그인, 회원가입, ..."
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={usecaseSaving}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowUsecaseModal(false)
                    setUsecaseName('')
                  }}
                  disabled={usecaseSaving}
                >
                  취소
                </Button>
                <Button 
                  onClick={addUsecase}
                  disabled={usecaseSaving || !usecaseName.trim()}
                >
                  {usecaseSaving ? '추가 중...' : '추가'}
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
} 