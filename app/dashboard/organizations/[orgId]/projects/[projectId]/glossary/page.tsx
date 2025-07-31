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

// 드래그 가능한 용어 카드 컴포넌트
interface SortableGlossaryCardProps {
  glossary: Tables<'glossaries'> & { glossary_links?: any[] }
  onEdit: (glossary: Tables<'glossaries'>) => void
  onCopyUrl: (glossary: Tables<'glossaries'>) => void
  showSequence: boolean
  t: any
  locale: string
  membership: Tables<'memberships'> | null
}

function SortableGlossaryCard({ glossary, onEdit, onCopyUrl, showSequence, t, locale, membership }: SortableGlossaryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: glossary.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      id={`glossary-${glossary.id}`}
      ref={setNodeRef} 
      style={style} 
      className={isDragging ? 'opacity-50' : ''}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="cursor-pointer hover:shadow-md transition-shadow relative group">
        {/* 드래그 핸들 (시퀀스 정렬일 때만, 항상 표시, 호버 시 진하게, 관리자만) */}
        {showSequence && membership?.role === 'admin' && (
          <div
            {...attributes}
            {...listeners}
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-opacity ${
              isHovered ? 'opacity-100' : 'opacity-30'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        )}

        {/* 복사 버튼 (호버 시에만 표시) */}
        {isHovered && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCopyUrl(glossary)
              }}
              className="w-8 h-8 bg-white shadow-md hover:shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all"
              title={t('glossary.copy_url')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            {/* 시퀀스 번호 표시 (시퀀스 정렬일 때만) */}
            {showSequence && glossary.sequence && (
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                {glossary.sequence}
              </div>
            )}
          </div>
        )}

        {/* 시퀀스 번호만 표시 (호버하지 않았을 때, 시퀀스 정렬일 때만) */}
        {!isHovered && showSequence && glossary.sequence && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
            {glossary.sequence}
          </div>
        )}

        <div onClick={() => onEdit(glossary)} className={showSequence && membership?.role === 'admin' ? 'ml-8' : ''}>
          <CardHeader>
            <CardTitle className="text-3xl">{glossary.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p 
              className="text-base text-muted-foreground overflow-hidden mb-2" 
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                maxHeight: '3rem'
              } as React.CSSProperties}
            >
              {glossary.definition}
            </p>
            {glossary.examples && (
              <p className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded mb-2 w-fit">
                {t('glossary.example_prefix')}: {glossary.examples}
              </p>
            )}
            {(glossary as any).glossary_links && (glossary as any).glossary_links.length > 0 && (
              <div className="mb-2">
                <div className="flex flex-col gap-1">
                  {(glossary as any).glossary_links.map((link: any, index: number) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 flex items-center gap-1 w-fit"
                      title={link.url}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>
                        {link.url.includes('github.com') ? (
                          <img 
                            src="/images/github-mark.png" 
                            alt="GitHub" 
                            className="w-4 h-4"
                          />
                        ) : (
                          '🔗'
                        )}
                      </span>
                      <span className="break-all">
                        {link.url.trim().replace(/^https?:\/\/(?:www\.)?github\.com\/[^^\/]+\//, '')}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-auto text-xs text-muted-foreground text-right">
              최종 수정: {glossary.updated_at && new Date(glossary.updated_at).toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </CardContent>
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

interface GlossaryPageProps {
  params: {
    orgId: string
    projectId: string
  }
}

export default function GlossaryPage({ params }: GlossaryPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 용어 관련 상태
  const [glossaries, setGlossaries] = useState<Tables<'glossaries'>[]>([])
  const [glossariesLoading, setGlossariesLoading] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'updated_at' | 'updated_at_old' | 'sequence'>('sequence')
  
  // 용어 추가 모달 상태
  const [showGlossaryModal, setShowGlossaryModal] = useState(false)
  const [glossaryName, setGlossaryName] = useState('')
  const [glossaryDefinition, setGlossaryDefinition] = useState('')
  const [glossaryExamples, setGlossaryExamples] = useState('')
  const [glossaryGithubUrls, setGlossaryGithubUrls] = useState<string[]>([''])
  const [glossarySaving, setGlossarySaving] = useState(false)
  
  // 용어 편집 모달 상태
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingGlossary, setEditingGlossary] = useState<Tables<'glossaries'> | null>(null)
  const [editName, setEditName] = useState('')
  const [editDefinition, setEditDefinition] = useState('')
  const [editExamples, setEditExamples] = useState('')
  const [editGithubUrls, setEditGithubUrls] = useState<string[]>([''])
  const [editSaving, setEditSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // AI 추천 모달 상태
  const [showAiRecommendationModal, setShowAiRecommendationModal] = useState(false)
  const [aiRecommendations, setAiRecommendations] = useState<Array<{
    name: string
    definition: string
    examples?: string
    selected: boolean
  }>>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // 추가: 다국어 지원 훅
  const t = useT()
  const { locale } = useLangStore()

  const router = useRouter()

  // 드래그 앤 드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

      // 용어 로드
      await loadGlossariesForProject(params.projectId)

      setLoading(false)
    }

    loadProjectData()
  }, [params.projectId, router])

  // 해시태그로 스크롤 처리 함수
  const scrollToGlossaryByHash = (hash?: string) => {
    if (glossaries.length === 0) {
      console.log('스크롤 시도: 용어 목록이 비어있음')
      return
    }
    
    let targetHash = hash || window.location.hash.replace('#', '')
    if (!targetHash) {
      console.log('스크롤 시도: 해시가 없음')
      return
    }

    console.log('원본 해시:', targetHash)

    // URL 인코딩된 해시 디코딩
    try {
      targetHash = decodeURIComponent(targetHash)
      console.log('디코딩된 해시:', targetHash)
    } catch (error) {
      console.warn('해시 디코딩 실패:', error)
    }

    // 해시에 해당하는 용어 찾기
    const targetGlossary = glossaries.find(g => {
      const glossaryHash = g.name.toLowerCase().replace(/\s+/g, '-')
      console.log(`용어 비교: "${glossaryHash}" === "${targetHash.toLowerCase()}"`)
      return glossaryHash === targetHash.toLowerCase()
    })

    console.log('찾은 용어:', targetGlossary?.name)
    
    if (targetGlossary) {
      // 약간의 지연 후 스크롤 (DOM 렌더링 완료 대기)
      setTimeout(() => {
        const element = document.getElementById(`glossary-${targetGlossary.id}`)
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          // 스크롤 후 강조 효과
          element.classList.add('ring-2', 'ring-primary', 'ring-opacity-50')
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50')
          }, 3000)
        }
      }, 300) // 시간을 좀 더 늘림
    }
  }

  // 용어 로드 완료 후 해시 처리
  useEffect(() => {
    if (glossaries.length > 0) {
      scrollToGlossaryByHash()
    }
  }, [glossaries])

  // 해시 변경 감지 (같은 페이지에서 해시만 변경될 때)
  useEffect(() => {
    const handleHashChange = () => {
      scrollToGlossaryByHash()
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [glossaries])

  // 용어 로드 함수 (project ID를 직접 받는 버전)
  const loadGlossariesForProject = async (projectId: string) => {
    setGlossariesLoading(true)
    try {
      const { data, error } = await supabase
        .from('glossaries')
        .select(`
          *,
          glossary_links (
            url
          )
        `)
        .eq('project_id', projectId)
        .order('sequence', { ascending: true })

      if (error) throw error

      setGlossaries(data || [])
    } catch (error) {
      console.error('Error loading glossaries:', error)
      showError(t('glossary.load_error_title'), t('glossary.load_error_desc'))
    } finally {
      setGlossariesLoading(false)
    }
  }

  // GitHub URL 관리 함수들
  const addGithubUrl = () => {
    setGlossaryGithubUrls(prev => [...prev, ''])
  }

  const removeGithubUrl = (index: number) => {
    setGlossaryGithubUrls(prev => prev.filter((_, i) => i !== index))
  }

  const updateGithubUrl = (index: number, value: string) => {
    setGlossaryGithubUrls(prev => prev.map((url, i) => i === index ? value : url))
  }

  // 용어 추가 함수
  const addGlossary = async () => {
    if (!project || !user) return
    if (!glossaryName.trim() || !glossaryDefinition.trim()) {
      showError(t('glossary.input_error_title'), t('glossary.input_error_desc'))
      return
    }

    setGlossarySaving(true)
    try {
      // 1. 현재 프로젝트의 최대 sequence 값 조회
      const { data: maxSequenceData, error: maxSequenceError } = await supabase
        .from('glossaries')
        .select('sequence')
        .eq('project_id', project.id)
        .order('sequence', { ascending: false })
        .limit(1)

      if (maxSequenceError) throw maxSequenceError

      // 다음 sequence 값 계산 (최대값 + 1부터 시작)
      const nextSequence = (maxSequenceData?.[0]?.sequence || 0) + 1

      // 2. 용어 추가 (sequence 값 포함)
      const { data: glossary, error: glossaryError } = await supabase
      .from('glossaries')
      .insert({
          project_id: project.id,
          name: glossaryName.trim(),
          definition: glossaryDefinition.trim(),
          examples: glossaryExamples.trim() || null,
          author_id: user.id,
          sequence: nextSequence
      })
      .select()
      .single()

      if (glossaryError) throw glossaryError

      // 2. GitHub URL들 추가 (빈 값이 아닌 것만)
      const validUrls = glossaryGithubUrls.filter(url => url.trim())
      if (validUrls.length > 0) {
        const urlData = validUrls.map(url => ({
          glossary_id: glossary.id,
          url: url.trim()
        }))

        const { error: linksError } = await supabase
          .from('glossary_links')
          .insert(urlData)

        if (linksError) throw linksError
      }

      // 용어 목록에 새 용어 추가 (GitHub 링크 포함)
      const glossaryWithLinks = {
        ...glossary,
        glossary_links: validUrls.map(url => ({ url }))
      }
      setGlossaries(prev => [glossaryWithLinks, ...prev])
      
      // 모달 닫기 및 폼 리셋
      handleCloseGlossaryModal()
      
      showSimpleSuccess(t('glossary.add_success'))
    } catch (error) {
      console.error('Error adding glossary:', error)
      showError(t('glossary.add_error_title'), t('glossary.add_error_desc'))
    } finally {
      setGlossarySaving(false)
    }
  }

  // 모달 닫기 및 폼 리셋
  const handleCloseGlossaryModal = () => {
    setShowGlossaryModal(false)
    setGlossaryName('')
    setGlossaryDefinition('')
    setGlossaryExamples('')
    setGlossaryGithubUrls([''])
  }

  // AI 추천 모달 핸들러
  const handleOpenAiModal = () => {
    setShowAiRecommendationModal(true)
  }

  const handleCloseAiModal = () => {
    setShowAiRecommendationModal(false)
    setAiRecommendations([])
    setAiLoading(false)
    setAiError(null)
  }

  // AI 추천 요청 함수
  const handleAiRecommendation = async () => {
    if (!project) return

    // 기존 추천 결과 초기화
    setAiRecommendations([])
    setAiLoading(true)
    setAiError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-glossary-recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          count: 5,
          language: locale
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data?.recommendations) {
        setAiRecommendations(result.data.recommendations.map((rec: any) => ({
          ...rec,
          selected: false
        })))
      } else {
        throw new Error(result.error || t('glossary.ai_error'))
      }
    } catch (error) {
      console.error('AI recommendation error:', error)
      setAiError(error instanceof Error ? error.message : t('glossary.ai_error'))
    } finally {
      setAiLoading(false)
    }
  }

  // 추천 항목 선택 토글
  const toggleRecommendationSelection = (index: number) => {
    setAiRecommendations(prev => 
      prev.map((rec, i) => 
        i === index ? { ...rec, selected: !rec.selected } : rec
      )
    )
  }

  // 선택한 추천 용어들을 실제 용어집에 추가
  const addSelectedRecommendations = async () => {
    if (!project || !user) return
    
    const selectedTerms = aiRecommendations.filter(rec => rec.selected)
    if (selectedTerms.length === 0) return

    setAiLoading(true)
    try {
      // 1. 현재 프로젝트의 최대 sequence 값 조회
      const { data: maxSequenceData, error: maxSequenceError } = await supabase
        .from('glossaries')
        .select('sequence')
        .eq('project_id', project.id)
        .order('sequence', { ascending: false })
        .limit(1)

      if (maxSequenceError) throw maxSequenceError

      // 다음 sequence 값 계산 (최대값 + 1부터 시작)
      let nextSequence = (maxSequenceData?.[0]?.sequence || 0) + 1

      for (const term of selectedTerms) {
        // 2. 용어 추가 (sequence 값 포함)
        const { data: glossary, error: glossaryError } = await supabase
          .from('glossaries')
          .insert({
            project_id: project.id,
            name: term.name,
            definition: term.definition,
            examples: term.examples || null,
            author_id: user.id,
            sequence: nextSequence
          })
          .select()
          .single()

        if (glossaryError) throw glossaryError

        // 3. 목록에 새 용어 추가
        const glossaryWithLinks = {
          ...glossary,
          glossary_links: []
        }
        setGlossaries(prev => [glossaryWithLinks, ...prev])

        // 다음 용어를 위해 sequence 증가
        nextSequence++
      }

      // 3. 남은 추천 개수 계산 (상태 업데이트 전에)
      const remainingCount = aiRecommendations.filter(rec => !rec.selected).length

      // 4. 추가된 용어들을 추천 리스트에서 제거
      setAiRecommendations(prev => prev.filter(rec => !rec.selected))

      // 5. 성공 메시지
      showSimpleSuccess(`${selectedTerms.length}${t('glossary.ai_terms_added')}`)

      // 6. 남은 추천이 없으면 모달 닫기
      if (remainingCount === 0) {
        handleCloseAiModal()
      }
    } catch (error) {
      console.error('Error adding recommended terms:', error)
      showError(t('glossary.add_error_title'), t('glossary.add_error_desc'))
    } finally {
      setAiLoading(false)
    }
  }

  // 편집 모달 열기
  const handleEditGlossary = (glossary: Tables<'glossaries'>) => {
    setEditingGlossary(glossary)
    setEditName(glossary.name)
    setEditDefinition(glossary.definition)
    setEditExamples(glossary.examples || '')
    
    // GitHub URL 로드
    const links = (glossary as any).glossary_links || []
    const urls = links.map((link: any) => link.url)
    setEditGithubUrls(urls.length > 0 ? urls : [''])
    
    setShowEditModal(true)
  }

  // 편집 모달 닫기
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingGlossary(null)
    setEditName('')
    setEditDefinition('')
    setEditExamples('')
    setEditGithubUrls([''])
  }

  // 편집용 GitHub URL 관리 함수들
  const addEditGithubUrl = () => {
    setEditGithubUrls(prev => [...prev, ''])
  }

  const removeEditGithubUrl = (index: number) => {
    setEditGithubUrls(prev => prev.filter((_, i) => i !== index))
  }

  const updateEditGithubUrl = (index: number, value: string) => {
    setEditGithubUrls(prev => prev.map((url, i) => i === index ? value : url))
  }

  // 용어 수정 함수
  const updateGlossary = async () => {
    if (!editingGlossary || !user) return
    if (!editName.trim() || !editDefinition.trim()) {
      showError(t('glossary.input_error_title'), t('glossary.input_error_desc'))
      return
    }

    setEditSaving(true)
    try {
      // 1. 용어 정보 수정
      const { data: updatedGlossary, error: updateError } = await supabase
      .from('glossaries')
        .update({
          name: editName.trim(),
          definition: editDefinition.trim(),
          examples: editExamples.trim() || null
        })
        .eq('id', editingGlossary.id)
        .select()
        .single()

      if (updateError) throw updateError

      // 2. 기존 GitHub 링크 삭제
      const { error: deleteLinksError } = await supabase
        .from('glossary_links')
      .delete()
        .eq('glossary_id', editingGlossary.id)

      if (deleteLinksError) throw deleteLinksError

      // 3. 새 GitHub 링크 추가 (빈 값이 아닌 것만)
      const validUrls = editGithubUrls.filter(url => url.trim())
      if (validUrls.length > 0) {
        const urlData = validUrls.map(url => ({
          glossary_id: editingGlossary.id,
          url: url.trim()
        }))

        const { error: insertLinksError } = await supabase
          .from('glossary_links')
          .insert(urlData)

        if (insertLinksError) throw insertLinksError
      }

      // 4. 목록에서 업데이트
      const glossaryWithLinks = {
        ...updatedGlossary,
        glossary_links: validUrls.map(url => ({ url }))
      }

      setGlossaries(prev => prev.map(g => 
        g.id === editingGlossary.id ? glossaryWithLinks : g
      ))

      handleCloseEditModal()
      showSimpleSuccess(t('glossary.update_success'))
    } catch (error) {
      console.error('Error updating glossary:', error)
      showError(t('glossary.update_error_title'), t('glossary.update_error_desc'))
    } finally {
      setEditSaving(false)
    }
  }

  // 용어 삭제 함수
  const deleteGlossary = async () => {
    if (!editingGlossary || !user) return

    setEditSaving(true) // 삭제 중에는 편집 모달 버튼 비활성화
    try {
      // 1. 삭제할 용어의 sequence 값 저장
      const deletedSequence = editingGlossary.sequence

      // 2. 용어 링크 삭제
      const { error: deleteLinksError } = await supabase
        .from('glossary_links')
        .delete()
        .eq('glossary_id', editingGlossary.id)

      if (deleteLinksError) throw deleteLinksError

      // 3. 용어 자체 삭제
      const { error: deleteGlossaryError } = await supabase
        .from('glossaries')
        .delete()
        .eq('id', editingGlossary.id)

      if (deleteGlossaryError) throw deleteGlossaryError

      // 4. 삭제된 용어보다 큰 sequence를 가진 용어들의 sequence를 -1씩 조정
      const { data: higherSequenceGlossaries, error: updateError } = await supabase
        .from('glossaries')
        .select('id, sequence')
        .eq('project_id', project!.id)
        .gt('sequence', deletedSequence)
        .order('sequence', { ascending: true })

      if (updateError) throw updateError

      // 5. sequence 업데이트 (배치 처리)
      if (higherSequenceGlossaries && higherSequenceGlossaries.length > 0) {
        const updatePromises = higherSequenceGlossaries.map(glossary => 
          supabase
            .from('glossaries')
            .update({ sequence: glossary.sequence - 1 })
            .eq('id', glossary.id)
        )

        await Promise.all(updatePromises)
      }

      // 6. 목록에서 제거하고 sequence 재정렬
      setGlossaries(prev => 
        prev
          .filter(g => g.id !== editingGlossary.id)
          .map(g => ({
            ...g,
            sequence: g.sequence > deletedSequence ? g.sequence - 1 : g.sequence
          }))
      )

      handleCloseEditModal()
      showSimpleSuccess(t('glossary.delete_success'))
    } catch (error) {
      console.error('Error deleting glossary:', error)
      showError(t('glossary.delete_error_title'), t('glossary.delete_error_desc'))
    } finally {
      setEditSaving(false)
      setShowDeleteConfirm(false) // 삭제 확인 모달 닫기
    }
  }

  // URL 복사 함수
  const copyGlossaryUrl = async (glossary: Tables<'glossaries'>) => {
    const glossaryHash = glossary.name.toLowerCase().replace(/\s+/g, '-')
    const currentUrl = window.location.href.split('#')[0] // 기존 해시 제거
    const urlWithHash = `${currentUrl}#${encodeURIComponent(glossaryHash)}`
    
    try {
      await navigator.clipboard.writeText(urlWithHash)
      showSimpleSuccess(t('glossary.url_copied'))
    } catch (error) {
      console.error('URL 복사 실패:', error)
      showError(t('glossary.url_copy_error_title'), t('glossary.url_copy_error_desc'))
    }
  }

  // 드래그 엔드 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = glossaries.findIndex((item) => item.id === active.id)
      const newIndex = glossaries.findIndex((item) => item.id === over?.id)

      // 로컬 상태를 시퀀스와 함께 한 번에 업데이트
      const newGlossaries = arrayMove(glossaries, oldIndex, newIndex).map((glossary, index) => ({
        ...glossary,
        sequence: index + 1
      }))
      
      setGlossaries(newGlossaries)

      // 백그라운드에서 Supabase 업데이트 (UI 블로킹 없이)
      try {
        // 배치 업데이트를 위한 Promise 배열
        const updatePromises = newGlossaries.map((glossary, index) => 
          supabase
            .from('glossaries')
            .update({ sequence: index + 1 })
            .eq('id', glossary.id)
        )

        await Promise.all(updatePromises)
      } catch (error) {
        console.error('Error updating sequence:', error)
        showError(t('glossary.sequence_error_title'), t('glossary.sequence_error_desc'))
        // 에러 발생 시 원래 상태로 복원
        loadGlossariesForProject(params.projectId)
      }
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
            <Button onClick={() => router.push('/dashboard')}>{t('buttons.back')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 필터링된 용어 목록
  const filteredGlossaries = glossaries.filter(glossary =>
    glossary.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    glossary.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (glossary.examples && glossary.examples.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // 정렬
  const sortedGlossaries = [...filteredGlossaries].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    } else if (sortBy === 'updated_at') {
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0
      return bTime - aTime
    } else if (sortBy === 'updated_at_old') {
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0
      return aTime - bTime
    } else if (sortBy === 'sequence') {
      return a.sequence - b.sequence
    } else {
      return 0
    }
  })

  return (
    <div className="h-full flex flex-col">
      {/* 고정 영역: 헤더와 검색 바 */}
      <div className="flex-shrink-0 p-6 pb-0">
        {/* 헤더 영역 */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">{t('glossary.header')}</h2>
          <p className="text-muted-foreground">{t('glossary.sub')}</p>
        </div>

        {/* 뷰 선택, 개수 표시, 검색, 정렬 */}
        <div className="flex items-center justify-between mb-4">
                    {/* 좌측: 개수 표시 */}
          <div className="flex items-center gap-4">
            {/* 용어 개수 */}
            {glossaries.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('glossary.total_prefix')}{glossaries.length}{t('glossary.total_suffix')}
              </p>
            )}

            {/* 검색창 */}
            <div className="flex-1 max-w-xs">
              <input
                type="text"
            placeholder={t('glossary.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* 정렬 선택 */}
            <div className="w-40">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="justify-between w-full text-base h-10 px-4"
                  >
                    {sortBy === 'updated_at' && t('glossary.sort_newest')}
                    {sortBy === 'updated_at_old' && t('glossary.sort_oldest')}
                    {sortBy === 'name' && t('glossary.sort_name')}
                    {sortBy === 'sequence' && t('glossary.sort_sequence')}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => setSortBy('updated_at')}
                    className="text-base py-2"
                  >
                    {t('glossary.sort_newest')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy('updated_at_old')}
                    className="text-base py-2"
                  >
                    {t('glossary.sort_oldest')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy('name')}
                    className="text-base py-2"
                  >
                    {t('glossary.sort_name')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy('sequence')}
                    className="text-base py-2"
                  >
                    {t('glossary.sort_sequence')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 우측: 버튼들 */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenAiModal}>{t('glossary.ai_recommendation')}</Button>
            <Button onClick={() => setShowGlossaryModal(true)}>{t('glossary.add_term_button')}</Button>
          </div>
        </div>
      </div>

      {/* 스크롤 영역: 용어 카드들 */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* 필터링된 용어 목록 */}
        {glossariesLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">{t('glossary.loading')}</p>
          </div>
        ) : sortedGlossaries.length === 0 ? (
            <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center text-muted-foreground">
                <p className="mb-4">
                  {searchTerm ? t('glossary.no_results') : t('glossary.no_terms')}
                </p>
                {!searchTerm && (
                  <p className="text-sm mb-6">{t('glossary.first_term_sub')}</p>
                )}
                {!searchTerm && (
                  <Button onClick={() => setShowGlossaryModal(true)}>{t('glossary.first_term_button')}</Button>
                )}
              </div>
              </CardContent>
            </Card>
          ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedGlossaries.map(g => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {sortedGlossaries.map((glossary) => (
                  <SortableGlossaryCard
                    key={glossary.id}
                    glossary={glossary}
                    onEdit={handleEditGlossary}
                    onCopyUrl={copyGlossaryUrl}
                    showSequence={sortBy === 'sequence'}
                    t={t}
                    locale={locale}
                    membership={membership}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 용어 추가 모달 */}
      {showGlossaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('glossary.add_modal_title')}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('glossary.name_label')}</label>
                <input
                  type="text"
                  value={glossaryName}
                  onChange={(e) => setGlossaryName(e.target.value)}
                  placeholder={t('glossary.name_placeholder')}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={glossarySaving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">{t('glossary.definition_label')}</label>
                <textarea
                  value={glossaryDefinition}
                  onChange={(e) => setGlossaryDefinition(e.target.value)}
                  placeholder={t('glossary.definition_placeholder')}
                  className="w-full p-2 border rounded-md h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={glossarySaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('glossary.examples_label')}</label>
                <input
                  type="text"
                  value={glossaryExamples}
                  onChange={(e) => setGlossaryExamples(e.target.value)}
                  placeholder={t('glossary.examples_placeholder')}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={glossarySaving}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">{t('glossary.related_url_label')}</label>
                  <button
                    type="button"
                    onClick={addGithubUrl}
                    disabled={glossarySaving}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    {t('glossary.add_url')}
                  </button>
                </div>
                <div className="mb-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600 whitespace-pre-line">
                  {t('glossary.related_url_desc')}
                </div>
                <div className="space-y-2">
                  {glossaryGithubUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateGithubUrl(index, e.target.value)}
                        placeholder={t('glossary.related_url_placeholder')}
                        className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={glossarySaving}
                      />
                      {glossaryGithubUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGithubUrl(index)}
                          disabled={glossarySaving}
                          className="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-gray-400"
                          title={t('glossary.remove_url')}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={handleCloseGlossaryModal}
                disabled={glossarySaving}
              >
                {t('buttons.cancel')}
              </Button>
              <Button 
                onClick={addGlossary}
                disabled={glossarySaving || !glossaryName.trim() || !glossaryDefinition.trim()}
              >
                {glossarySaving ? t('glossary.adding') : t('glossary.add')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 용어 편집 모달 */}
      {showEditModal && editingGlossary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('glossary.edit_modal_title')}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('glossary.name_label')}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('glossary.name_placeholder')}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={editSaving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">{t('glossary.definition_label')}</label>
                <textarea
                  value={editDefinition}
                  onChange={(e) => setEditDefinition(e.target.value)}
                  placeholder={t('glossary.definition_placeholder')}
                  className="w-full p-2 border rounded-md h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={editSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('glossary.examples_label')}</label>
                <input
                  type="text"
                  value={editExamples}
                  onChange={(e) => setEditExamples(e.target.value)}
                  placeholder={t('glossary.examples_placeholder')}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={editSaving}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">{t('glossary.related_url_label')}</label>
                  <button
                    type="button"
                    onClick={addEditGithubUrl}
                    disabled={editSaving}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    {t('glossary.add_url')}
                  </button>
                </div>
                <div className="mb-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600 whitespace-pre-line">
                  {t('glossary.related_url_desc')}
                </div>
                <div className="space-y-2">
                  {editGithubUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateEditGithubUrl(index, e.target.value)}
                        placeholder={t('glossary.related_url_placeholder')}
                        className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={editSaving}
                      />
                      {editGithubUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEditGithubUrl(index)}
                          disabled={editSaving}
                          className="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-gray-400"
                          title={t('glossary.remove_url')}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={editSaving}
              >
                {t('buttons.delete')}
              </Button>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCloseEditModal}
                  disabled={editSaving}
                >
                  {t('buttons.cancel')}
                </Button>
                <Button 
                  onClick={updateGlossary}
                  disabled={editSaving || !editName.trim() || !editDefinition.trim()}
                >
                  {editSaving ? t('glossary.updating') : t('glossary.update')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('glossary.delete_confirm_title')}</h3>
            <p className="text-muted-foreground mb-6">{t('glossary.delete_confirm_desc')}</p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('buttons.cancel')}
              </Button>
              <Button 
                variant="destructive"
                onClick={deleteGlossary}
              >
                {t('buttons.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI 추천 모달 */}
      {showAiRecommendationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{t('glossary.ai_modal_title')}</h3>
            
            {/* 초기 상태 또는 로딩 상태 */}
            {aiRecommendations.length === 0 && !aiError && (
              <>
                {!aiLoading && (
                  <p className="text-muted-foreground mb-6">{t('glossary.ai_modal_desc')}</p>
                )}
                
                {aiLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">{t('glossary.ai_loading')}</p>
                  </div>
                )}
                
                {!aiLoading && (
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleCloseAiModal}
                    >
                      {t('buttons.cancel')}
                    </Button>
                    <Button 
                      onClick={handleAiRecommendation}
                      disabled={aiLoading}
                    >
                      {t('glossary.ai_get_recommendations')}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* 에러 상태 */}
            {aiError && (
              <>
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">{aiError}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseAiModal}
                  >
                    {t('buttons.cancel')}
                  </Button>
                  <Button 
                    onClick={handleAiRecommendation}
                    disabled={aiLoading}
                  >
                    {t('glossary.ai_retry')}
                  </Button>
                </div>
              </>
            )}

            {/* 추천 결과 상태 */}
            {aiRecommendations.length > 0 && !aiError && (
              <>
                <p className="text-muted-foreground mb-4">
                  {t('glossary.ai_select_terms')}
                  {aiRecommendations.some(rec => rec.selected) && 
                    ` (${aiRecommendations.filter(rec => rec.selected).length}개 선택됨)`}
                </p>
                
                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                  {aiRecommendations.map((recommendation, index) => (
                    <div 
                      key={index}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        recommendation.selected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleRecommendationSelection(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`
                            mt-1 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors
                            ${recommendation.selected 
                              ? 'bg-primary border-primary text-white' 
                              : 'border-gray-300 hover:border-gray-400'
                            }
                          `}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRecommendationSelection(index)
                          }}
                        >
                          {recommendation.selected && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1" onClick={() => toggleRecommendationSelection(index)}>
                          <h4 className="font-semibold text-base mb-1">{recommendation.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{recommendation.definition}</p>
                          {recommendation.examples && (
                            <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {t('glossary.example_prefix')}: {recommendation.examples}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseAiModal}
                    disabled={aiLoading}
                  >
                    {t('buttons.cancel')}
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleAiRecommendation}
                      disabled={aiLoading}
                    >
                      {t('glossary.ai_retry')}
                    </Button>
                    <Button 
                      onClick={addSelectedRecommendations}
                      disabled={aiLoading || aiRecommendations.filter(r => r.selected).length === 0}
                    >
                      {aiLoading ? t('common.processing') : 
                        `${t('glossary.ai_add_selected')} (${aiRecommendations.filter(r => r.selected).length})`}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 