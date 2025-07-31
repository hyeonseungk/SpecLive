# UbiLang

전사 용어·정책 관리 SaaS 플랫폼

## 개요

UbiLang은 전사 구성원들이 동일한 언어로 소통할 수 있도록, 조직 내에서 사용하는 용어(Glossary)와 정책(Policy)을 구조화하여 한곳에서 관리하는 SaaS입니다.

## 기술 스택

- **프론트엔드**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI/shadcn
- **백엔드**: Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- **배포**: Vercel (프론트엔드) / Supabase (백엔드)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local` 파일을 생성하고 다음 환경변수를 설정하세요:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 이메일 발송 (Resend)
RESEND_API_KEY=your_resend_api_key

# Supabase 서비스 역할 키
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. SQL 에디터에서 아래 스키마를 실행하여 데이터베이스를 설정합니다:

```sql
-- 조직 테이블
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 프로젝트 테이블
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 멤버십 테이블
CREATE TABLE memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  receive_emails BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 용어 테이블
CREATE TABLE glossaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  definition TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 정책 테이블
CREATE TABLE policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 정책 링크 테이블
CREATE TABLE policy_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT CHECK (type IN ('context', 'general')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 용어 링크 테이블
CREATE TABLE glossary_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  glossary_id UUID REFERENCES glossaries(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 정책-용어 관계 테이블
CREATE TABLE policy_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  glossary_id UUID REFERENCES glossaries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(policy_id, glossary_id)
);

-- 용어 간 관계 테이블
CREATE TABLE glossary_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  glossary_id UUID REFERENCES glossaries(id) ON DELETE CASCADE,
  related_id UUID REFERENCES glossaries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(glossary_id, related_id),
  CHECK (glossary_id != related_id)
);

-- 이메일 이벤트 로그 테이블
CREATE TABLE email_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 활성화
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- RLS 정책 예시 (기본적인 멤버십 기반 접근)
CREATE POLICY "Users can view their memberships" ON memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view projects they're members of" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships 
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
  );
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## 개발 가이드라인

### 전역 모달 시스템

프로젝트에는 **전역 에러 모달**과 **전역 성공 모달**이 구현되어 있습니다.

#### ⚠️ **중요: 모달 중복 방지**

- **ErrorModal과 SuccessModal은 `app/layout.tsx`에만 렌더링됩니다.**
- **각 페이지에서 `<ErrorModal />`이나 `<SuccessModal />`을 추가로 렌더링하지 마세요.**
- 대신 아래의 store 함수들을 사용하여 전역 모달을 제어하세요.

#### 에러 모달 사용법

```typescript
import { showError, showSimpleError } from '@/lib/error-store'

// 간단한 에러 메시지
showSimpleError('오류가 발생했습니다.')

// 상세한 에러 메시지 (제목, 내용, 콜백)
showError(
  '데이터 저장 오류',
  '데이터를 저장하는 중 오류가 발생했습니다.\n다시 시도해주세요.',
  () => {
    console.log('사용자가 확인 버튼을 클릭했습니다.')
  }
)
```

#### 성공 모달 사용법

```typescript
import { showSuccess } from '@/lib/success-store'

showSuccess(
  '저장 완료',
  '데이터가 성공적으로 저장되었습니다.',
  () => {
    // 성공 후 콜백 (선택사항)
  }
)
```

#### 컴포넌트에서 훅 사용

```typescript
import { useErrorHandler } from '@/lib/hooks/use-error-handler'

function MyComponent() {
  const { handleError, handleAsyncError } = useErrorHandler()

  const handleSubmit = async () => {
    const result = await handleAsyncError(
      () => api.saveData(data),
      '데이터 저장 실패'
    )
    
    if (result) {
      // 성공 처리
    }
  }

  return <button onClick={handleSubmit}>저장</button>
}

## 주요 기능

- **인증**: Supabase Auth를 통한 이메일 기반 인증
- **조직/프로젝트 관리**: 계층적 구조의 조직 및 프로젝트 관리
- **용어 관리**: 프로젝트별 용어 정의 및 관리
- **정책 관리**: 프로젝트별 정책 문서 관리
- **권한 관리**: 관리자/일반 멤버 역할 기반 권한 제어
- **이메일 알림**: 용어/정책 변경 시 실시간 이메일 알림
- **검색/필터**: Fuse.js를 활용한 고급 검색 기능
- **전역 에러 모달**: Zustand + Radix UI 기반 전역 에러 핸들링

## 프로젝트 구조

```
/app
 ├─ layout.tsx              # 루트 레이아웃
 ├─ page.tsx                # 홈/로그인 페이지
 ├─ dashboard/
 │   ├─ page.tsx            # 대시보드 메인
 │   └─ [projectId]/
 │        ├─ glossary/      # 용어 관리
 │        └─ policy/        # 정책 관리
 ├─ components/
 │   ├─ glossary/           # 용어 관련 컴포넌트
 │   ├─ policy/             # 정책 관련 컴포넌트
 │   ├─ common/             # 공통 컴포넌트
 │   └─ ui/                 # shadcn/ui 컴포넌트
 ├─ lib/
 │   ├─ supabase-browser.ts # Supabase 클라이언트
 │   └─ hooks/              # 커스텀 훅
 ├─ types/
 │   └─ database.ts         # 데이터베이스 타입 정의
 └─ utils/                  # 유틸리티 함수
```

## 배포

### Vercel 배포

1. GitHub에 프로젝트를 푸시합니다.
2. [Vercel](https://vercel.com)에서 프로젝트를 임포트합니다.
3. 환경변수를 설정합니다.
4. 배포합니다.

### Supabase 설정

1. Supabase 프로젝트의 Authentication > Settings에서 Site URL을 Vercel 도메인으로 설정합니다.
2. Edge Functions를 배포하여 이메일 알림 기능을 활성화합니다.

## 라이선스

MIT License 