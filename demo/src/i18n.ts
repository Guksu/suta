import { useEffect, useState } from 'react'
import type { DemoCategory } from './demos'

export type Lang = 'ko' | 'en'

const STORAGE_KEY = 'suta-lang'

/** 처음 언어를 정하는 순서: URL의 ?lang= → 저장된 선택 → 브라우저 언어(한국어면 ko, 그 밖은 en) */
export const resolveInitialLang = ({ search, stored, navigatorLanguage }: { search: string; stored: string | null; navigatorLanguage: string }): Lang => {
  const fromUrl = new URLSearchParams(search).get('lang')
  if (fromUrl === 'ko' || fromUrl === 'en') return fromUrl
  if (stored === 'ko' || stored === 'en') return stored
  return navigatorLanguage.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

const readStored = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null // 사생활 보호 모드 등 — 저장이 막혀도 화면은 동작해야 한다
  }
}

/** 언어 상태 — 선택은 브라우저에 기억되고 <html lang>에 반영된다 */
export const useLang = () => {
  const [lang, setLang] = useState<Lang>(() =>
    resolveInitialLang({ search: window.location.search, stored: readStored(), navigatorLanguage: navigator.language ?? 'ko' }),
  )

  useEffect(
    function persistAndReflectLang() {
      document.documentElement.lang = lang
      try {
        window.localStorage.setItem(STORAGE_KEY, lang)
      } catch {
        /* 저장 불가 — 세션 안에서만 유지 */
      }
    },
    [lang],
  )

  const toggle = () => setLang((prev) => (prev === 'ko' ? 'en' : 'ko'))
  return { lang, toggle }
}

