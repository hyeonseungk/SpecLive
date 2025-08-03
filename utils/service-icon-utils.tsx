/**
 * URL에 따른 서비스 아이콘 매핑 유틸리티
 */

interface ServiceIcon {
  src: string;
  alt: string;
}

interface ServiceMapping {
  domain: string;
  icon: ServiceIcon;
}

const SERVICE_MAPPINGS: ServiceMapping[] = [
  {
    domain: "www.figma.com",
    icon: { src: "/images/service-logos/figma.png", alt: "Figma" },
  },
  {
    domain: "slack.com",
    icon: { src: "/images/service-logos/slack.png", alt: "Slack" },
  },
  {
    domain: "www.notion.so",
    icon: { src: "/images/service-logos/notion.png", alt: "Notion" },
  },
  {
    domain: "gitlab.com",
    icon: { src: "/images/service-logos/gitlab.png", alt: "GitLab" },
  },
  {
    domain: "atlassian.net/jira",
    icon: { src: "/images/service-logos/jira.png", alt: "Jira" },
  },
  {
    domain: "atlassian.net/wiki",
    icon: { src: "/images/service-logos/confluence.png", alt: "Confluence" },
  },
  {
    domain: "bitbucket.org",
    icon: { src: "/images/service-logos/bitbucket.png", alt: "Bitbucket" },
  },
  {
    domain: "github.com",
    icon: { src: "/images/service-logos/github.png", alt: "GitHub" },
  },
];

const DEFAULT_ICON: ServiceIcon = {
  src: "/images/service-logos/just-link.png",
  alt: "Link",
};

/**
 * URL을 분석하여 해당하는 서비스 아이콘 정보를 반환합니다.
 * @param url - 분석할 URL
 * @returns 서비스 아이콘 정보 (src, alt)
 */
export function getServiceIcon(url: string): ServiceIcon {
  if (!url) {
    return DEFAULT_ICON;
  }

  const lowercaseUrl = url.toLowerCase();
  for (const mapping of SERVICE_MAPPINGS) {
    if (lowercaseUrl.includes(mapping.domain)) {
      return mapping.icon;
    }
  }
  return DEFAULT_ICON;
}

/**
 * 서비스 아이콘을 렌더링하는 JSX 엘리먼트를 반환합니다.
 * @param url - 분석할 URL
 * @param className - 이미지에 적용할 CSS 클래스 (기본값: "w-4 h-4")
 * @returns JSX 이미지 엘리먼트
 */
export function renderServiceIcon(
  url: string,
  className: string = "w-4 h-4"
): JSX.Element {
  const { src, alt } = getServiceIcon(url);
  return <img src={src} alt={alt} className={className} />;
}
