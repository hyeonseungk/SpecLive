# SpecLive SEO 가이드

## 개요

이 문서는 SpecLive 애플리케이션의 SEO(Search Engine Optimization) 전략과 구현 방법을 설명합니다.

## 현재 구현된 SEO 기능

### 1. 동적 제목 관리
- `useSEO` 훅을 통한 클라이언트 사이드 제목 관리
- 페이지별 맞춤형 제목 설정
- 다국어 지원 (한국어/영어)

### 2. 메타 태그 최적화
- Open Graph 태그 (Facebook, LinkedIn 등)
- Twitter Card 태그
- 메타 설명 및 키워드
- 로봇 메타 태그 (noindex 설정)

### 3. 페이지별 SEO 설정

#### 홈페이지 (`/`)
```typescript
useSEO({
  title: "SpecLive - 전사 용어·정책 관리 SaaS",
  description: "조직 내에서 사용하는 용어(Glossary)와 정책(Policy)을 구조화하여 한곳에서 관리하는 SaaS입니다. Domain-Driven Design의 Ubiquitous Language 개념을 실무에 적용하기 위한 협업 도구입니다.",
  keywords: "용어관리, 정책관리, SaaS, 협업도구, 조직관리, Domain-Driven Design, Ubiquitous Language",
  ogUrl: typeof window !== "undefined" ? window.location.href : undefined,
});
```

#### 대시보드 (`/dashboard`)
```typescript
useSEO({
  title: "대시보드 - SpecLive",
  description: "조직과 프로젝트를 관리하고 용어·정책을 체계적으로 관리하세요.",
  keywords: "대시보드, 조직관리, 프로젝트관리, 용어관리, 정책관리",
  noIndex: true, // 로그인 필요 페이지는 검색엔진에서 제외
});
```

#### 용어 관리 페이지
```typescript
useSEO({
  title: project ? `${project.name} - 용어 관리 - SpecLive` : "용어 관리 - SpecLive",
  description: "프로젝트에서 사용하는 용어들을 체계적으로 관리하고 정의하세요.",
  keywords: "용어관리, 용어정의, 프로젝트용어, 협업도구",
  noIndex: true,
});
```

#### 정책 관리 페이지
```typescript
useSEO({
  title: project ? `${project.name} - 정책 관리 - SpecLive` : "정책 관리 - SpecLive",
  description: "프로젝트에서 사용하는 정책들을 체계적으로 관리하고 정의하세요.",
  keywords: "정책관리, 정책정의, 프로젝트정책, 협업도구",
  noIndex: true,
});
```

## SEO 최적화 전략

### 1. 제목 최적화 원칙

#### 좋은 제목의 특징
- **명확성**: 페이지 내용을 정확히 반영
- **키워드 포함**: 주요 검색 키워드 포함
- **길이 제한**: 50-60자 이내
- **행동 유도**: 클릭을 유도하는 표현

#### 제목 작성 가이드라인
```typescript
// ✅ 좋은 예시
"SpecLive - 전사 용어·정책 관리 SaaS"
"프로젝트명 - 용어 관리 - SpecLive"
"대시보드 - SpecLive"

// ❌ 피해야 할 예시
"페이지" // 너무 일반적
"SpecLive - 전사 용어·정책 관리 SaaS | 최고의 협업 도구 | 무료 체험 가능" // 너무 길고 스팸성
```

### 2. 메타 설명 최적화

#### 좋은 메타 설명의 특징
- **명확성**: 페이지 내용을 정확히 요약
- **행동 유도**: 사용자가 클릭하고 싶게 만듦
- **길이 제한**: 150-160자 이내
- **키워드 포함**: 주요 검색 키워드 포함

#### 메타 설명 작성 가이드라인
```typescript
// ✅ 좋은 예시
"조직 내에서 사용하는 용어(Glossary)와 정책(Policy)을 구조화하여 한곳에서 관리하는 SaaS입니다. Domain-Driven Design의 Ubiquitous Language 개념을 실무에 적용하기 위한 협업 도구입니다."

// ❌ 피해야 할 예시
"SpecLive는 좋은 도구입니다." // 너무 일반적
"SpecLive - 전사 용어·정책 관리 SaaS | 최고의 협업 도구 | 무료 체험 가능 | 지금 바로 시작하세요 | 100% 만족 보장" // 스팸성
```

### 3. 키워드 전략

