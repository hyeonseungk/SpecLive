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
  const [sortBy, setSortBy] = useState<'name' | 'updated_at' | 'updated_at_old' | 'sequence'>('updated_at')
  
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

  // 추가: 다국어 지원 훅
  const t = useT()
  const { locale } = useLangStore()

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

      // 용어 로드
      await loadGlossariesForProject(params.projectId)

      setLoading(false)
    }

    loadProjectData()
  }, [params.projectId, router])

  // 용어 로드 함수 (project ID를 직접 받는 버전)
  const loadGlossariesForProject = async (projectId: string) => {
    setGlossariesLoading(true)
    try {
      const { data, error } = await supabase
        .from('glossaries')
        .select(`
          *,
          glossary_links (
            url,
            type
          )
        `)
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

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
      // 1. 용어 추가
      const { data: glossary, error: glossaryError } = await supabase
      .from('glossaries')
      .insert({
          project_id: project.id,
          name: glossaryName.trim(),
          definition: glossaryDefinition.trim(),
          examples: glossaryExamples.trim() || null,
          author_id: user.id
      })
      .select()
      .single()

      if (glossaryError) throw glossaryError

      // 2. GitHub URL들 추가 (빈 값이 아닌 것만)
      const validUrls = glossaryGithubUrls.filter(url => url.trim())
      if (validUrls.length > 0) {
        const urlData = validUrls.map(url => ({
          glossary_id: glossary.id,
          url: url.trim(),
          type: 'github' as const
        }))

        const { error: linksError } = await supabase
          .from('glossary_links')
          .insert(urlData)

        if (linksError) throw linksError
      }

      // 용어 목록에 새 용어 추가 (GitHub 링크 포함)
      const glossaryWithLinks = {
        ...glossary,
        glossary_links: validUrls.map(url => ({ url, type: 'github' }))
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
          url: url.trim(),
          type: 'github' as const
        }))

        const { error: insertLinksError } = await supabase
          .from('glossary_links')
          .insert(urlData)

        if (insertLinksError) throw insertLinksError
      }

      // 4. 목록에서 업데이트
      const glossaryWithLinks = {
        ...updatedGlossary,
        glossary_links: validUrls.map(url => ({ url, type: 'github' }))
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
      // 1. 용어 링크 삭제
      const { error: deleteLinksError } = await supabase
        .from('glossary_links')
        .delete()
        .eq('glossary_id', editingGlossary.id)

      if (deleteLinksError) throw deleteLinksError

      // 2. 용어 자체 삭제
      const { error: deleteGlossaryError } = await supabase
        .from('glossaries')
        .delete()
        .eq('id', editingGlossary.id)

      if (deleteGlossaryError) throw deleteGlossaryError

      // 3. 목록에서 제거
      setGlossaries(prev => prev.filter(g => g.id !== editingGlossary.id))

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
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    } else if (sortBy === 'updated_at_old') {
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    } else if (sortBy === 'sequence') {
      return a.sequence - b.sequence
    } else {
      return 0
    }
  })

  return (
    <div className="p-6">
      <div>
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

            {/* 정렬 select */}
            <div className="w-32">
                              <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'updated_at' | 'updated_at_old' | 'sequence')}
                  className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="updated_at">{t('glossary.sort_newest')}</option>
                  <option value="updated_at_old">{t('glossary.sort_oldest')}</option>
                  <option value="name">{t('glossary.sort_name')}</option>
                  <option value="sequence">{t('glossary.sort_sequence')}</option>
                </select>
            </div>
          </div>

          {/* 우측: 버튼들 */}
          <div className="flex gap-2">
            <Button variant="outline" disabled>{t('glossary.ai_recommendation')}</Button>
            <Button onClick={() => setShowGlossaryModal(true)}>{t('glossary.add_term_button')}</Button>
          </div>
        </div>

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
          <div className="space-y-4">
            {sortedGlossaries.map((glossary) => (
              <Card 
                key={glossary.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleEditGlossary(glossary)}
              >
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
                    <p className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded mb-2 truncate">
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
                    {new Date(glossary.updated_at).toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                  <label className="block text-sm font-medium">{t('glossary.github_label')}</label>
                  <button
                    type="button"
                    onClick={addGithubUrl}
                    disabled={glossarySaving}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    {t('glossary.add_url')}
                  </button>
                </div>
                <div className="space-y-2">
                  {glossaryGithubUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateGithubUrl(index, e.target.value)}
                        placeholder={t('glossary.github_placeholder')}
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
                  <label className="block text-sm font-medium">{t('glossary.github_label')}</label>
                  <button
                    type="button"
                    onClick={addEditGithubUrl}
                    disabled={editSaving}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    {t('glossary.add_url')}
                  </button>
                </div>
                <div className="space-y-2">
                  {editGithubUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateEditGithubUrl(index, e.target.value)}
                        placeholder={t('glossary.github_placeholder')}
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
    </div>
  )
} 