/** 뼈대 문구(사이드바·홈·데모 페이지 공통). 데모 안의 조절 라벨·콘텐츠는 각 데모가 defineCopy로 두 벌 가진다 */
export const STRINGS = {
  ko: {
    tagline: '에이전트 스킬 suta의 패턴 데모',
    langToggle: 'English',
    langToggleLabel: '영어로 보기',
    menu: (count: number) => `패턴 목록 ${count}`,
    navLabel: '패턴',
    homeIntro: (count: number) =>
      `suta는 Claude Code·Codex가 React UI를 만들거나 고칠 때 쓰는 스킬입니다. 레이아웃과 상호작용의 사용 문제를 먼저 막고, 프로젝트에 디자인 체계가 있으면 그 체계를 그대로 씁니다. 여기서 패턴 ${count}종을 직접 만져 볼 수 있습니다.`,
    values: [
      { title: '레이아웃·상호작용 기준', body: '키보드로 닿는지, 열고 닫을 때 포커스가 돌아오는지, 320px에서 넘치지 않는지, 동작 줄이기를 따르는지를 먼저 봅니다.' },
      { title: '패턴 코드', body: '모달·바텀시트·토스트·폼·제스처. 의존성 없는 TypeScript 코어와 React 래퍼, CSS를 프로젝트에 복사해 맞춥니다.' },
      { title: '편집 후 검사', body: '플러그인으로 설치하면 파일을 고칠 때마다 11px 미만 글자, 화면보다 넓어지는 grid 틀, 레이아웃 애니메이션 같은 문제를 file:line으로 에이전트에게 돌려줍니다.' },
    ],
    installTitle: '설치하고 첫 요청 보내기',
    installStep: 'Claude Code 대화창에서 실행합니다.',
    firstRequestLabel: '첫 요청 예',
    firstRequest: 'suta를 사용해서 이메일, 비밀번호, 로그인 버튼, 비밀번호 찾기 링크가 있는 로그인 화면을 만들어줘. 키보드로도 사용할 수 있게 해줘.',
    installNote: 'Codex와 다른 에이전트의 설치 방법은 README에 있습니다. 결과는 브라우저에서 키보드와 좁은 폭으로 직접 확인하세요.',
    patternsTitle: (count: number) => `패턴 ${count}종`,
    readmeFile: 'README.ko.md',
    github: 'GitHub',
    readme: 'README',
    searchPlaceholder: '패턴 검색 (이름·설명·slug)',
    searchLabel: '패턴 검색',
    matches: (n: number) => `${n}개 일치`,
    noMatch: (query: string) => `"${query}"에 맞는 패턴이 없습니다.`,
    usage: '사용 예시',
    copy: '코드 복사',
    copied: '복사됨',
    skillDoc: '패턴 문서 →',
    auditNote: '검사 결과 메시지는 한국어로 나옵니다.',
    creditsLink: '사진·아이콘 출처',
    creditsTitle: '사진·아이콘 출처',
    creditsIntro: '데모의 음식 사진은 위키미디어 공용(Wikimedia Commons)에 CC0·CC BY로 공개된 사진입니다. 모두 4:3으로 잘라 줄이고 WebP로 바꿨습니다.',
    creditsPhotos: '음식 사진',
    creditsIcons: '선 아이콘',
    creditsIconsBody: '선 아이콘은 suta의 아이콘 한 벌(layout-principles/assets/icons.ts)이고, 경로는 Lucide v0.469.0(ISC License, Copyright (c) Lucide Contributors 2022. Feather에서 온 부분은 MIT, Copyright (c) 2013-2022 Cole Bemis)에서 가져왔습니다.',
    creditsSource: '원본',
  },
  en: {
    tagline: 'Pattern demos for the suta agent skill',
    langToggle: '한국어',
    langToggleLabel: 'View in Korean',
    menu: (count: number) => `Patterns (${count})`,
    navLabel: 'Patterns',
    homeIntro: (count: number) =>
      `suta is a skill Claude Code and Codex use when they build or fix React UI. It prevents layout and interaction problems first, and keeps the project’s design system when there is one. You can try its ${count} patterns here.`,
    values: [
      { title: 'Layout and interaction rules', body: 'Checks first that everything is reachable by keyboard, focus returns when things close, nothing overflows at 320px, and reduced motion is respected.' },
      { title: 'Pattern code', body: 'Modals, bottom sheets, toasts, forms and gestures. A dependency-free TypeScript core, a React wrapper and CSS that you copy into the project.' },
      { title: 'Post-edit check', body: 'Installed as a plugin, it checks each edited file and sends problems such as text under 11px, a grid shell wider than the screen, or layout animation back to the agent as file:line.' },
    ],
    installTitle: 'Install and send a first request',
    installStep: 'Run these in the Claude Code chat.',
    firstRequestLabel: 'A first request',
    firstRequest: 'Use suta to build a login screen with email, password, a sign-in button and a password reset link. Make it usable with a keyboard.',
    installNote: 'Codex and other agents are covered in the README. Check the result in a browser with the keyboard and at a narrow width.',
    patternsTitle: (count: number) => `${count} patterns`,
    readmeFile: 'README.md',
    github: 'GitHub',
    readme: 'README',
    searchPlaceholder: 'Search by name, description or slug',
    searchLabel: 'Search patterns',
    matches: (n: number) => `${n} match${n === 1 ? '' : 'es'}`,
    noMatch: (query: string) => `No pattern matches "${query}".`,
    usage: 'Usage',
    copy: 'Copy code',
    copied: 'Copied',
    skillDoc: 'Pattern doc →',
    auditNote: 'Audit messages in this demo are in Korean.',
    creditsLink: 'Photo & icon credits',
    creditsTitle: 'Photo & icon credits',
    creditsIntro: 'The food photos in the demos are CC0 or CC BY images from Wikimedia Commons. Each one was cropped to 4:3, resized and converted to WebP.',
    creditsPhotos: 'Food photos',
    creditsIcons: 'Line icons',
    creditsIconsBody: 'Line icons come from the suta icon set (layout-principles/assets/icons.ts), with paths from Lucide v0.469.0 (ISC License, Copyright (c) Lucide Contributors 2022; portions from Feather are MIT, Copyright (c) 2013-2022 Cole Bemis).',
    creditsSource: 'Original',
  },
} as const

export const CATEGORY_LABEL: Record<Lang, Record<DemoCategory, string>> = {
  ko: {
    '등장과 전환': '등장과 전환',
    '로딩과 진행': '로딩과 진행',
    피드백: '피드백',
    내비게이션: '내비게이션',
    제스처: '제스처',
    컨트롤: '컨트롤',
    '표면과 스타일': '표면과 스타일',
    '원칙과 검토': '원칙과 검토',
  },
  en: {
    '등장과 전환': 'Enter & transition',
    '로딩과 진행': 'Loading & progress',
    피드백: 'Feedback',
    내비게이션: 'Navigation',
    제스처: 'Gestures',
    컨트롤: 'Controls',
    '표면과 스타일': 'Surface & style',
    '원칙과 검토': 'Principles & review',
  },
}
