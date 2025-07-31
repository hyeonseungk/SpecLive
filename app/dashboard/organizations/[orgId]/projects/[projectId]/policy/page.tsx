'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

// 데이터베이스 테이블 타입 사용
type Actor = Tables<'actors'>
type Usecase = Tables<'usecases'>

type Feature = Tables<'features'>

type FeaturePolicy = Tables<'policies'>

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

  // 기능 추가 모달 상태
  const [showFeatureModal, setShowFeatureModal] = useState(false)
  const [featureName, setFeatureName] = useState('')
  const [featureSaving, setFeatureSaving] = useState(false)
  
  // 기능과 정책 관련 상태
  const [features, setFeatures] = useState<Feature[]>([])
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [featurePolicies, setFeaturePolicies] = useState<FeaturePolicy[]>([])
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [policiesLoading, setPoliciesLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL query parameter 업데이트 함수
  const updateURL = (actorId?: string, usecaseId?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (actorId) {
      params.set('actorId', actorId)
    } else {
      params.delete('actorId')
    }
    
    if (usecaseId) {
      params.set('usecaseId', usecaseId)
    } else {
      params.delete('usecaseId')
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`
    router.replace(newUrl, { scroll: false })
  }

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
      
      // URL parameter에서 선택할 액터 확인
      const urlActorId = searchParams.get('actorId')
      let actorToSelect = null
      
      if (data && data.length > 0) {
        if (urlActorId) {
          // URL에 actorId가 있으면 해당 액터 찾기
          actorToSelect = data.find(actor => actor.id === urlActorId) || data[0]
        } else {
          // URL에 actorId가 없으면 첫 번째 액터 선택
          actorToSelect = data[0]
        }
        
        setSelectedActor(actorToSelect)
        await loadUsecasesForActor(actorToSelect.id)
      }
    } catch (error) {
      console.error('Error loading actors:', error)
      showError(t('actor.load_error_title'), t('actor.load_error_desc'))
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
      
      // URL parameter에서 선택할 유즈케이스 확인
      const urlUsecaseId = searchParams.get('usecaseId')
      let usecaseToSelect = null
      
      if (data && data.length > 0) {
        if (urlUsecaseId) {
          // URL에 usecaseId가 있으면 해당 유즈케이스 찾기
          usecaseToSelect = data.find(usecase => usecase.id === urlUsecaseId) || data[0]
        } else {
          // URL에 usecaseId가 없으면 첫 번째 유즈케이스 선택
          usecaseToSelect = data[0]
        }
        setSelectedUsecase(usecaseToSelect)
        updateURL(actorId, usecaseToSelect.id)
        // 선택된 유즈케이스의 기능들 로드
        await loadFeaturesForUsecase(usecaseToSelect.id)
      } else {
        setSelectedUsecase(null)
        updateURL(actorId) // usecaseId 제거
        // 유즈케이스가 없으면 기능과 정책도 초기화
        setFeatures([])
        setSelectedFeature(null)
        setFeaturePolicies([])
      }
    } catch (error) {
      console.error('Error loading usecases:', error)
      showError(t('usecase.load_error_title'), t('usecase.load_error_desc'))
    }
  }

  // 기능 로드 함수
  const loadFeaturesForUsecase = async (usecaseId: string) => {
    setFeaturesLoading(true)
    try {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('usecase_id', usecaseId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setFeatures(data || [])
      
      // 첫 번째 기능을 자동 선택
      if (data && data.length > 0) {
        setSelectedFeature(data[0])
        await loadPoliciesForFeature(data[0].id)
      } else {
        setSelectedFeature(null)
        setFeaturePolicies([])
      }
    } catch (error) {
      console.error('Error loading features:', error)
      // 임시로 showError 대신 console.error만 사용 (나중에 다국어 추가)
      // showError('기능 로드 실패', '기능을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setFeaturesLoading(false)
    }
  }

  // 정책 로드 함수
  const loadPoliciesForFeature = async (featureId: string) => {
    setPoliciesLoading(true)
    try {
      const { data, error } = await supabase
        .from('feature_policies')
        .select(`
          policies (
            id,
            title,
            body,
            category,
            author_id,
            created_at,
            updated_at,
            project_id
          )
        `)
        .eq('feature_id', featureId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // 조인된 정책 데이터 추출
      const policies = data?.map(item => item.policies).filter(Boolean) || []
      setFeaturePolicies(policies as FeaturePolicy[])
    } catch (error) {
      console.error('Error loading feature policies:', error)
      // 임시로 showError 대신 console.error만 사용 (나중에 다국어 추가)
      // showError('정책 로드 실패', '정책을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setPoliciesLoading(false)
    }
  }

  // 액터 선택 핸들러
  const handleActorSelect = async (actor: Actor) => {
    setSelectedActor(actor)
    setSelectedUsecase(null)
    // 액터 변경 시 기능과 정책도 초기화
    setFeatures([])
    setSelectedFeature(null)
    setFeaturePolicies([])
    // 액터 변경 시 URL 업데이트 (usecaseId는 제거)
    updateURL(actor.id)
    await loadUsecasesForActor(actor.id)
  }

  // 유즈케이스 선택 핸들러
  const handleUsecaseSelect = async (usecase: Usecase) => {
    setSelectedUsecase(usecase)
    // 유즈케이스 선택 시 URL 업데이트
    updateURL(selectedActor?.id, usecase.id)
    // 선택된 유즈케이스의 기능들 로드
    await loadFeaturesForUsecase(usecase.id)
  }

  // 기능 선택 핸들러
  const handleFeatureSelect = async (feature: Feature) => {
    setSelectedFeature(feature)
    await loadPoliciesForFeature(feature.id)
  }

  // 액터 추가 함수
  const addActor = async () => {
    if (!project || !user) return
    if (!actorName.trim()) {
      showSimpleError(t('actor.name_required'))
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
        updateURL(actor.id)
      }
      
      showSimpleSuccess(t('actor.add_success'))
    } catch (error) {
      console.error('Error adding actor:', error)
      showError(t('actor.add_error_title'), t('actor.add_error_desc'))
    } finally {
      setActorSaving(false)
    }
  }

  // 유즈케이스 추가 함수
  const addUsecase = async () => {
    if (!selectedActor || !user) return
    if (!usecaseName.trim()) {
      showSimpleError(t('usecase.name_required'))
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
        updateURL(selectedActor?.id, usecase.id)
      }
      
      showSimpleSuccess(t('usecase.add_success'))
    } catch (error) {
      console.error('Error adding usecase:', error)
      showError(t('usecase.add_error_title'), t('usecase.add_error_desc'))
    } finally {
      setUsecaseSaving(false)
    }
  }

  // 기능 추가 함수
  const addFeature = async () => {
    if (!selectedUsecase || !user) return
    if (!featureName.trim()) {
      showSimpleError('기능 이름을 입력해주세요.')
      return
    }

    setFeatureSaving(true)
    try {
      const { data: feature, error } = await supabase
        .from('features')
        .insert({
          usecase_id: selectedUsecase.id,
          name: featureName.trim(),
          author_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      setFeatures(prev => [...prev, feature])
      setFeatureName('')
      setShowFeatureModal(false)
      
      // 첫 번째 기능이라면 자동 선택
      if (features.length === 0) {
        setSelectedFeature(feature)
        await loadPoliciesForFeature(feature.id)
      }
      
      showSimpleSuccess('기능이 성공적으로 추가되었습니다.')
    } catch (error) {
      console.error('Error adding feature:', error)
      showError('기능 추가 실패', '기능을 추가하는 중 오류가 발생했습니다.')
    } finally {
      setFeatureSaving(false)
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
    <div className="h-full flex flex-col">
      {/* 고정 영역: 헤더와 액터/유즈케이스 선택 */}
      <div className="flex-shrink-0 p-6 pb-0">
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
                <span className="text-base font-semibold text-gray-800">{t('actor.label')}</span>
                {actors.length === 0 ? (
                  <Button 
                    variant="outline" 
                    size="default"
                    onClick={() => setShowActorModal(true)}
                    disabled={membership?.role !== 'admin'}
                    className="text-base px-4 py-2"
                  >
                    {t('actor.add_button')}
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="justify-between min-w-[150px] text-base h-10 px-4"
                      >
                        {selectedActor?.name || t('actor.select_placeholder')}
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
                            {t('actor.add_new_button')}
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
                <span className="text-base font-semibold text-gray-800">{t('usecase.label')}</span>
                {usecases.length === 0 ? (
                  <Button 
                    variant="outline" 
                    size="default"
                    onClick={() => setShowUsecaseModal(true)}
                    disabled={membership?.role !== 'admin'}
                    className="text-base px-4 py-2"
                  >
                    {t('usecase.add_button')}
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="justify-between min-w-[170px] text-base h-10 px-4"
                      >
                        {selectedUsecase?.name || t('usecase.select_placeholder')}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[170px]">
                      {usecases.map(usecase => (
                        <DropdownMenuItem
                          key={usecase.id}
                          onClick={() => handleUsecaseSelect(usecase)}
                          className="text-base py-2"
                        >
                          {usecase.name}
                        </DropdownMenuItem>
                      ))}
                      {usecases.length > 0 && (
                        <>
                          <div className="h-px bg-gray-200 my-1" />
                          <DropdownMenuItem
                            onClick={() => setShowUsecaseModal(true)}
                            disabled={membership?.role !== 'admin'}
                            className="text-base py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            {t('usecase.add_new_button')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 스크롤 영역: 기능과 정책 영역 */}
      <div className="flex-1 px-6 pb-6">
        {/* 기능과 정책 섹션 */}
        {selectedUsecase && (
          <div className="h-full flex flex-col">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">기능 및 정책</h3>
              <p className="text-muted-foreground text-sm">
                {selectedUsecase.name} 유즈케이스의 기능들과 각 기능의 정책을 관리합니다.
              </p>
            </div>

            <div className="grid grid-cols-5 gap-6 flex-1 min-h-0">
              {/* 좌측: 기능 목록 (1/5) */}
              <div className="col-span-1 bg-gray-50 rounded-lg p-4 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h4 className="font-medium">기능</h4>
                  {membership?.role === 'admin' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowFeatureModal(true)}
                    >
                      + 추가
                    </Button>
                  )}
                </div>
                
                <div className="flex-1 min-h-0 overflow-hidden">
                  {featuresLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : features.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-8">
                      <p>아직 기능이</p>
                      <p>없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-2 h-full overflow-y-auto pr-2">
                      {features.map(feature => (
                        <div
                          key={feature.id}
                          onClick={() => handleFeatureSelect(feature)}
                          className={`p-2 rounded cursor-pointer text-sm transition-colors ${
                            selectedFeature?.id === feature.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-white hover:bg-gray-100'
                          }`}
                        >
                          {feature.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 우측: 정책 목록 (4/5) */}
              <div className="col-span-4 bg-gray-50 rounded-lg p-4 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h4 className="font-medium">
                    {selectedFeature ? `${selectedFeature.name} 정책` : '정책'}
                  </h4>
                  {selectedFeature && membership?.role === 'admin' && (
                    <Button size="sm" variant="outline">
                      + 정책 추가
                    </Button>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  {!selectedFeature ? (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-gray-500">기능을 선택해주세요</p>
                    </div>
                  ) : policiesLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : featurePolicies.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <p>아직 정책이 없습니다</p>
                      {membership?.role === 'admin' && (
                        <p className="text-sm mt-2">첫 번째 정책을 추가해보세요</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 h-full overflow-y-auto pr-2">
                      {featurePolicies.map(policy => (
                        <Card key={policy.id} className="p-3 flex-shrink-0">
                          <h5 className="font-medium text-sm mb-2">{policy.title}</h5>
                          <p className="text-xs text-gray-600 overflow-hidden" 
                             style={{
                               display: '-webkit-box',
                               WebkitLineClamp: 3,
                               WebkitBoxOrient: 'vertical',
                               lineHeight: '1.4em',
                               maxHeight: '4.2em'
                             }}>
                            {policy.body}
                          </p>
                          <div className="flex justify-end mt-2">
                            <Button size="sm" variant="ghost" className="text-xs">
                              자세히 보기
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* 액터 추가 모달 */}
        {showActorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">{t('actor.add_modal_title')}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('actor.name_label')}</label>
                  <input
                    type="text"
                    value={actorName}
                    onChange={(e) => setActorName(e.target.value)}
                    placeholder={t('actor.name_placeholder')}
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
                  {t('buttons.cancel')}
                </Button>
                <Button 
                  onClick={addActor}
                  disabled={actorSaving || !actorName.trim()}
                >
                  {actorSaving ? t('buttons.adding') : t('buttons.add')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 유즈케이스 추가 모달 */}
        {showUsecaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">{t('usecase.add_modal_title')}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('usecase.name_label')} 
                    <span className="text-xs text-gray-500 font-normal">
                      {t('usecase.actor_prefix')}{selectedActor?.name})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={usecaseName}
                    onChange={(e) => setUsecaseName(e.target.value)}
                    placeholder={t('usecase.name_placeholder')}
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
                  {t('buttons.cancel')}
                </Button>
                <Button 
                  onClick={addUsecase}
                  disabled={usecaseSaving || !usecaseName.trim()}
                >
                  {usecaseSaving ? t('buttons.adding') : t('buttons.add')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 기능 추가 모달 */}
        {showFeatureModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">기능 추가</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    기능 이름
                    <span className="text-xs text-gray-500 font-normal">
                      ({selectedUsecase?.name} 유즈케이스)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={featureName}
                    onChange={(e) => setFeatureName(e.target.value)}
                    placeholder="기능 이름을 입력하세요"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={featureSaving}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowFeatureModal(false)
                    setFeatureName('')
                  }}
                  disabled={featureSaving}
                >
                  취소
                </Button>
                <Button 
                  onClick={addFeature}
                  disabled={featureSaving || !featureName.trim()}
                >
                  {featureSaving ? '추가 중...' : '추가'}
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
} 