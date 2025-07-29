'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorDemo } from '@/components/common/error-demo'
import supabase from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

type Organization = Tables<'organizations'>
type Project = Tables<'projects'>

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        router.push('/')
        return
      }

      // 조직 목록 가져오기
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')

      if (orgs) {
        setOrganizations(orgs)
      }

      // 사용자가 속한 프로젝트 목록 가져오기
      const { data: userProjects } = await supabase
        .from('projects')
        .select(`
          *,
          organizations (name)
        `)
        .in('id', [])  // TODO: 실제로는 memberships 테이블을 조인해야 함

      setLoading(false)
    }

    getSession()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">UbiLang</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">대시보드</h2>
          <p className="text-muted-foreground">
            프로젝트를 선택하여 용어와 정책을 관리하세요.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.length === 0 ? (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>프로젝트가 없습니다</CardTitle>
                <CardDescription>
                  아직 참여 중인 프로젝트가 없습니다. 관리자에게 프로젝트 초대를 요청하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline">
                  새 프로젝트 생성
                </Button>
              </CardContent>
            </Card>
          ) : (
            projects.map((project) => (
              <Card 
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dashboard/${project.id}`)}
              >
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>
                    조직: {(project as any).organizations?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>생성일: {new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <ErrorDemo />
      </main>
    </div>
  )
} 