'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import supabase from '@/lib/supabase-browser'
import { showSimpleError } from '@/lib/error-store'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

type Policy = Tables<'policies'>
type Membership = Tables<'memberships'>

interface PolicyPageProps {
  params: {
    projectId: string
  }
}

export default function PolicyPage({ params }: PolicyPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPolicy, setNewPolicy] = useState({ title: '', body: '', category: '' })
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

      // 정책 목록 가져오기
      const { data: policiesData } = await supabase
        .from('policies')
        .select('*')
        .eq('project_id', params.projectId)
        .order('title')

      if (policiesData) {
        setPolicies(policiesData)
      }

      setLoading(false)
    }

    loadData()
  }, [params.projectId, router])

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !newPolicy.title.trim() || !newPolicy.body.trim() || !newPolicy.category.trim()) {
      return
    }

    const { data, error } = await supabase
      .from('policies')
      .insert({
        project_id: params.projectId,
        title: newPolicy.title.trim(),
        body: newPolicy.body.trim(),
        category: newPolicy.category.trim(),
        author_id: user.id,
      })
      .select()
      .single()

    if (error) {
      showSimpleError('정책 추가 중 오류가 발생했습니다: ' + error.message)
      return
    }

    if (data) {
      setPolicies([...policies, data])
      setNewPolicy({ title: '', body: '', category: '' })
      setShowAddForm(false)
    }
  }

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('이 정책을 삭제하시겠습니까?')) {
      return
    }

    const { error } = await supabase
      .from('policies')
      .delete()
      .eq('id', id)

    if (error) {
      showSimpleError('정책 삭제 중 오류가 발생했습니다: ' + error.message)
      return
    }

    setPolicies(policies.filter(p => p.id !== id))
  }

  const categories = Array.from(new Set(policies.map(p => p.category))).sort()

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.body.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || policy.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  const isAdmin = membership?.role === 'admin'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.push(`/dashboard/${params.projectId}`)}
            >
              ← 프로젝트
            </Button>
            <h1 className="text-2xl font-bold">정책 관리</h1>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? '취소' : '+ 정책 추가'}
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showAddForm && isAdmin && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>새 정책 추가</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPolicy} className="space-y-4">
                <div>
                  <Input
                    placeholder="정책 제목"
                    value={newPolicy.title}
                    onChange={(e) => setNewPolicy({ ...newPolicy, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Input
                    placeholder="카테고리 (예: 회원가입, 상품구매, 결제 등)"
                    value={newPolicy.category}
                    onChange={(e) => setNewPolicy({ ...newPolicy, category: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="정책 내용"
                    value={newPolicy.body}
                    onChange={(e) => setNewPolicy({ ...newPolicy, body: e.target.value })}
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

        <div className="mb-6 flex gap-4">
          <Input
            placeholder="정책 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">모든 카테고리</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-6">
          {filteredPolicies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchTerm || categoryFilter ? '검색 결과가 없습니다.' : '아직 등록된 정책이 없습니다.'}
                </p>
                {!searchTerm && !categoryFilter && isAdmin && (
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowAddForm(true)}
                  >
                    첫 번째 정책 추가하기
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredPolicies.map((policy) => (
              <Card key={policy.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{policy.title}</CardTitle>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {policy.category}
                        </span>
                      </div>
                      <CardDescription className="mt-2 whitespace-pre-wrap">
                        {policy.body}
                      </CardDescription>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePolicy(policy.id)}
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    최종 수정: {new Date(policy.updated_at).toLocaleDateString()}
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