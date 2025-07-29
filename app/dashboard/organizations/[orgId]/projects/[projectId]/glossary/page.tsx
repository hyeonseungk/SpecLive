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
  const [glossaryViewMode, setGlossaryViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'created_at_old'>('created_at')
  
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
        .order('created_at', { ascending: false })

      if (error) throw error

      setGlossaries(data || [])
    } catch (error) {
      console.error('Error loading glossaries:', error)
      showError('용어 로드 실패', '용어를 불러오는 중 오류가 발생했습니다.')
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
      showError('입력 오류', '용어 이름과 정의를 모두 입력해주세요.')
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
      
      showSimpleSuccess('용어가 추가되었습니다.')
    } catch (error) {
      console.error('Error adding glossary:', error)
      showError('용어 추가 실패', '용어를 추가하는 중 오류가 발생했습니다.')
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
      showError('입력 오류', '용어 이름과 정의를 모두 입력해주세요.')
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
      showSimpleSuccess('용어가 수정되었습니다.')
    } catch (error) {
      console.error('Error updating glossary:', error)
      showError('용어 수정 실패', '용어를 수정하는 중 오류가 발생했습니다.')
    } finally {
      setEditSaving(false)
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
    } else if (sortBy === 'created_at') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    } else {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
  })

  return (
    <div className="p-6">
      <div>
        {/* 헤더 영역 */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">용어 관리</h2>
          <p className="text-muted-foreground">
            프로젝트에서 사용하는 용어들을 정의하고 관리합니다.
          </p>
        </div>

        {/* 뷰 선택, 개수 표시, 검색, 정렬 */}
        <div className="flex items-center justify-between mb-4">
          {/* 좌측: 뷰 모드 선택과 개수 표시 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGlossaryViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  glossaryViewMode === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
                title="그리드 뷰"
              >
                ⊞
              </button>
              <button
                onClick={() => setGlossaryViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  glossaryViewMode === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
                title="리스트 뷰"
              >
                ☰
              </button>
        </div>
            
            {/* 용어 개수 */}
            {glossaries.length > 0 && (
              <p className="text-sm text-muted-foreground">
                총 {glossaries.length}개의 용어
              </p>
            )}

            {/* 검색창 */}
            <div className="flex-1 max-w-xs">
              <input
                type="text"
            placeholder="용어 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* 정렬 select */}
            <div className="w-32">
                              <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'created_at' | 'created_at_old')}
                  className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="created_at">최신순</option>
                  <option value="created_at_old">오래된순</option>
                  <option value="name">이름순</option>
                </select>
            </div>
          </div>

          {/* 우측: 버튼들 */}
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              🤖 AI에게 용어 추천받기
            </Button>
            <Button onClick={() => setShowGlossaryModal(true)}>
              ➕ 용어 추가
            </Button>
          </div>
        </div>

        {/* 필터링된 용어 목록 */}
        {glossariesLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">용어를 불러오는 중...</p>
          </div>
        ) : sortedGlossaries.length === 0 ? (
            <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center text-muted-foreground">
                <p className="mb-4">
                  {searchTerm ? '검색 결과가 없습니다.' : '아직 등록된 용어가 없습니다.'}
                </p>
                {!searchTerm && (
                  <p className="text-sm mb-6">
                    첫 번째 용어를 추가하여 팀의 용어집을 만들어보세요.
                  </p>
                )}
                {!searchTerm && (
                  <Button onClick={() => setShowGlossaryModal(true)}>
                    첫 번째 용어 추가하기
                  </Button>
                )}
              </div>
              </CardContent>
            </Card>
          ) : (
          <div className={
            glossaryViewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-4'
          }>
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
                      예시: {glossary.examples}
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
                              {link.url.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-auto text-xs text-muted-foreground">
                    {new Date(glossary.created_at).toLocaleDateString('ko-KR')}
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
            <h3 className="text-lg font-semibold mb-4">새 용어 추가</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  용어 이름 *
                </label>
                <input
                  type="text"
                  value={glossaryName}
                  onChange={(e) => setGlossaryName(e.target.value)}
                  placeholder="예: 유저, 상품, 주문, .."
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={glossarySaving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  정의 *
                </label>
                <textarea
                  value={glossaryDefinition}
                  onChange={(e) => setGlossaryDefinition(e.target.value)}
                  placeholder="용어의 의미를 작성해주세요."
                  className="w-full p-2 border rounded-md h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={glossarySaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  예시 문구
                </label>
                <input
                  type="text"
                  value={glossaryExamples}
                  onChange={(e) => setGlossaryExamples(e.target.value)}
                  placeholder="예: 홍길동, 김철수, 이영희"
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={glossarySaving}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    GitHub URL
                  </label>
                  <button
                    type="button"
                    onClick={addGithubUrl}
                    disabled={glossarySaving}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    + URL 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {glossaryGithubUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateGithubUrl(index, e.target.value)}
                        placeholder="https://github.com/username/repo/blob/main/file.js"
                        className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={glossarySaving}
                      />
                      {glossaryGithubUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGithubUrl(index)}
                          disabled={glossarySaving}
                          className="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-gray-400"
                          title="URL 제거"
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
                취소
              </Button>
              <Button 
                onClick={addGlossary}
                disabled={glossarySaving || !glossaryName.trim() || !glossaryDefinition.trim()}
              >
                {glossarySaving ? '추가 중...' : '추가'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 용어 편집 모달 */}
      {showEditModal && editingGlossary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">용어 수정</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  용어 이름 *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="예: 유저, 상품, 주문, .."
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={editSaving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  정의 *
                </label>
                <textarea
                  value={editDefinition}
                  onChange={(e) => setEditDefinition(e.target.value)}
                  placeholder="용어의 의미를 작성해주세요."
                  className="w-full p-2 border rounded-md h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={editSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  예시 문구
                </label>
                <input
                  type="text"
                  value={editExamples}
                  onChange={(e) => setEditExamples(e.target.value)}
                  placeholder="예: 홍길동, 김철수, 이영희"
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={editSaving}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    GitHub URL
                  </label>
                  <button
                    type="button"
                    onClick={addEditGithubUrl}
                    disabled={editSaving}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    + URL 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {editGithubUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateEditGithubUrl(index, e.target.value)}
                        placeholder="https://github.com/username/repo/blob/main/file.js"
                        className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={editSaving}
                      />
                      {editGithubUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEditGithubUrl(index)}
                          disabled={editSaving}
                          className="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-gray-400"
                          title="URL 제거"
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
                onClick={handleCloseEditModal}
                disabled={editSaving}
              >
                취소
              </Button>
              <Button 
                onClick={updateGlossary}
                disabled={editSaving || !editName.trim() || !editDefinition.trim()}
              >
                {editSaving ? '수정 중...' : '수정'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 