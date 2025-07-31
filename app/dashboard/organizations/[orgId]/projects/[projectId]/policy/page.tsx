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

  // 기능 편집 모달 상태
  const [showEditFeatureModal, setShowEditFeatureModal] = useState(false)
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [editFeatureName, setEditFeatureName] = useState('')
  const [editFeatureSaving, setEditFeatureSaving] = useState(false)

  // 기능 삭제 확인 모달 상태
  const [showDeleteFeatureModal, setShowDeleteFeatureModal] = useState(false)
  const [deletingFeature, setDeletingFeature] = useState<Feature | null>(null)
  const [featureDeleting, setFeatureDeleting] = useState(false)

  // 정책 추가 모달 상태
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [policyContents, setPolicyContents] = useState('')
  const [contextLinks, setContextLinks] = useState<string[]>([''])
  const [generalLinks, setGeneralLinks] = useState<string[]>([''])
  const [selectedGlossaryIds, setSelectedGlossaryIds] = useState<string[]>([])
  const [glossarySearchTerm, setGlossarySearchTerm] = useState('')
  const [policySaving, setPolicySaving] = useState(false)
  
  // 기능과 정책 관련 상태
  const [features, setFeatures] = useState<Feature[]>([])
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [featurePolicies, setFeaturePolicies] = useState<FeaturePolicy[]>([])
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [policiesLoading, setPoliciesLoading] = useState(false)
  
  // 용어 관련 상태
  const [glossaries, setGlossaries] = useState<Tables<'glossaries'>[]>([])
  const [glossariesLoading, setGlossariesLoading] = useState(false)
  
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

      // 액터와 용어 로드
      await loadActorsForProject(params.projectId)
      await loadGlossariesForProject(params.projectId)

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
        .order('sequence', { ascending: true })

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
            contents,
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

  // 용어 로드 함수
  const loadGlossariesForProject = async (projectId: string) => {
    setGlossariesLoading(true)
    try {
      const { data, error } = await supabase
        .from('glossaries')
        .select('*')
        .eq('project_id', projectId)
        .order('name', { ascending: true })

      if (error) throw error

      setGlossaries(data || [])
    } catch (error) {
      console.error('Error loading glossaries:', error)
      showError('용어 로드 실패', '용어를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setGlossariesLoading(false)
    }
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
      // 1. 현재 유즈케이스의 최대 sequence 값 조회
      const { data: maxSequenceData, error: maxSequenceError } = await supabase
        .from('features')
        .select('sequence')
        .eq('usecase_id', selectedUsecase.id)
        .order('sequence', { ascending: false })
        .limit(1)

      if (maxSequenceError) throw maxSequenceError

      // 다음 sequence 값 계산 (최대값 + 1부터 시작)
      const nextSequence = (maxSequenceData?.[0]?.sequence || 0) + 1

      // 2. 기능 추가 (sequence 값 포함)
      const { data: feature, error } = await supabase
        .from('features')
        .insert({
          usecase_id: selectedUsecase.id,
          name: featureName.trim(),
          author_id: user.id,
          sequence: nextSequence
        })
        .select()
        .single()

      if (error) throw error

      setFeatures(prev => [...prev, feature].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)))
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

  // 기능 편집 모달 열기
  const handleEditFeature = (feature: Feature) => {
    setEditingFeature(feature)
    setEditFeatureName(feature.name)
    setShowEditFeatureModal(true)
  }

  // 기능 편집 함수
  const updateFeature = async () => {
    if (!editingFeature || !user) return
    if (!editFeatureName.trim()) {
      showSimpleError('기능 이름을 입력해주세요.')
      return
    }

    setEditFeatureSaving(true)
    try {
      const { data: updatedFeature, error } = await supabase
        .from('features')
        .update({
          name: editFeatureName.trim()
        })
        .eq('id', editingFeature.id)
        .select()
        .single()

      if (error) throw error

      // 목록에서 업데이트
      setFeatures(prev => prev.map(f => 
        f.id === editingFeature.id ? updatedFeature : f
      ))

      // 현재 선택된 기능이라면 업데이트
      if (selectedFeature?.id === editingFeature.id) {
        setSelectedFeature(updatedFeature)
      }

      setShowEditFeatureModal(false)
      setEditingFeature(null)
      setEditFeatureName('')
      
      showSimpleSuccess('기능이 성공적으로 수정되었습니다.')
    } catch (error) {
      console.error('Error updating feature:', error)
      showError('기능 수정 실패', '기능을 수정하는 중 오류가 발생했습니다.')
    } finally {
      setEditFeatureSaving(false)
    }
  }

  // 기능 삭제 확인 모달 열기
  const handleDeleteFeature = (feature: Feature) => {
    setDeletingFeature(feature)
    setShowDeleteFeatureModal(true)
  }

  // 링크 관리 함수들
  const addLinkField = (type: 'context' | 'general') => {
    if (type === 'context') {
      setContextLinks(prev => [...prev, ''])
    } else {
      setGeneralLinks(prev => [...prev, ''])
    }
  }

  const removeLinkField = (type: 'context' | 'general', index: number) => {
    if (type === 'context') {
      setContextLinks(prev => prev.filter((_, i) => i !== index))
    } else {
      setGeneralLinks(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updateLinkField = (type: 'context' | 'general', index: number, value: string) => {
    if (type === 'context') {
      setContextLinks(prev => prev.map((link, i) => i === index ? value : link))
    } else {
      setGeneralLinks(prev => prev.map((link, i) => i === index ? value : link))
    }
  }

  // 용어 선택 관리 함수들
  const handleGlossaryToggle = (glossaryId: string) => {
    setSelectedGlossaryIds(prev => 
      prev.includes(glossaryId) 
        ? prev.filter(id => id !== glossaryId)
        : [...prev, glossaryId]
    )
  }

  // 용어 검색 필터링
  const filteredGlossaries = glossaries.filter(glossary => {
    if (!glossarySearchTerm.trim()) return true
    
    const searchTerm = glossarySearchTerm.toLowerCase().trim()
    const nameMatches = glossary.name.toLowerCase().includes(searchTerm)
    const definitionMatches = glossary.definition.toLowerCase().includes(searchTerm)
    
    return nameMatches || definitionMatches
  })

  // 정책 추가 함수
  const addPolicy = async () => {
    if (!selectedFeature || !user) return
    if (!policyContents.trim()) {
      showSimpleError('정책 내용을 입력해주세요.')
      return
    }

    setPolicySaving(true)
    try {
      // 1. 정책 추가
      const { data: policy, error: policyError } = await supabase
        .from('policies')
        .insert({
          project_id: project!.id,
          contents: policyContents.trim(),
          author_id: user.id
        })
        .select()
        .single()

      if (policyError) throw policyError

      // 2. 기능-정책 관계 추가
      const { error: featurePolicyError } = await supabase
        .from('feature_policies')
        .insert({
          feature_id: selectedFeature.id,
          policy_id: policy.id
        })

      if (featurePolicyError) throw featurePolicyError

      // 3. 컨텍스트 링크 추가
      const validContextLinks = contextLinks.filter(link => link.trim())
      if (validContextLinks.length > 0) {
        const { error: contextLinksError } = await supabase
          .from('policy_links')
          .insert(
            validContextLinks.map(url => ({
              policy_id: policy.id,
              url: url.trim(),
              type: 'context' as const
            }))
          )

        if (contextLinksError) throw contextLinksError
      }

      // 4. 일반 링크 추가
      const validGeneralLinks = generalLinks.filter(link => link.trim())
      if (validGeneralLinks.length > 0) {
        const { error: generalLinksError } = await supabase
          .from('policy_links')
          .insert(
            validGeneralLinks.map(url => ({
              policy_id: policy.id,
              url: url.trim(),
              type: 'general' as const
            }))
          )

        if (generalLinksError) throw generalLinksError
      }

      // 5. 용어 연결 추가
      if (selectedGlossaryIds.length > 0) {
        const { error: policyTermsError } = await supabase
          .from('policy_terms')
          .insert(
            selectedGlossaryIds.map(glossaryId => ({
              policy_id: policy.id,
              glossary_id: glossaryId
            }))
          )

        if (policyTermsError) throw policyTermsError
      }

      // 6. 정책 목록 새로고침
      await loadPoliciesForFeature(selectedFeature.id)

      // 7. 모달 초기화 및 닫기
      setPolicyContents('')
      setContextLinks([''])
      setGeneralLinks([''])
      setSelectedGlossaryIds([])
      setGlossarySearchTerm('')
      setShowPolicyModal(false)
      
      showSimpleSuccess('정책이 성공적으로 추가되었습니다.')
    } catch (error) {
      console.error('Error adding policy:', error)
      showError('정책 추가 실패', '정책을 추가하는 중 오류가 발생했습니다.')
    } finally {
      setPolicySaving(false)
    }
  }

  // 기능 삭제 함수
  const deleteFeature = async () => {
    if (!deletingFeature || !user) return

    setFeatureDeleting(true)
    try {
      // 1. 삭제할 기능의 sequence 값 저장
      const deletedSequence = deletingFeature.sequence || 0

      // 2. 기능에 연결된 정책 관계 삭제 (feature_policies 테이블)
      const { error: deletePoliciesError } = await supabase
        .from('feature_policies')
        .delete()
        .eq('feature_id', deletingFeature.id)

      if (deletePoliciesError) throw deletePoliciesError

      // 3. 기능 자체 삭제
      const { error: deleteFeatureError } = await supabase
        .from('features')
        .delete()
        .eq('id', deletingFeature.id)

      if (deleteFeatureError) throw deleteFeatureError

      // 4. 삭제된 기능보다 큰 sequence를 가진 기능들의 sequence를 -1씩 조정
      const { data: higherSequenceFeatures, error: updateError } = await supabase
        .from('features')
        .select('id, sequence')
        .eq('usecase_id', selectedUsecase!.id)
        .gt('sequence', deletedSequence)
        .order('sequence', { ascending: true })

      if (updateError) throw updateError

      // 5. sequence 업데이트 (배치 처리)
      if (higherSequenceFeatures && higherSequenceFeatures.length > 0) {
        const updatePromises = higherSequenceFeatures.map(feature => 
          supabase
            .from('features')
            .update({ sequence: (feature.sequence || 0) - 1 })
            .eq('id', feature.id)
        )

        await Promise.all(updatePromises)
      }

      // 6. 목록에서 제거하고 sequence 재정렬
      const updatedFeatures = features
        .filter(f => f.id !== deletingFeature.id)
        .map(f => ({
          ...f,
          sequence: (f.sequence || 0) > deletedSequence ? (f.sequence || 0) - 1 : (f.sequence || 0)
        }))

      setFeatures(updatedFeatures)

      // 7. 현재 선택된 기능이 삭제되었다면 다른 기능 선택
      if (selectedFeature?.id === deletingFeature.id) {
        if (updatedFeatures.length > 0) {
          // 첫 번째 기능 선택
          setSelectedFeature(updatedFeatures[0])
          await loadPoliciesForFeature(updatedFeatures[0].id)
        } else {
          // 기능이 없으면 선택 해제
          setSelectedFeature(null)
          setFeaturePolicies([])
        }
      }

      setShowDeleteFeatureModal(false)
      setDeletingFeature(null)
      
      showSimpleSuccess('기능이 성공적으로 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting feature:', error)
      showError('기능 삭제 실패', '기능을 삭제하는 중 오류가 발생했습니다.')
    } finally {
      setFeatureDeleting(false)
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
        <div className="mb-6 p-6 bg-gray-200 rounded-lg">
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

            <div className="grid grid-cols-5 gap-6 h-[700px]">
              {/* 좌측: 기능 목록 (1/5) */}
              <div className="col-span-1 bg-gray-200 rounded-lg p-4 flex flex-col h-full min-h-0">
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
                
                <div className="flex-1 overflow-y-auto min-h-0">
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
                    <div className="space-y-2 pr-2">
                      {features.map(feature => (
                        <div
                          key={feature.id}
                          className={`relative group p-2 rounded cursor-pointer text-sm transition-colors ${
                            selectedFeature?.id === feature.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-white hover:bg-gray-100'
                          }`}
                          onClick={() => handleFeatureSelect(feature)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex-1">{feature.name}</span>
                            
                            {/* 편집/삭제 버튼 (호버 시에만 표시) */}
                            {membership?.role === 'admin' && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditFeature(feature)
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  title="기능 편집"
                                >
                                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteFeature(feature)
                                  }}
                                  className="p-1 hover:bg-red-100 rounded transition-colors"
                                  title="기능 삭제"
                                >
                                  <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 우측: 정책 목록 (4/5) */}
              <div className="col-span-4 bg-gray-200 rounded-lg p-4 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h4 className="font-medium">
                    {selectedFeature ? `${selectedFeature.name} 정책` : '정책'}
                  </h4>
                  {selectedFeature && membership?.role === 'admin' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowPolicyModal(true)}
                    >
                      + 정책 추가
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
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
                    <div className="space-y-3 pr-2">
                      {featurePolicies.map(policy => (
                        <Card key={policy.id} className="p-3 flex-shrink-0">
                          <p className="text-xs text-gray-600 overflow-hidden whitespace-pre-line" 
                             style={{
                               display: '-webkit-box',
                               WebkitLineClamp: 4,
                               WebkitBoxOrient: 'vertical',
                               lineHeight: '1.4em',
                               maxHeight: '5.6em'
                             }}>
                            {policy.contents}
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

        {/* 기능 편집 모달 */}
        {showEditFeatureModal && editingFeature && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">기능 편집</h3>
              
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
                    value={editFeatureName}
                    onChange={(e) => setEditFeatureName(e.target.value)}
                    placeholder="기능 이름을 입력하세요"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={editFeatureSaving}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditFeatureModal(false)
                    setEditingFeature(null)
                    setEditFeatureName('')
                  }}
                  disabled={editFeatureSaving}
                >
                  취소
                </Button>
                <Button 
                  onClick={updateFeature}
                  disabled={editFeatureSaving || !editFeatureName.trim()}
                >
                  {editFeatureSaving ? '수정 중...' : '수정'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 기능 삭제 확인 모달 */}
        {showDeleteFeatureModal && deletingFeature && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">기능 삭제</h3>
              <p className="text-muted-foreground mb-6">
                정말로 "{deletingFeature.name}" 기능을 삭제하시겠어요?
                <br />
                <span className="text-sm text-red-600">삭제된 기능은 복구할 수 없습니다.<br/>기능 내의 정책들도 모두 삭제됩니다.</span>
              </p>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteFeatureModal(false)
                    setDeletingFeature(null)
                  }}
                  disabled={featureDeleting}
                >
                  취소
                </Button>
                <Button 
                  variant="destructive"
                  onClick={deleteFeature}
                  disabled={featureDeleting}
                >
                  {featureDeleting ? '삭제 중...' : '삭제'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 정책 추가 모달 */}
        {showPolicyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">정책 추가</h3>
              
              <div className="space-y-4">
                {/* 정책 내용 */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    정책 내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={policyContents}
                    onChange={(e) => setPolicyContents(e.target.value)}
                    placeholder="정책의 전체 내용을 입력하세요"
                    rows={10}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                    disabled={policySaving}
                  />
                </div>

                {/* 컨텍스트 링크들 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    컨텍스트 링크들
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      (정책 배경: 슬랙, 회의록 등)
                    </span>
                  </label>
                  {contextLinks.map((link, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => updateLinkField('context', index, e.target.value)}
                        placeholder="https://..."
                        className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={policySaving}
                      />
                      {contextLinks.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLinkField('context', index)}
                          disabled={policySaving}
                        >
                          삭제
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addLinkField('context')}
                    disabled={policySaving}
                    className="text-sm"
                  >
                    + 컨텍스트 링크 추가
                  </Button>
                </div>

                {/* 일반 링크들 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    일반 링크들
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      (UI/UX 설계, 구현 코드 등)
                    </span>
                  </label>
                  {generalLinks.map((link, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => updateLinkField('general', index, e.target.value)}
                        placeholder="https://..."
                        className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={policySaving}
                      />
                      {generalLinks.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLinkField('general', index)}
                          disabled={policySaving}
                        >
                          삭제
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addLinkField('general')}
                    disabled={policySaving}
                    className="text-sm"
                  >
                    + 일반 링크 추가
                  </Button>
                </div>

                {/* 관련 용어 선택 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    관련 용어들
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      (이 정책과 연관된 용어를 선택하세요)
                    </span>
                  </label>
                  {glossariesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="ml-2 text-sm text-gray-500">용어 로딩 중...</span>
                    </div>
                  ) : glossaries.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      프로젝트에 용어가 아직 없습니다. 
                      <br />
                      <span className="text-xs">용어 관리 페이지에서 먼저 용어를 추가해보세요.</span>
                    </p>
                  ) : (
                    <>
                      {/* 용어 검색창 */}
                      <div className="mb-3">
                        <input
                          type="text"
                          value={glossarySearchTerm}
                          onChange={(e) => setGlossarySearchTerm(e.target.value)}
                          placeholder="용어 이름이나 정의로 검색..."
                          className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          disabled={policySaving}
                        />
                        {glossarySearchTerm && (
                          <p className="text-xs text-gray-500 mt-1">
                            "{glossarySearchTerm}" 검색 결과: {filteredGlossaries.length}개
                          </p>
                        )}
                      </div>

                      {/* 용어 목록 */}
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                        {filteredGlossaries.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500">
                              {glossarySearchTerm ? '검색 결과가 없습니다' : '용어가 없습니다'}
                            </p>
                            {glossarySearchTerm && (
                              <button
                                onClick={() => setGlossarySearchTerm('')}
                                className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                                disabled={policySaving}
                              >
                                검색어 초기화
                              </button>
                            )}
                          </div>
                        ) : (
                          filteredGlossaries.map(glossary => (
                            <label
                              key={glossary.id}
                              className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedGlossaryIds.includes(glossary.id)}
                                onChange={() => handleGlossaryToggle(glossary.id)}
                                disabled={policySaving}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium block">{glossary.name}</span>
                                <span className="text-xs text-gray-600 block truncate">
                                  {glossary.definition}
                                </span>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </>
                  )}
                  {selectedGlossaryIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedGlossaryIds.length}개 용어 선택됨
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPolicyModal(false)
                    setPolicyContents('')
                    setContextLinks([''])
                    setGeneralLinks([''])
                    setSelectedGlossaryIds([])
                    setGlossarySearchTerm('')
                  }}
                  disabled={policySaving}
                >
                  취소
                </Button>
                <Button 
                  onClick={addPolicy}
                  disabled={policySaving || !policyContents.trim()}
                >
                  {policySaving ? '추가 중...' : '정책 추가'}
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
} 