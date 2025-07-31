'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { Tables } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
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
  
  // 정책 관련 상태 (제거됨)

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
          <div className="mb-6 p-6 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-6">
                              {/* 액터 선택 */}
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-gray-800">액터:</span>
                  {actors.length === 0 ? (
                    <Button 
                      variant="outline" 
                      size="default"
                      onClick={() => setShowActorModal(true)}
                      disabled={membership?.role !== 'admin'}
                      className="text-base px-4 py-2"
                    >
                      + 액터 추가
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="justify-between min-w-[150px] text-base h-10 px-4"
                        >
                          {selectedActor?.name || '액터 선택'}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[150px]">
                        {actors.map(actor => (
                          <DropdownMenuItem
                            key={actor.id}
                            onClick={() => handleActorSelect(actor)}
                            className="text-base py-2"
                          >
                            {actor.name}
                          </DropdownMenuItem>
                        ))}
                        {actors.length > 0 && (
                          <>
                            <div className="h-px bg-gray-200 my-1" />
                            <DropdownMenuItem
                              onClick={() => setShowActorModal(true)}
                              disabled={membership?.role !== 'admin'}
                              className="text-base py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              + 새 액터 추가
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

              {/* 유즈케이스 선택 */}
              {selectedActor && (
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-gray-800">유즈케이스:</span>
                  {usecases.length === 0 ? (
                    <Button 
                      variant="outline" 
                      size="default"
                      onClick={() => setShowUsecaseModal(true)}
                      disabled={membership?.role !== 'admin'}
                      className="text-base px-4 py-2"
                    >
                      + 유즈케이스 추가
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="justify-between min-w-[170px] text-base h-10 px-4"
                        >
                          {selectedUsecase?.name || '유즈케이스 선택'}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[170px]">
                        {usecases.map(usecase => (
                          <DropdownMenuItem
                            key={usecase.id}
                            onClick={() => setSelectedUsecase(usecase)}
                            className="text-base py-2"
                          >
                            {usecase.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
            </div>
          </div>


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