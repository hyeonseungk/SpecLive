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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 드래그 가능한 기능 카드 컴포넌트
interface SortableFeatureCardProps {
  feature: Feature
  onSelect: (feature: Feature) => void
  onEdit: (feature: Feature) => void
  onDelete: (feature: Feature) => void
  isSelected: boolean
  membership: Membership | null
}

function SortableFeatureCard({ feature, onSelect, onEdit, onDelete, isSelected, membership }: SortableFeatureCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={isDragging ? 'opacity-50' : ''}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative group p-2 rounded cursor-pointer text-sm transition-colors ${
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'bg-white hover:bg-gray-100'
        }`}
        onClick={() => onSelect(feature)}
      >
        {/* 드래그 핸들 (호버 시에만 표시, 관리자만) */}
        {isHovered && membership?.role === 'admin' && (
          <div
            {...attributes}
            {...listeners}
            className="absolute left-1 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
              <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
              <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 flex-1 ${isHovered && membership?.role === 'admin' ? 'ml-4' : ''}`}>
            {/* 시퀀스 번호 */}
            {feature.sequence && (
              <div className="w-4 h-4 bg-gray-400 text-white rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                {feature.sequence}
              </div>
            )}
            <span className="flex-1 text-base">{feature.name}</span>
          </div>
          
          {/* 편집/삭제 버튼 (호버 시에만 표시) */}
          {membership?.role === 'admin' && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(feature)
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
                  onDelete(feature)
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
    </div>
  )
}

// 드래그 가능한 정책 카드 컴포넌트
interface SortablePolicyCardProps {
  policy: FeaturePolicy
  onEdit: (policy: FeaturePolicy) => void
  membership: Membership | null
}

