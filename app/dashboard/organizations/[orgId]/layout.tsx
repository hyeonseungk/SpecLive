'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LanguageSelector } from '@/components/common/language-selector'
import { OrganizationSelector } from '@/components/common/organization-selector'
import { supabase } from '@/lib/supabase-browser'
import { Tables } from '@/types/database'
import type { User } from '@supabase/supabase-js'

type Organization = Tables<'organizations'>

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const orgId = params.orgId as string

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        router.push('/')
        return
      }

      // 조직 정보 가져오기
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      setOrganization(orgData)
      setLoading(false)
    }

    loadData()
  }, [orgId, router])

  const handleOrgChange = (newOrgId: string | null) => {
    if (newOrgId) {
      router.push(`/dashboard/organizations/${newOrgId}`)
    } else {
      router.push('/dashboard')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 공통 헤더 */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">UbiLang</h1>
            {user && (
              <OrganizationSelector
                user={user}
                selectedOrgId={orgId}
                onOrgChange={handleOrgChange}
                onOrgCreated={() => {}}
              />
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main>
        {children}
      </main>
    </div>
  )
} 