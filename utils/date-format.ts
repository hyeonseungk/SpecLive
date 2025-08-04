export function formatDate(date: string | Date, locale: string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // locale이 "ko-KR" 또는 "ko"인지 확인
  const isKorean = locale.startsWith("ko");

  if (isKorean) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    return `${year}년 ${month}월 ${day}일`;
  } else {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    return `${year}/${month}/${day}`;
  }
}

export function formatDateWithSuffix(
  date: string | Date,
  locale: string
): string {
  const dateStr = formatDate(date, locale);

  // locale이 "ko-KR" 또는 "ko"인지 확인
  const isKorean = locale.startsWith("ko");

  if (isKorean) {
    return `${dateStr}에 생성`;
  } else {
    return `created at ${dateStr}`;
  }
}