function SortablePolicyCard({ policy, onEdit, membership }: SortablePolicyCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: policy.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={isDragging ? 'opacity-50' : ''}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card 
        className={`p-4 flex-shrink-0 relative ${membership?.role === 'admin' ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
        onClick={() => membership?.role === 'admin' && onEdit(policy)}
      >
        {/* 드래그 핸들 (호버 시에만 표시) */}
        {isHovered && membership?.role === 'admin' && (
          <div
            {...attributes}
            {...listeners}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        )}

        {/* 시퀀스 번호 (우측 상단) */}
        {policy.sequence && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
            {policy.sequence}
          </div>
        )}

        {/* 정책 내용 */}
        <div className={`mb-3 pr-8 ${isHovered && membership?.role === 'admin' ? 'ml-8' : ''}`}>
          <p className="text-2xl font-medium text-black whitespace-pre-line">
            {policy.contents}
          </p>
        </div>

        {/* 연결된 기능들 */}
        {policy.connected_features && policy.connected_features.length > 0 && (
          <div className={`mb-3 ${isHovered && membership?.role === 'admin' ? 'ml-8' : ''}`}>
            <h5 className="text-xs font-medium text-gray-700 mb-1">연결된 기능</h5>
            <div className="space-y-1">
              {policy.connected_features.map((feature) => (
                <div 
                  key={feature.id}
                  className="text-sm text-blue-600 font-medium"
                >
                  {feature.usecase.actor.name} &gt; {feature.usecase.name} &gt; {feature.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 연결된 용어들 */}
        {policy.policy_terms && policy.policy_terms.length > 0 && (
          <div className={`mb-3 ${isHovered && membership?.role === 'admin' ? 'ml-8' : ''}`}>
            <h5 className="text-xs font-medium text-gray-700 mb-1">연결된 용어</h5>
            <div className="flex flex-wrap gap-1">
              {policy.policy_terms.map((term, index) => (
                <span 
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md"
                >
                  {term.glossaries?.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 컨텍스트 링크들 */}
        {policy.policy_links && policy.policy_links.filter(link => link.type === 'context').length > 0 && (
          <div className={`mb-3 ${isHovered && membership?.role === 'admin' ? 'ml-8' : ''}`}>
            <h5 className="text-xs font-medium text-gray-700 mb-1">컨텍스트 링크</h5>
            <div className="flex flex-wrap gap-1">
              {policy.policy_links
                .filter(link => link.type === 'context')
                .map((link, index) => (
                  <a 
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                    title={link.url}
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 {(() => {
                      try {
                        return new URL(link.url).hostname
                      } catch {
                        return link.url.length > 20 ? `${link.url.substring(0, 20)}...` : link.url
                      }
                    })()}
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* 일반 링크들 */}
        {policy.policy_links && policy.policy_links.filter(link => link.type === 'general').length > 0 && (
          <div className={`mb-3 ${isHovered && membership?.role === 'admin' ? 'ml-8' : ''}`}>
            <h5 className="text-xs font-medium text-gray-700 mb-1">일반 링크</h5>
            <div className="flex flex-wrap gap-1">
              {policy.policy_links
                .filter(link => link.type === 'general')
                .map((link, index) => (
                  <a 
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    title={link.url}
                    onClick={(e) => e.stopPropagation()}
                  >
                    📄 {(() => {
                      try {
                        return new URL(link.url).hostname
                      } catch {
                        return link.url.length > 20 ? `${link.url.substring(0, 20)}...` : link.url
                      }
                    })()}
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* 메타 정보 */}
        <div className={`pt-2 border-t border-gray-200 ${isHovered && membership?.role === 'admin' ? 'ml-8' : ''}`}>
          <div className="flex items-center text-xs text-gray-500">
            <span className="flex-1">
              {policy.created_at ? new Date(policy.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : '생성일 미확인'}
            </span>
            {policy.updated_at && policy.updated_at !== policy.created_at && (
              <span className="ml-auto text-right">
                최종 수정: {new Date(policy.updated_at).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

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

type FeaturePolicy = Tables<'policies'> & {
  sequence?: number
  policy_links?: {
    id: string
    url: string
    type: string
  }[]
  policy_terms?: {
    glossary_id: string
    glossaries?: {
      name: string
    }
  }[]
  connected_features?: {
    id: string
    name: string
    usecase: {
      name: string
      actor: {
        name: string
      }
    }
  }[]
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
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])
  const [featureSearchTerm, setFeatureSearchTerm] = useState('')
  const [policySaving, setPolicySaving] = useState(false)

  // 정책 편집 모달 상태
  const [showEditPolicyModal, setShowEditPolicyModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<FeaturePolicy | null>(null)
  const [editPolicyContents, setEditPolicyContents] = useState('')
  const [editContextLinks, setEditContextLinks] = useState<string[]>([''])
  const [editGeneralLinks, setEditGeneralLinks] = useState<string[]>([''])
  const [editSelectedGlossaryIds, setEditSelectedGlossaryIds] = useState<string[]>([])
  const [editGlossarySearchTerm, setEditGlossarySearchTerm] = useState('')
  const [editSelectedFeatureIds, setEditSelectedFeatureIds] = useState<string[]>([])
  const [editFeatureSearchTerm, setEditFeatureSearchTerm] = useState('')
  const [editPolicySaving, setEditPolicySaving] = useState(false)

  // 정책 삭제 확인 모달 상태
  const [showDeletePolicyModal, setShowDeletePolicyModal] = useState(false)
  const [deletingPolicy, setDeletingPolicy] = useState<FeaturePolicy | null>(null)
  const [policyDeleting, setPolicyDeleting] = useState(false)
  
  // 기능과 정책 관련 상태
  const [features, setFeatures] = useState<Feature[]>([])
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [featurePolicies, setFeaturePolicies] = useState<FeaturePolicy[]>([])
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [policiesLoading, setPoliciesLoading] = useState(false)
  
  // 기능 목록 검색 상태
  const [featureListSearchTerm, setFeatureListSearchTerm] = useState('')
  
  // 정책 목록 검색 상태
  const [policyListSearchTerm, setPolicyListSearchTerm] = useState('')
  
  // 용어 관련 상태
  const [glossaries, setGlossaries] = useState<Tables<'glossaries'>[]>([])
  const [glossariesLoading, setGlossariesLoading] = useState(false)
  
  // 모든 기능 관련 상태 (정책 모달용)
  const [allFeatures, setAllFeatures] = useState<(Feature & { 
    usecase: { name: string; actor: { name: string } } 
  })[]>([])
  const [allFeaturesLoading, setAllFeaturesLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // 드래그 앤 드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

      // 액터, 용어, 모든 기능 로드
      await loadActorsForProject(params.projectId)
      await loadGlossariesForProject(params.projectId)
      await loadAllFeaturesForProject(params.projectId)

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
          sequence,
          policies (
            id,
            contents,
            author_id,
            created_at,
            updated_at,
            project_id,
            policy_links (
              id,
              url,
              type
            ),
            policy_terms (
              glossary_id,
              glossaries (
                name
              )
            )
          )
        `)
        .eq('feature_id', featureId)
        .order('sequence', { ascending: true })

      if (error) throw error

      // 조인된 정책 데이터 추출 (sequence 포함)
      const policies = data?.map(item => ({
        ...item.policies,
        sequence: item.sequence
      })).filter(Boolean) || []
      
      // 각 정책에 연결된 기능들 정보 가져오기
      const policiesWithFeatures = await Promise.all(
        policies.map(async (policy) => {
          if (!policy) return policy
          
          const { data: featureData, error: featureError } = await supabase
            .from('feature_policies')
            .select(`
              features (
                id,
                name,
                usecase:usecases (
                  name,
                  actor:actors (
                    name
                  )
                )
              )
            `)
            .eq('policy_id', policy.id!)

          if (featureError) {
            console.error('Error loading connected features:', featureError)
            return policy
          }

          const connectedFeatures = featureData?.map(item => ({
            id: item.features?.id || '',
            name: item.features?.name || '',
            usecase: {
              name: item.features?.usecase?.name || '',
              actor: {
                name: item.features?.usecase?.actor?.name || ''
              }
            }
          })).filter(feature => feature.name) || []

          return {
            ...policy,
            connected_features: connectedFeatures
          }
        })
      )
      
      setFeaturePolicies(policiesWithFeatures as FeaturePolicy[])
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

  // 모든 기능 로드 함수 (정책 모달용)
  const loadAllFeaturesForProject = async (projectId: string) => {
    setAllFeaturesLoading(true)
    try {
      const { data, error } = await supabase
        .from('features')
        .select(`
          *,
          usecase:usecases (
            name,
            actor:actors (
              name
            )
          )
        `)
        .eq('usecase.actor.project_id', projectId)
        .order('sequence', { ascending: true })

      if (error) throw error

      // 타입 변환 및 필터링
      const featuresWithHierarchy = data?.map(feature => ({
        ...feature,
        usecase: {
          name: feature.usecase?.name || '',
          actor: {
            name: feature.usecase?.actor?.name || ''
          }
        }
      })).filter(feature => 
        feature.usecase.name && feature.usecase.actor.name
      ) || []

      setAllFeatures(featuresWithHierarchy)
    } catch (error) {
      console.error('Error loading all features:', error)
      showError('기능 로드 실패', '기능을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setAllFeaturesLoading(false)
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

  // 기능 선택 관리 함수들
  const handleFeatureToggle = (featureId: string) => {
    setSelectedFeatureIds(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    )
  }

  // 기능 검색 필터링
  const filteredFeatures = allFeatures.filter(feature => {
    if (!featureSearchTerm.trim()) return true
    
    const searchTerm = featureSearchTerm.toLowerCase().trim()
    const featureNameMatches = feature.name.toLowerCase().includes(searchTerm)
    const usecaseNameMatches = feature.usecase.name.toLowerCase().includes(searchTerm)
    const actorNameMatches = feature.usecase.actor.name.toLowerCase().includes(searchTerm)
    
    return featureNameMatches || usecaseNameMatches || actorNameMatches
  })

  // 정책 추가 함수
  const addPolicy = async () => {
    if (!user) return
    if (!policyContents.trim()) {
      showSimpleError('정책 내용을 입력해주세요.')
      return
    }

    // 모달에서 체크박스로 선택된 기능들만 기준으로 체크
    if (selectedFeatureIds.length === 0) {
      showSimpleError('정책은 최소 1개의 기능과 연결되어야 합니다.')
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

      // 2. 기능-정책 관계 추가 (모달에서 선택된 기능들만)
      if (selectedFeatureIds.length > 0) {
        // 각 기능별로 현재 최대 sequence 값을 조회하고 새로운 sequence 할당
        for (const featureId of selectedFeatureIds) {
          const { data: maxSequenceData, error: maxSequenceError } = await supabase
            .from('feature_policies')
            .select('sequence')
            .eq('feature_id', featureId)
            .order('sequence', { ascending: false })
            .limit(1)

          if (maxSequenceError) throw maxSequenceError

          const nextSequence = (maxSequenceData?.[0]?.sequence || 0) + 1

          const { error: featurePolicyError } = await supabase
            .from('feature_policies')
            .insert({
              feature_id: featureId,
              policy_id: policy.id,
              sequence: nextSequence
            })

          if (featurePolicyError) throw featurePolicyError
        }
      }

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

      // 6. 정책 목록 새로고침 (현재 선택된 기능이 있는 경우에만)
      if (selectedFeature && selectedFeature.id) {
        await loadPoliciesForFeature(selectedFeature.id)
      }

      // 7. 모달 초기화 및 닫기
      setPolicyContents('')
      setContextLinks([''])
      setGeneralLinks([''])
      setSelectedGlossaryIds([])
      setGlossarySearchTerm('')
      setSelectedFeatureIds([])
      setFeatureSearchTerm('')
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

  // 정책 편집 모달 열기
  const handleEditPolicy = async (policy: FeaturePolicy) => {
    setEditingPolicy(policy)
    setEditPolicyContents(policy.contents)
    
    // 기존 링크들 불러오기
    if (policy.policy_links) {
      const contextLinks = policy.policy_links.filter(link => link.type === 'context').map(link => link.url)
      const generalLinks = policy.policy_links.filter(link => link.type === 'general').map(link => link.url)
      
      setEditContextLinks(contextLinks.length > 0 ? contextLinks : [''])
      setEditGeneralLinks(generalLinks.length > 0 ? generalLinks : [''])
    } else {
      setEditContextLinks([''])
      setEditGeneralLinks([''])
    }
    
    // 기존 연결된 용어들 불러오기
    if (policy.policy_terms) {
      setEditSelectedGlossaryIds(policy.policy_terms.map(term => term.glossary_id))
    } else {
      setEditSelectedGlossaryIds([])
    }
    
    // 기존 연결된 기능들 불러오기
    if (policy.connected_features) {
      setEditSelectedFeatureIds(policy.connected_features.map(feature => feature.id))
    } else {
      setEditSelectedFeatureIds([])
    }
    
    setEditGlossarySearchTerm('')
    setEditFeatureSearchTerm('')
    setShowEditPolicyModal(true)
  }

  // 정책 수정 함수
  const updatePolicy = async () => {
    if (!editingPolicy || !user) return
    if (!editPolicyContents.trim()) {
      showSimpleError('정책 내용을 입력해주세요.')
      return
    }
    if (editSelectedFeatureIds.length === 0) {
      showSimpleError('정책은 최소 1개의 기능과 연결되어야 합니다.')
      return
    }

    setEditPolicySaving(true)
    try {
      // 1. 정책 내용 업데이트
      const { error: policyError } = await supabase
        .from('policies')
        .update({
          contents: editPolicyContents.trim()
        })
        .eq('id', editingPolicy.id)

      if (policyError) throw policyError

      // 2. 기존 링크들 삭제 후 새로 추가
      const { error: deleteLinkError } = await supabase
        .from('policy_links')
        .delete()
        .eq('policy_id', editingPolicy.id)

      if (deleteLinkError) throw deleteLinkError

      // 3. 컨텍스트 링크 추가
      const validContextLinks = editContextLinks.filter(link => link.trim())
      if (validContextLinks.length > 0) {
        const { error: contextLinksError } = await supabase
          .from('policy_links')
          .insert(
            validContextLinks.map(url => ({
              policy_id: editingPolicy.id,
              url: url.trim(),
              type: 'context' as const
            }))
          )

        if (contextLinksError) throw contextLinksError
      }

      // 4. 일반 링크 추가
      const validGeneralLinks = editGeneralLinks.filter(link => link.trim())
      if (validGeneralLinks.length > 0) {
        const { error: generalLinksError } = await supabase
          .from('policy_links')
          .insert(
            validGeneralLinks.map(url => ({
              policy_id: editingPolicy.id,
              url: url.trim(),
              type: 'general' as const
            }))
          )

        if (generalLinksError) throw generalLinksError
      }

      // 5. 기존 용어 연결 삭제 후 새로 추가
      const { error: deleteTermsError } = await supabase
        .from('policy_terms')
        .delete()
        .eq('policy_id', editingPolicy.id)

      if (deleteTermsError) throw deleteTermsError

      if (editSelectedGlossaryIds.length > 0) {
        const { error: policyTermsError } = await supabase
          .from('policy_terms')
          .insert(
            editSelectedGlossaryIds.map(glossaryId => ({
              policy_id: editingPolicy.id,
              glossary_id: glossaryId
            }))
          )

        if (policyTermsError) throw policyTermsError
      }

      // 6. 기존 기능 연결 삭제 후 새로 추가
      const { error: deleteFeaturePoliciesError } = await supabase
        .from('feature_policies')
        .delete()
        .eq('policy_id', editingPolicy.id)

      if (deleteFeaturePoliciesError) throw deleteFeaturePoliciesError

      // 각 기능별로 현재 최대 sequence 값을 조회하고 새로운 sequence 할당
      for (const featureId of editSelectedFeatureIds) {
        const { data: maxSequenceData, error: maxSequenceError } = await supabase
          .from('feature_policies')
          .select('sequence')
          .eq('feature_id', featureId)
          .order('sequence', { ascending: false })
          .limit(1)

        if (maxSequenceError) throw maxSequenceError

        const nextSequence = (maxSequenceData?.[0]?.sequence || 0) + 1

        const { error: featurePolicyError } = await supabase
          .from('feature_policies')
          .insert({
            feature_id: featureId,
            policy_id: editingPolicy.id,
            sequence: nextSequence
          })

        if (featurePolicyError) throw featurePolicyError
      }

      // 7. 정책 목록 새로고침
      if (selectedFeature && selectedFeature.id) {
        await loadPoliciesForFeature(selectedFeature.id)
      }

      // 8. 모달 초기화 및 닫기
      setShowEditPolicyModal(false)
      setEditingPolicy(null)
      setEditPolicyContents('')
      setEditContextLinks([''])
      setEditGeneralLinks([''])
      setEditSelectedGlossaryIds([])
      setEditGlossarySearchTerm('')
      setEditSelectedFeatureIds([])
      setEditFeatureSearchTerm('')
      
      showSimpleSuccess('정책이 성공적으로 수정되었습니다.')
    } catch (error) {
      console.error('Error updating policy:', error)
      showError('정책 수정 실패', '정책을 수정하는 중 오류가 발생했습니다.')
    } finally {
      setEditPolicySaving(false)
    }
  }

  // 정책 삭제 확인 모달 열기
  const handleDeletePolicy = (policy: FeaturePolicy) => {
    setDeletingPolicy(policy)
    setShowDeletePolicyModal(true)
  }

  // 정책 삭제 함수
  const deletePolicy = async () => {
    if (!deletingPolicy || !user) return

    setPolicyDeleting(true)
    try {
      // 1. 정책에 연결된 링크들 삭제
      const { error: deleteLinksError } = await supabase
        .from('policy_links')
        .delete()
        .eq('policy_id', deletingPolicy.id)

      if (deleteLinksError) throw deleteLinksError

      // 2. 정책에 연결된 용어 관계 삭제
      const { error: deleteTermsError } = await supabase
        .from('policy_terms')
        .delete()
        .eq('policy_id', deletingPolicy.id)

      if (deleteTermsError) throw deleteTermsError

      // 3. 정책에 연결된 기능 관계 삭제
      const { error: deleteFeaturePoliciesError } = await supabase
        .from('feature_policies')
        .delete()
        .eq('policy_id', deletingPolicy.id)

      if (deleteFeaturePoliciesError) throw deleteFeaturePoliciesError

      // 4. 정책 자체 삭제
      const { error: deletePolicyError } = await supabase
        .from('policies')
        .delete()
        .eq('id', deletingPolicy.id)

      if (deletePolicyError) throw deletePolicyError

      // 5. 정책 목록 새로고침
      if (selectedFeature && selectedFeature.id) {
        await loadPoliciesForFeature(selectedFeature.id)
      }

      setShowDeletePolicyModal(false)
      setDeletingPolicy(null)
      
      showSimpleSuccess('정책이 성공적으로 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting policy:', error)
      showError('정책 삭제 실패', '정책을 삭제하는 중 오류가 발생했습니다.')
    } finally {
      setPolicyDeleting(false)
    }
  }

  // 편집용 링크 관리 함수들
  const addEditLinkField = (type: 'context' | 'general') => {
    if (type === 'context') {
      setEditContextLinks(prev => [...prev, ''])
    } else {
      setEditGeneralLinks(prev => [...prev, ''])
    }
  }

  const removeEditLinkField = (type: 'context' | 'general', index: number) => {
    if (type === 'context') {
      setEditContextLinks(prev => prev.filter((_, i) => i !== index))
    } else {
      setEditGeneralLinks(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updateEditLinkField = (type: 'context' | 'general', index: number, value: string) => {
    if (type === 'context') {
      setEditContextLinks(prev => prev.map((link, i) => i === index ? value : link))
    } else {
      setEditGeneralLinks(prev => prev.map((link, i) => i === index ? value : link))
    }
  }

  // 편집용 용어 선택 관리 함수들
  const handleEditGlossaryToggle = (glossaryId: string) => {
    setEditSelectedGlossaryIds(prev => 
      prev.includes(glossaryId) 
        ? prev.filter(id => id !== glossaryId)
        : [...prev, glossaryId]
    )
  }

  // 편집용 기능 선택 관리 함수들  
  const handleEditFeatureToggle = (featureId: string) => {
    setEditSelectedFeatureIds(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    )
  }

  // 드래그 엔드 핸들러 (기능 순서 변경)
  const handleFeatureDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!selectedUsecase || !over || active.id === over.id) return

    const oldIndex = features.findIndex((item) => item.id === active.id)
    const newIndex = features.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // 로컬 상태를 시퀀스와 함께 한 번에 업데이트
    const newFeatures = arrayMove(features, oldIndex, newIndex).map((feature, index) => ({
      ...feature,
      sequence: index + 1
    }))
    
    setFeatures(newFeatures)

    // 백그라운드에서 Supabase 업데이트 (UI 블로킹 없이)
    try {
      // 배치 업데이트를 위한 Promise 배열
      const updatePromises = newFeatures.map((feature, index) => 
        supabase
          .from('features')
          .update({ sequence: index + 1 })
          .eq('id', feature.id)
      )

      await Promise.all(updatePromises)
    } catch (error) {
      console.error('Error updating feature sequence:', error)
      showError('기능 순서 변경 실패', '기능 순서를 변경하는 중 오류가 발생했습니다.')
      // 에러 발생 시 원래 상태로 복원
      if (selectedUsecase) {
        await loadFeaturesForUsecase(selectedUsecase.id)
      }
    }
  }

  // 드래그 엔드 핸들러 (정책 순서 변경)
  const handlePolicyDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!selectedFeature || !over || active.id === over.id) return

    const oldIndex = featurePolicies.findIndex((item) => item.id === active.id)
    const newIndex = featurePolicies.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // 로컬 상태를 시퀀스와 함께 한 번에 업데이트
    const newPolicies = arrayMove(featurePolicies, oldIndex, newIndex).map((policy, index) => ({
      ...policy,
      sequence: index + 1
    }))
    
    setFeaturePolicies(newPolicies)

    // 백그라운드에서 Supabase 업데이트 (UI 블로킹 없이)
    try {
      // 배치 업데이트를 위한 Promise 배열
      const updatePromises = newPolicies.map((policy, index) => 
        supabase
          .from('feature_policies')
          .update({ sequence: index + 1 })
          .eq('feature_id', selectedFeature.id)
          .eq('policy_id', policy.id!)
      )

      await Promise.all(updatePromises)
    } catch (error) {
      console.error('Error updating policy sequence:', error)
      showError('정책 순서 변경 실패', '정책 순서를 변경하는 중 오류가 발생했습니다.')
      // 에러 발생 시 원래 상태로 복원
      if (selectedFeature) {
        await loadPoliciesForFeature(selectedFeature.id)
      }
    }
  }

  // 기능 목록 필터링
  const filteredFeatureList = features.filter(feature => {
    if (!featureListSearchTerm.trim()) return true
    const searchTerm = featureListSearchTerm.toLowerCase().trim()
    return feature.name.toLowerCase().includes(searchTerm)
  })

  // 정책 목록 필터링
  const filteredPolicyList = featurePolicies.filter(policy => {
    if (!policyListSearchTerm.trim()) return true
    const searchTerm = policyListSearchTerm.toLowerCase().trim()
    
    // 정책 내용으로 검색
    const contentMatches = policy.contents.toLowerCase().includes(searchTerm)
    
    // 연결된 용어 이름으로 검색
    const termMatches = policy.policy_terms?.some(term => 
      term.glossaries?.name.toLowerCase().includes(searchTerm)
    ) || false
    
    return contentMatches || termMatches
  })



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
                
                {/* 기능 검색창 */}
                <div className="mb-3 flex-shrink-0">
                  <input
                    type="text"
                    value={featureListSearchTerm}
                    onChange={(e) => setFeatureListSearchTerm(e.target.value)}
                    placeholder="기능 이름으로 검색..."
                    className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={featuresLoading}
                  />
                  {featureListSearchTerm && (
                    <p className="text-xs text-gray-500 mt-1">
                      "{featureListSearchTerm}" 검색 결과: {filteredFeatureList.length}개
                    </p>
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
                  ) : filteredFeatureList.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-8">
                      <p>검색 결과가</p>
                      <p>없습니다</p>
                      {featureListSearchTerm && (
                        <button
                          onClick={() => setFeatureListSearchTerm('')}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                        >
                          검색어 초기화
                        </button>
                      )}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleFeatureDragEnd}
                    >
                      <SortableContext
                        items={filteredFeatureList.map(f => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2 pr-2">
                          {filteredFeatureList.map(feature => (
                            <SortableFeatureCard
                              key={feature.id}
                              feature={feature}
                              onSelect={handleFeatureSelect}
                              onEdit={handleEditFeature}
                              onDelete={handleDeleteFeature}
                              isSelected={selectedFeature?.id === feature.id}
                              membership={membership}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
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
                      onClick={() => {
                        // 현재 선택된 기능을 자동으로 포함
                        if (selectedFeature) {
                          setSelectedFeatureIds([selectedFeature.id])
                        }
                        setShowPolicyModal(true)
                      }}
                    >
                      + 정책 추가
                    </Button>
                  )}
                </div>

                {/* 정책 검색창 */}
                {selectedFeature && featurePolicies.length > 0 && (
                  <div className="mb-3 flex-shrink-0">
                    <input
                      type="text"
                      value={policyListSearchTerm}
                      onChange={(e) => setPolicyListSearchTerm(e.target.value)}
                      placeholder="정책 내용이나 연결된 용어로 검색..."
                      className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={policiesLoading}
                    />
                    {policyListSearchTerm && (
                      <p className="text-xs text-gray-500 mt-1">
                        "{policyListSearchTerm}" 검색 결과: {filteredPolicyList.length}개
                      </p>
                    )}
                  </div>
                )}

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
                  ) : filteredPolicyList.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <p>검색 결과가 없습니다</p>
                      {policyListSearchTerm && (
                        <button
                          onClick={() => setPolicyListSearchTerm('')}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                        >
                          검색어 초기화
                        </button>
                      )}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handlePolicyDragEnd}
                    >
                      <SortableContext
                        items={filteredPolicyList.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4 pr-2">
                          {filteredPolicyList.map(policy => (
                            <SortablePolicyCard
                              key={policy.id}
                              policy={policy}
                              onEdit={handleEditPolicy}
                              membership={membership}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
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
                    rows={5}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                    disabled={policySaving}
                  />
                </div>

                {/* 관련 기능 선택 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    관련 기능들 <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      (정책은 최소 1개의 기능과 연결되어야 합니다)
                    </span>
                  </label>
                  {allFeaturesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="ml-2 text-sm text-gray-500">기능 로딩 중...</span>
                    </div>
                  ) : allFeatures.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      프로젝트에 기능이 아직 없습니다. 
                      <br />
                      <span className="text-xs">먼저 액터, 유즈케이스, 기능을 추가해보세요.</span>
                    </p>
                  ) : (
                    <>
                      {/* 기능 검색창 */}
                      <div className="mb-3">
                        <input
                          type="text"
                          value={featureSearchTerm}
                          onChange={(e) => setFeatureSearchTerm(e.target.value)}
                          placeholder="액터, 유즈케이스, 기능 이름으로 검색..."
                          className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          disabled={policySaving}
                        />
                        {featureSearchTerm && (
                          <p className="text-xs text-gray-500 mt-1">
                            "{featureSearchTerm}" 검색 결과: {filteredFeatures.length}개
                          </p>
                        )}
                      </div>

                      {/* 기능 목록 */}
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                        {filteredFeatures.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500">
                              {featureSearchTerm ? '검색 결과가 없습니다' : '기능이 없습니다'}
                            </p>
                            {featureSearchTerm && (
                              <button
                                onClick={() => setFeatureSearchTerm('')}
                                className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                                disabled={policySaving}
                              >
                                검색어 초기화
                              </button>
                            )}
                          </div>
                        ) : (
                          filteredFeatures.map(feature => (
                            <label
                              key={feature.id}
                              className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedFeatureIds.includes(feature.id)}
                                onChange={() => handleFeatureToggle(feature.id)}
                                disabled={policySaving}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium block">
                                  {feature.usecase.actor.name} &gt; {feature.usecase.name} &gt; {feature.name}
                                </span>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </>
                  )}
                  {selectedFeatureIds.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md border">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        선택된 기능 ({selectedFeatureIds.length}개):
                      </p>
                      <div className="space-y-1">
                        {selectedFeatureIds.map(featureId => {
                          const feature = allFeatures.find(f => f.id === featureId)
                          if (!feature) return null
                          return (
                            <div key={featureId} className="text-sm text-blue-600 font-medium">
                              {feature.usecase.actor.name} &gt; {feature.usecase.name} &gt; {feature.name}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 컨텍스트 링크들 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      컨텍스트 링크들
                      <span className="text-xs text-gray-500 font-normal ml-1">
                        (정책 배경: 슬랙, 회의록 등)
                      </span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addLinkField('context')}
                      disabled={policySaving}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      + 링크 추가
                    </Button>
                  </div>
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
                      <button
                        type="button"
                        onClick={() => removeLinkField('context', index)}
                        disabled={policySaving || contextLinks.length === 1}
                        className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                        title="링크 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* 일반 링크들 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      일반 링크들
                      <span className="text-xs text-gray-500 font-normal ml-1">
                        (UI/UX 설계, 구현 코드 등)
                      </span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addLinkField('general')}
                      disabled={policySaving}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      + 링크 추가
                    </Button>
                  </div>
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
                      <button
                        type="button"
                        onClick={() => removeLinkField('general', index)}
                        disabled={policySaving || generalLinks.length === 1}
                        className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                        title="링크 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
                    <div className="mt-3 p-3 bg-blue-50 rounded-md border">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        선택된 용어 ({selectedGlossaryIds.length}개):
                      </p>
                      <div className="space-y-1">
                        {selectedGlossaryIds.map(glossaryId => {
                          const glossary = glossaries.find(g => g.id === glossaryId)
                          if (!glossary) return null
                          return (
                            <div key={glossaryId} className="text-sm text-blue-600 font-medium">
                              {glossary.name}
                              <span className="text-xs text-gray-500 ml-2">
                                - {glossary.definition.length > 50 
                                    ? `${glossary.definition.substring(0, 50)}...` 
                                    : glossary.definition}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
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
                    setSelectedFeatureIds([])
                    setFeatureSearchTerm('')
                  }}
                  disabled={policySaving}
                >
                  취소
                </Button>
                <Button 
                  onClick={addPolicy}
                  disabled={(() => {
                    if (policySaving) return true
                    if (!policyContents.trim()) return true
                    
                    // 모달에서 체크박스로 선택된 기능들만 기준으로 판단
                    return selectedFeatureIds.length === 0
                  })()}
                >
                  {policySaving ? '추가 중...' : '정책 추가'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 정책 편집 모달 */}
        {showEditPolicyModal && editingPolicy && membership?.role === 'admin' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">정책 편집</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setShowEditPolicyModal(false)
                      handleDeletePolicy(editingPolicy)
                    }}
                    disabled={editPolicySaving}
                  >
                    삭제
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* 정책 내용 */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    정책 내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editPolicyContents}
                    onChange={(e) => setEditPolicyContents(e.target.value)}
                    placeholder="정책의 전체 내용을 입력하세요"
                    rows={5}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                    disabled={editPolicySaving}
                  />
                </div>

                {/* 관련 기능 선택 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    관련 기능들 <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      (정책은 최소 1개의 기능과 연결되어야 합니다)
                    </span>
                  </label>
                  {allFeaturesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="ml-2 text-sm text-gray-500">기능 로딩 중...</span>
                    </div>
                  ) : allFeatures.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      프로젝트에 기능이 아직 없습니다.
                    </p>
                  ) : (
                    <>
                      {/* 기능 검색창 */}
                      <div className="mb-3">
                        <input
                          type="text"
                          value={editFeatureSearchTerm}
                          onChange={(e) => setEditFeatureSearchTerm(e.target.value)}
                          placeholder="액터, 유즈케이스, 기능 이름으로 검색..."
                          className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          disabled={editPolicySaving}
                        />
                      </div>

                      {/* 기능 목록 */}
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                        {allFeatures
                          .filter(feature => {
                            if (!editFeatureSearchTerm.trim()) return true
                            const searchTerm = editFeatureSearchTerm.toLowerCase().trim()
                            return feature.name.toLowerCase().includes(searchTerm) ||
                                   feature.usecase.name.toLowerCase().includes(searchTerm) ||
                                   feature.usecase.actor.name.toLowerCase().includes(searchTerm)
                          })
                          .map(feature => (
                            <label
                              key={feature.id}
                              className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={editSelectedFeatureIds.includes(feature.id)}
                                onChange={() => handleEditFeatureToggle(feature.id)}
                                disabled={editPolicySaving}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium block">
                                  {feature.usecase.actor.name} &gt; {feature.usecase.name} &gt; {feature.name}
                                </span>
                              </div>
                            </label>
                          ))}
                      </div>
                    </>
                  )}
                </div>

                {/* 컨텍스트 링크들 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      컨텍스트 링크들
                      <span className="text-xs text-gray-500 font-normal ml-1">
                        (정책 배경: 슬랙, 회의록 등)
                      </span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addEditLinkField('context')}
                      disabled={editPolicySaving}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      + 링크 추가
                    </Button>
                  </div>
                  {editContextLinks.map((link, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => updateEditLinkField('context', index, e.target.value)}
                        placeholder="https://..."
                        className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={editPolicySaving}
                      />
                      <button
                        type="button"
                        onClick={() => removeEditLinkField('context', index)}
                        disabled={editPolicySaving || editContextLinks.length === 1}
                        className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                        title="링크 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* 일반 링크들 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      일반 링크들
                      <span className="text-xs text-gray-500 font-normal ml-1">
                        (UI/UX 설계, 구현 코드 등)
                      </span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addEditLinkField('general')}
                      disabled={editPolicySaving}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      + 링크 추가
                    </Button>
                  </div>
                  {editGeneralLinks.map((link, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => updateEditLinkField('general', index, e.target.value)}
                        placeholder="https://..."
                        className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={editPolicySaving}
                      />
                      <button
                        type="button"
                        onClick={() => removeEditLinkField('general', index)}
                        disabled={editPolicySaving || editGeneralLinks.length === 1}
                        className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                        title="링크 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
                    </p>
                  ) : (
                    <>
                      {/* 용어 검색창 */}
                      <div className="mb-3">
                        <input
                          type="text"
                          value={editGlossarySearchTerm}
                          onChange={(e) => setEditGlossarySearchTerm(e.target.value)}
                          placeholder="용어 이름이나 정의로 검색..."
                          className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          disabled={editPolicySaving}
                        />
                      </div>

                      {/* 용어 목록 */}
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                        {glossaries
                          .filter(glossary => {
                            if (!editGlossarySearchTerm.trim()) return true
                            const searchTerm = editGlossarySearchTerm.toLowerCase().trim()
                            return glossary.name.toLowerCase().includes(searchTerm) ||
                                   glossary.definition.toLowerCase().includes(searchTerm)
                          })
                          .map(glossary => (
                            <label
                              key={glossary.id}
                              className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={editSelectedGlossaryIds.includes(glossary.id)}
                                onChange={() => handleEditGlossaryToggle(glossary.id)}
                                disabled={editPolicySaving}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium block">{glossary.name}</span>
                                <span className="text-xs text-gray-600 block truncate">
                                  {glossary.definition}
                                </span>
                              </div>
                            </label>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditPolicyModal(false)
                    setEditingPolicy(null)
                    setEditPolicyContents('')
                    setEditContextLinks([''])
                    setEditGeneralLinks([''])
                    setEditSelectedGlossaryIds([])
                    setEditGlossarySearchTerm('')
                    setEditSelectedFeatureIds([])
                    setEditFeatureSearchTerm('')
                  }}
                  disabled={editPolicySaving}
                >
                  취소
                </Button>
                <Button 
                  onClick={updatePolicy}
                  disabled={(() => {
                    if (editPolicySaving) return true
                    if (!editPolicyContents.trim()) return true
                    return editSelectedFeatureIds.length === 0
                  })()}
                >
                  {editPolicySaving ? '수정 중...' : '정책 수정'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 정책 삭제 확인 모달 */}
        {showDeletePolicyModal && deletingPolicy && membership?.role === 'admin' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">정책 삭제</h3>
              <p className="text-muted-foreground mb-6">
                정말로 이 정책을 삭제하시겠어요?
                <br />
                <span className="text-sm text-red-600">삭제된 정책은 복구할 수 없습니다.</span>
              </p>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeletePolicyModal(false)
                    setDeletingPolicy(null)
                  }}
                  disabled={policyDeleting}
                >
                  취소
                </Button>
                <Button 
                  variant="destructive"
                  onClick={deletePolicy}
                  disabled={policyDeleting}
                >
                  {policyDeleting ? '삭제 중...' : '삭제'}
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
} 