#### 주요 키워드 카테고리
1. **핵심 키워드**: 용어관리, 정책관리, SaaS
2. **기능 키워드**: 협업도구, 조직관리, 프로젝트관리
3. **도메인 키워드**: Domain-Driven Design, Ubiquitous Language
4. **사용자 키워드**: 팀협업, 온보딩, 신입사원

#### 키워드 배치 전략
- **제목**: 가장 중요한 키워드
- **메타 설명**: 주요 키워드 포함
- **키워드 메타 태그**: 관련 키워드 나열

### 4. 검색엔진 최적화 설정

#### 공개 페이지 (인덱싱 허용)
- 홈페이지 (`/`)
- 랜딩 페이지
- 마케팅 페이지

#### 비공개 페이지 (인덱싱 제외)
```typescript
noIndex: true
```
- 로그인 필요 페이지
- 대시보드
- 프로젝트 관리 페이지
- 초대 페이지

## 기술적 구현

### 1. useSEO 훅 사용법

```typescript
import { useSEO } from "@/lib/hooks/use-seo";

// 컴포넌트 내부에서 사용
useSEO({
  title: "페이지 제목",
  description: "페이지 설명",
  keywords: "키워드1, 키워드2, 키워드3",
  ogImage: "/images/og-image.png", // 선택사항
  ogUrl: "https://speclive.vercel.app/page", // 선택사항
  noIndex: false, // 기본값: false
});
```

### 2. 동적 제목 설정

```typescript
// 프로젝트 정보를 기반으로 한 동적 제목
useSEO({
  title: project ? `${project.name} - 용어 관리 - SpecLive` : "용어 관리 - SpecLive",
  description: "프로젝트에서 사용하는 용어들을 체계적으로 관리하고 정의하세요.",
  keywords: "용어관리, 용어정의, 프로젝트용어, 협업도구",
  noIndex: true,
});
```

### 3. 다국어 SEO 지원

```typescript
// 언어별 다른 제목 설정
const title = lang === 'ko' 
  ? "용어 관리 - SpecLive" 
  : "Glossary Management - SpecLive";

useSEO({
  title,
  description: lang === 'ko' 
    ? "프로젝트에서 사용하는 용어들을 체계적으로 관리하고 정의하세요."
    : "Systematically manage and define terms used in your project.",
  keywords: lang === 'ko' 
    ? "용어관리, 용어정의, 프로젝트용어, 협업도구"
    : "glossary management, term definition, project terms, collaboration tools",
  noIndex: true,
});
```

## 성능 최적화

### 1. 이미지 최적화
- WebP 형식 사용
- 적절한 크기로 리사이징
- lazy loading 적용

### 2. 로딩 속도 최적화
- 코드 스플리팅
- 번들 크기 최적화
- CDN 사용

### 3. 모바일 최적화
- 반응형 디자인
- 터치 친화적 인터페이스
- 빠른 로딩 시간

## 분석 및 모니터링

### 1. Google Analytics 설정
- 페이지뷰 추적
- 사용자 행동 분석
- 전환율 측정

### 2. Google Search Console 설정
- 사이트맵 제출
- 검색 성능 모니터링
- 인덱싱 상태 확인

### 3. SEO 도구 활용
- Lighthouse 성능 측정
- PageSpeed Insights
- GTmetrix

## 향후 개선 계획

### 1. 구조화된 데이터 (Schema.org)
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SpecLive",
  "description": "전사 용어·정책 관리 SaaS",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web Browser"
}
```

### 2. 사이트맵 생성
- XML 사이트맵 자동 생성
- 검색엔진에 제출

### 3. RSS 피드
- 블로그나 업데이트 내용 공유
- 사용자 구독 기능

### 4. AMP 페이지
- 모바일 최적화
- 빠른 로딩 시간

## 체크리스트

### 새 페이지 추가 시
- [ ] useSEO 훅 사용
- [ ] 적절한 제목 설정 (50-60자)
- [ ] 메타 설명 작성 (150-160자)
- [ ] 키워드 선정 및 배치
- [ ] noIndex 설정 확인
- [ ] 다국어 지원 확인

### 정기 점검 사항
- [ ] 제목 최적화 검토
- [ ] 메타 설명 업데이트
- [ ] 키워드 성과 분석
- [ ] 페이지 로딩 속도 측정
- [ ] 모바일 최적화 확인

## 참고 자료

- [Google SEO 가이드](https://developers.google.com/search/docs)
- [Next.js SEO 문서](https://nextjs.org/docs/advanced-features/seo)
- [Open Graph 프로토콜](https://ogp.me/)
- [Twitter Card 문서](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards) 