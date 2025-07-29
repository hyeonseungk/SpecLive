'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FullScreenLoading } from '@/components/common/full-screen-loading'
import supabase from '@/lib/supabase-browser'
import { showError, showSimpleError } from '@/lib/error-store'
import { showSuccess } from '@/lib/success-store'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setInitialLoading(false)
      
      if (session?.user) {
        router.push('/dashboard')
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          router.push('/dashboard')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (isSignUp) {
        if (password !== passwordConfirm) {
          showError('비밀번호 확인 오류', '비밀번호가 일치하지 않습니다.')
          setSubmitting(false)
          return
        }
        if (password.length < 8) {
          showError('비밀번호 길이 오류', '비밀번호는 8자 이상이어야 합니다.')
          setSubmitting(false)
          return
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        showSuccess('회원가입 완료', '회원가입이 완료되었습니다.\n이메일을 확인해서 인증을 완료해주세요', () => {
          setEmail('')
          setPassword('')
          setPasswordConfirm('')
          setIsSignUp(false)
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error) {
      showSimpleError(error instanceof Error ? error.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (initialLoading) {
    return <FullScreenLoading />
  }

  return (
    <main className="relative flex items-center justify-center min-h-screen p-4">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/main-background.png"
          alt="Background"
          fill
          style={{ objectFit: 'cover' }}
          className="opacity-20 blur-sm"
          priority
        />
      </div>
      
      {/* Content */}
      <Card className="relative z-10 w-full max-w-md backdrop-blur-sm bg-white/90">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">UbiLang</CardTitle>
          <CardDescription className="text-center">
            전사 용어·정책 관리 플랫폼
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              {password.length > 0 && password.length < 4 && (
                <div className="text-sm font-medium text-red-600">
                  최소 4자리 이상으로 입력하세요
                </div>
              )}
              <Input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {isSignUp && (
              <div className="space-y-2">
                {passwordConfirm && (
                  <div className={`text-sm font-medium ${
                    password === passwordConfirm 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {password === passwordConfirm 
                      ? '비밀번호가 일치합니다' 
                      : '비밀번호가 일치하지 않습니다'
                    }
                  </div>
                )}
                <Input
                  type="password"
                  placeholder="비밀번호 확인"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {isSignUp ? '회원가입' : '로그인'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setPassword('')
                setPasswordConfirm('')
              }}
              className="text-sm"
            >
              {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 로딩 모달 */}
      {submitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-lg font-medium">처리 중...</span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
} 