'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FullScreenLoading } from '@/components/common/full-screen-loading'
import supabase from '@/lib/supabase-browser'
import { showSimpleError } from '@/lib/error-store'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

type Glossary = Tables<'glossaries'>
type Membership = Tables<'memberships'>

interface GlossaryPageProps {
  params: {
    orgId: string
    projectId: string
  }
}

export default function GlossaryPage({ params }: GlossaryPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [glossaries, setGlossaries] = useState<Glossary[]>([])
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGlossary, setNewGlossary] = useState({ name: '', definition: '' })
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        router.push('/')
        return
      }

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

      // 용어 목록 가져오기
      const { data: glossariesData } = await supabase
        .from('glossaries')
        .select('*')
        .eq('project_id', params.projectId)
        .order('name')

      if (glossariesData) {
        setGlossaries(glossariesData)
      }

      setLoading(false)
    }

    loadData()
  }, [params.projectId, router])

  const handleAddGlossary = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !newGlossary.name.trim() || !newGlossary.definition.trim()) {
      return
    }

    const { data, error } = await supabase
      .from('glossaries')
      .insert({
        project_id: params.projectId,
        name: newGlossary.name.trim(),
        definition: newGlossary.definition.trim(),
        author_id: user.id,
      })
      .select()
      .single()

    if (error) {
      showSimpleError('용어 추가 중 오류가 발생했습니다: ' + error.message)
      return
    }

    if (data) {
      setGlossaries([...glossaries, data])
      setNewGlossary({ name: '', definition: '' })
      setShowAddForm(false)
    }
  }

  const handleDeleteGlossary = async (id: string) => {
    if (!confirm('이 용어를 삭제하시겠습니까?')) {
      return
    }

    const { error } = await supabase
      .from('glossaries')
      .delete()
      .eq('id', id)

    if (error) {
      showSimpleError('용어 삭제 중 오류가 발생했습니다: ' + error.message)
      return
    }

    setGlossaries(glossaries.filter(g => g.id !== id))
  }

  const filteredGlossaries = glossaries.filter(glossary =>
    glossary.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    glossary.definition.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <FullScreenLoading />
  }

  const isAdmin = membership?.role === 'admin'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.push(`/dashboard/organizations/${params.orgId}/projects/${params.projectId}`)}
            >
              ← 프로젝트
            </Button>
            <h1 className="text-2xl font-bold">용어 관리</h1>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? '취소' : '+ 용어 추가'}
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showAddForm && isAdmin && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>새 용어 추가</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddGlossary} className="space-y-4">
                <div>
                  <Input
                    placeholder="용어 이름"
                    value={newGlossary.name}
                    onChange={(e) => setNewGlossary({ ...newGlossary, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="용어 정의"
                    value={newGlossary.definition}
                    onChange={(e) => setNewGlossary({ ...newGlossary, definition: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">추가</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    취소
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <Input
            placeholder="용어 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="grid gap-6">
          {filteredGlossaries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchTerm ? '검색 결과가 없습니다.' : '아직 등록된 용어가 없습니다.'}
                </p>
                {!searchTerm && isAdmin && (
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowAddForm(true)}
                  >
                    첫 번째 용어 추가하기
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredGlossaries.map((glossary) => (
              <Card key={glossary.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{glossary.name}</CardTitle>
                      <CardDescription className="mt-2">
                        {glossary.definition}
                      </CardDescription>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteGlossary(glossary.id)}
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    최종 수정: {new Date(glossary.updated_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
} 