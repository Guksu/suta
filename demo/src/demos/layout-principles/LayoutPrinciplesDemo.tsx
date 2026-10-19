import { useState, type CSSProperties, type ReactNode } from 'react'
import { GAP, RADIUS, SPACE, TEXT, WEIGHT, groupGapOk } from '@skills/layout-principles/assets/layoutTokens'
import { Icon as LineIcon } from '@skills/layout-principles/assets/Icon'
import { Illustration } from '@skills/layout-principles/assets/Illustration'
import type { IconName } from '@skills/layout-principles/assets/icons'
import type { IllustrationName } from '@skills/layout-principles/assets/illustrations'
import { photoSrc } from '../../shared/dishes'
import '@skills/layout-principles/assets/layout-tokens.css'
import '@skills/layout-principles/assets/content-art.css'
import { defineCopy, useDemoLang } from '../../demoLang'
import './layout-principles-demo.css'
import './layout-principles-before.css'

type View = 'both' | 'before' | 'after'

// 언어와 무관한 데이터(id·금액)는 밖에, 화면에 보이거나 읽히는 문구는 COPY 두 벌에 둔다
const VIEWS: View[] = ['both', 'before', 'after']

const ORDER = [
  { id: 'janchi', price: 8000 },
  { id: 'bibim', price: 9500 },
  { id: 'mandu', price: 6000 },
] as const
const ORDER_TOTAL = ORDER.reduce((sum, item) => sum + item.price, 0)

const PAY = [
  { id: 'order', amount: ORDER_TOTAL },
  { id: 'takeout', amount: -1000 },
  { id: 'coupon', amount: -2000 },
] as const
const PAY_TOTAL = PAY.reduce((sum, row) => sum + row.amount, 0)

const MENU_PRICE = 11000
const TODAY_PRICE = 8000

// 고른 맛은 id로 들고 있어야 언어를 바꿔도 선택이 유지된다
const SPICE = ['mild', 'medium', 'hot'] as const
type Spice = (typeof SPICE)[number]

const NOTICES = ['cook', 'event'] as const

type ExampleId = 'order' | 'intro' | 'pay' | 'menu' | 'photo' | 'detail' | 'settings' | 'login' | 'chat' | 'feed'

// ⑩ 피드 — 장면은 글의 내용에서, 색 한 벌은 행마다 돌린다. 사진이 없는 글은 null
const FEED = [
  { id: 'broth', scene: 'bowl', tone: 'clay', photos: 3, comments: 24 },
  { id: 'spicy', scene: null, tone: null, photos: 0, comments: 17 },
  { id: 'cat', scene: 'pet', tone: 'sand', photos: 2, comments: 41 },
  { id: 'window', scene: 'room', tone: 'sky', photos: 1, comments: 12 },
  { id: 'pack', scene: 'product', tone: 'sage', photos: 1, comments: 6 },
] as const
type FeedId = (typeof FEED)[number]['id']

// ⑩ 분류 바로가기 — 전은 회색 원 + 같은 선 아이콘, 후는 그림 아이콘(콘텐츠 자리)
const SHORTCUTS: Array<{ id: 'noodle' | 'dumpling' | 'rice' | 'cafe' | 'dessert'; line: IconName; art: IllustrationName }> = [
  { id: 'noodle', line: 'bowl', art: 'steaming-bowl' },
  { id: 'dumpling', line: 'utensils', art: 'dumpling' },
  { id: 'rice', line: 'bowl', art: 'cooked-rice' },
  { id: 'cafe', line: 'coffee', art: 'hot-beverage' },
  { id: 'dessert', line: 'cake-slice', art: 'shortcake' },
]
type ShortcutId = (typeof SHORTCUTS)[number]['id']
type FeedCopy = { title: string; meta: string; alt?: string }
type ExampleCopy = { title: string; principle: string; before: string; after: string }

const COPY = defineCopy({
  ko: {
    view: { both: '나란히 비교', before: '고치기 전만', after: '고친 뒤만' } as Record<View, string>,
    won: (amount: number) => `${amount.toLocaleString('ko-KR')}원`,
    orderTitle: '주문 내역',
    order: {
      janchi: { name: '잔치국수', option: '보통 · 김치 추가' },
      bibim: { name: '비빔국수', option: '곱빼기 · 덜 맵게' },
      mandu: { name: '손만두', option: '6개' },
    },
    total: '합계',
    intro: '멸치와 다시마로 여섯 시간 우린 국물에 손으로 뽑은 중면을 말았습니다. 고명은 그날 들어온 애호박과 달걀지단만 올립니다.',
    shopName: '성수동 골목 국수집',
    hours: '영업시간 11:00–21:00',
    address: '성수동 2가 골목 안',
    viewMenu: '메뉴 보기',
    pay: { order: '주문 금액', takeout: '포장 할인', coupon: '쿠폰' },
    payBeforeTotal: (amount: string) => `총 결제 금액은 ${amount}입니다`,
    payKey: '결제할 금액',
    menuName: '들깨칼국수',
    menuDesc: '고소한 들깨 국물에 직접 민 칼국수',
    pillPopular: '인기',
    pillNew: 'NEW',
    pillPick: '추천',
    add: '담기',
    orderNow: '바로 주문',
    details: '자세히',
    tags: '인기 · 새 메뉴',
    todayTitle: '오늘의 국수',
    todayAlt: '잔치국수 한 그릇',
    todayDish: (price: string) => `잔치국수 ${price}`,
    spice: { mild: '순한 맛', medium: '보통', hot: '매운맛' } as Record<Spice, string>,
    detailBeforeLabel: '고치기 전 메뉴 상세 — 스크롤 영역',
    detailAfterLabel: '고친 뒤 메뉴 상세 — 스크롤 영역',
    detailAlt: '들깨칼국수 한 그릇',
    save: '찜',
    spiceChoose: '맵기 선택',
    spiceLegend: '맵기',
    detailDesc: '고소한 들깨 국물에 직접 민 칼국수. 들깨는 그날 아침에 갈아 넣어요.',
    saveAction: '찜하기',
    addFor: (price: string) => `${price} 담기`,
    notices: {
      cook: { label: '조리 시작 알림', desc: '주문한 국수를 삶기 시작하면 알려 드려요' },
      event: { label: '새 메뉴·쿠폰 소식', desc: '한 달에 한두 번 보내요' },
    },
    theme: '화면 테마',
    themeValue: '시스템 설정',
    about: '정보',
    support: '고객센터',
    terms: '이용약관',
    version: '버전 정보',
    settings: '설정',
    notification: '알림',
    account: '계정',
    logout: '로그아웃',
    deleteAccount: '회원 탈퇴',
    screen: '화면',
    textSize: '글자 크기',
    textSizeValue: '보통',
    login: '로그인',
    email: '이메일',
    password: '비밀번호',
    passwordHint: '8자 이상',
    forgotPassword: '비밀번호 찾기',
    socialChatBefore: '카카오로 계속하기',
    socialPortalBefore: '네이버로 계속하기',
    loginWelcome: '성수 국수집에 다시 오셨네요',
    signUp: '회원가입',
    otherLogin: '다른 방법으로 로그인',
    socialChat: '카카오로 시작하기',
    socialPortal: '네이버로 시작하기',
    chatQuestion: '비 오는 날 어울리는 국수 추천해줘',
    chatAnswer: ['비 오는 날에는 뜨끈한 국물이 좋아요.', '칼국수는 바지락 국물이 진하고, 잔치국수는 멸치 국물이 맑아요. 손만두를 곁들이면 한 끼로 넉넉해요.'],
    chatHelper: '국수 추천 도우미',
    feedLabel: '성수동 국수 모임 글 목록',
    feedComments: (count: number) => `댓글 ${count}`,
    feedPhotos: (count: number) => `사진 ${count}장`,
    feedNoPhoto: '사진 없음',
    shortcutLabel: '메뉴 분류',
    shortcuts: { noodle: '국수', dumpling: '만두', rice: '덮밥', cafe: '카페', dessert: '디저트' } as Record<ShortcutId, string>,
    feed: {
      broth: { title: '들깨칼국수 국물이 더 진해졌어요', meta: '국수러버 · 성수동 · 8분 전', alt: '들깨칼국수 한 그릇' },
      spicy: { title: '비빔국수 덜 맵게 주문하는 법 있나요?', meta: '맵찔이 · 성수동 · 22분 전' },
      cat: { title: '가게 앞 고양이 이름이 생겼대요', meta: '골목산책 · 성수동 · 1시간 전', alt: '가게 앞 고양이' },
      window: { title: '창가 자리가 새로 생겼어요', meta: '점심한그릇 · 성수동 · 3시간 전', alt: '창가 자리가 있는 가게 안' },
      pack: { title: '손만두 포장 용기가 바뀌었어요', meta: '만두파 · 성수동 · 9시간 전', alt: '손만두 포장 용기' },
    } as Record<FeedId, FeedCopy>,
    chatMode: '추천 모드',
    chatContext: '성수 국수집 · 메뉴판 12개',
    chatTodayMenu: '오늘의 메뉴판',
    chatAssistant: '도우미',
    chatDone: '완료',
    chatBusyBefore: '요청이 많아 잠시 후 다시 시도해 주세요.',
    retry: '다시 시도',
    chips: ['맵지 않은 거', '곱빼기', '포장'],
    chatPlaceholderBefore: '메시지를 입력하세요',
    pickMenu: '메뉴 고르기',
    chatModel: '국수 도우미',
    newChat: '새 대화',
    history: '기록',
    copyAnswer: '답변 복사',
    regenerate: '다시 생성',
    sources: '메뉴판 근거 2곳',
    chatBusy: '요청이 많아 답하지 못했어요.',
    detach: '빼기',
    question: '질문',
    chatPlaceholder: '무엇을 드시고 싶으세요?',
    attach: '자료 첨부',
    send: '보내기',
    examples: {
      order: {
        title: '① 주문 내역',
        principle: 'P5 상자는 마지막 수단 · P4 간격으로 묶는다',
        before: '항목마다 카드, 카드 안에 또 상자. 간격이 모두 같고 전부 굵다.',
        after: '선 한 줄로 행을 나누고, 이름과 옵션은 8px로 붙인다. 금액은 오른쪽 한 열.',
      },
      intro: {
        title: '② 가게 소개',
        principle: 'P6 정렬선 하나 · P8 빈 곳은 의도로만',
        before: '여러 줄 문단까지 가운데 정렬. 줄마다 시작점이 달라 시선이 지그재그로 움직인다.',
        after: '왼쪽 선 하나에서 시작한다. 짧은 정보는 한 줄로 모으고 세로선 하나로 나눈다.',
      },
      pay: {
        title: '③ 결제 요약',
        principle: 'P2 위계는 크기·굵기·농도로 · P6 숫자는 오른쪽 한 열',
        before: '핵심 금액이 문장 속에 있고, 라벨과 숫자가 같은 크기·같은 굵기다.',
        after: '금액은 자기 줄에 라벨의 2배 이상으로. 내역은 오른쪽 정렬과 같은 폭 숫자로 위아래 비교.',
      },
      menu: {
        title: '④ 메뉴 카드',
        principle: 'P3 강조는 한두 곳에만',
        before: '그라데이션 글자, 색 배지 셋, 채운 버튼 둘, 빛나는 그림자 — 강조가 서로 시선을 나눈다.',
        after: '채운 버튼은 주 행동 하나. 배지는 회색 글자, 보조 행동은 글자 링크.',
      },
      photo: {
        title: '⑤ 오늘의 국수',
        principle: 'P9 사진은 가리지 않고 비율을 지킨다',
        before: '사진을 틀에 맞춰 늘이고(찌그러짐), 무늬 위에 글자를 바로 얹었다.',
        after: '4:3 틀에 잘라 채우고(object-fit: cover), 글자는 사진 아래로 뺐다.',
      },
      detail: {
        title: '⑥ 메뉴 상세',
        principle: 'P11 익숙한 구조 · P3 강조는 한 곳 — 상세 화면의 관례',
        before: '담기·바로 주문·찜이 모두 채운 버튼으로 내용 중간에 있다. 스크롤하면 사라지고, 가격은 작은 회색 글자다.',
        after: '사진 → 이름 → 가격 → 옵션 순. 행동은 화면 아래에 고정한 바 하나에 모으고, 채운 버튼은 담기 하나다. 바 아래에는 홈 표시줄 높이(안전 영역)를 더한다.',
      },
      settings: {
        title: '⑦ 설정',
        principle: 'P11 익숙한 구조 · P2 글자 색 세 단계 · P3 강조색 하나',
        before: '흰 바탕에 테두리·그림자 카드를 겹치고, 이름과 설명이 같은 연회색이다. 강조색은 기본 파랑이고 채운 버튼이 둘이다.',
        after: '폭 가득 흰 목록(국내 앱 30곳 중 26곳의 모양). 묶음은 작은 옅은 라벨과 8px 띠로 나누고, 설명 줄은 뜻이 낯선 행(소식 빈도)에만 둔다. 켜진 스위치는 강조색, 꺼진 트랙은 옅은 회색. 테마는 현재 값 + 꺾쇠 행, 고객센터·약관·버전까지 둔다. 탈퇴는 옅은 글자 링크로 낮춘다.',
      },
      login: {
        title: '⑧ 로그인',
        principle: 'P3 강조색 하나를 이어 쓴다 · P11 외부 서비스 버튼은 그 서비스의 색',
        before: '기본 파랑 버튼, 굵은 라벨, 같은 흰 윤곽선 소셜 버튼. 비밀번호 찾기는 링크로 보이지 않는 회색 글자다.',
        after: '서비스의 강조색 하나로 주 버튼을 채운다. 링크는 밑줄로 링크답게, 소셜 버튼은 그 서비스의 색과 로고(카카오 노랑, 네이버 로고)를 같은 높이로.',
      },
      chat: {
        title: '⑨ AI 채팅',
        principle: 'P1 정보는 한 곳 · P3 색은 강조색 하나 · P11 범용 채팅 화면의 관례',
        before: '머리 아래에 사이트·대상 줄을 쌓고, 같은 대상을 입력창에 또 보인다. 상태마다 노랑·초록 알약, 오류는 분홍 상자, 보조 버튼은 회색 채움 알약이다.',
        after: '머리 한 줄(모델·새 대화·기록). 내 말은 회색 말풍선, 답변은 말풍선 없는 본문과 무채색 아이콘 한 줄. 첨부는 입력창 안 한 곳, 오류는 그 자리 글자 + 다시 시도. 채운 버튼은 보내기 하나다.',
      },
      feed: {
        title: '⑩ 콘텐츠 자리 — 분류 그림과 사진',
        principle: 'P9 사진 · 콘텐츠 그림 — 색은 콘텐츠가 맡고 틀은 무채색',
        before: '분류 바로가기가 회색 원 안의 같은 선 아이콘이고, 사진 자리는 회색 칸 + 사진 아이콘이다. 사진이 없는 글에도 "사진 없음" 칸을 둔다. 글자·면은 깔끔해도 디자인 시안처럼 비어 보인다.',
        after: '분류 바로가기는 색이 든 그림 아이콘(시중 앱 16곳 중 12곳이 이 자리를 그렇게 그렸다), 사진 자리는 글 내용에 맞는 콘텐츠 그림(국수 그릇·고양이·가게 안·포장 용기)이다. 탭·글자·선 같은 틀은 무채색 그대로다. 사진이 없는 글은 그 자리만 비운다.',
      },
    } as Record<ExampleId, ExampleCopy>,
    paneBefore: '고치기 전',
    paneAfter: '고친 뒤',
    controlsLabel: '비교 옵션',
    viewLabel: '보기',
    note: (
      <>
        왼쪽은 AI가 흔히 만드는 모습, 오른쪽은 원칙대로 고친 모습입니다. 고친 쪽은 숫자 대신 토큰(<code>--gap-item</code>·
        <code>--text-display</code>·<code>--radius-card</code> 등)만 씁니다. 레이아웃은 꾸미는 일이 아니라 순서를 정하는 일입니다.
      </>
    ) as ReactNode,
    tokensTitle: '토큰 한 벌',
    groupRule: ({ inside, between, ok }: { inside: number; between: number; ok: boolean }) =>
      `묶음 안 ${inside}px ≤ 묶음 사이 ${between}px의 절반 — ${ok ? '간격만으로 묶음이 보인다' : '묶음이 안 보인다'}`,
    spaceTitle: '간격 --space-*',
    textTitle: '글자 --text-*',
    textSample: '국수',
    weightRadiusTitle: '굵기 --weight-* · 반경 --radius-*',
    weightSample: '칼국수',
  },
  en: {
    view: { both: 'Side by side', before: 'Before only', after: 'After only' },
    // 음수 금액은 기호를 ₩ 앞에 둔다(-₩1,000)
    won: (amount: number) => `${amount < 0 ? '-' : ''}₩${Math.abs(amount).toLocaleString('en-US')}`,
    orderTitle: 'Your order',
    order: {
      janchi: { name: 'Anchovy-broth noodles', option: 'Regular · Extra kimchi' },
      bibim: { name: 'Spicy mixed noodles', option: 'Large · Less spicy' },
      mandu: { name: 'Handmade dumplings', option: '6 pieces' },
    },
    total: 'Total',
    intro: 'Anchovy and kelp broth simmered for six hours, poured over hand-pulled medium wheat noodles. Topped only with that day’s zucchini and thin egg strips.',
    shopName: 'Seongsu-dong Alley Noodle House',
    hours: 'Open 11:00–21:00',
    address: 'Down an alley, Seongsu-dong 2-ga',
    viewMenu: 'See menu',
    pay: { order: 'Subtotal', takeout: 'Takeout discount', coupon: 'Coupon' },
    payBeforeTotal: (amount: string) => `Your total payment is ${amount}`,
    payKey: 'Total to pay',
    menuName: 'Perilla knife-cut noodles',
    menuDesc: 'Hand-rolled knife-cut noodles in nutty perilla broth',
    pillPopular: 'Popular',
    pillNew: 'NEW',
    pillPick: 'Top pick',
    add: 'Add',
    orderNow: 'Order now',
    details: 'Details',
    tags: 'Popular · New',
    todayTitle: 'Today’s noodles',
    todayAlt: 'A bowl of anchovy-broth noodles',
    todayDish: (price: string) => `Anchovy-broth noodles ${price}`,
    spice: { mild: 'Mild', medium: 'Medium', hot: 'Hot' },
    detailBeforeLabel: 'Before: menu detail, scrollable',
    detailAfterLabel: 'After: menu detail, scrollable',
    detailAlt: 'A bowl of perilla knife-cut noodles',
    save: 'Save',
    spiceChoose: 'Choose spice level',
    spiceLegend: 'Spice level',
    detailDesc: 'Hand-rolled knife-cut noodles in nutty perilla broth. We grind the perilla seeds fresh every morning.',
    saveAction: 'Save',
    addFor: (price: string) => `Add for ${price}`,
    notices: {
      cook: { label: 'Cooking started', desc: 'We’ll tell you when your noodles go in the pot' },
      event: { label: 'New menu and coupons', desc: 'Once or twice a month' },
    },
    theme: 'Theme',
    themeValue: 'System',
    about: 'About',
    support: 'Help center',
    terms: 'Terms of service',
    version: 'Version',
    settings: 'Settings',
    notification: 'Notifications',
    account: 'Account',
    logout: 'Log out',
    deleteAccount: 'Delete account',
    screen: 'Display',
    textSize: 'Text size',
    textSizeValue: 'Medium',
    login: 'Log in',
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 8 characters',
    forgotPassword: 'Forgot password',
    socialChatBefore: 'Continue with Kakao',
    socialPortalBefore: 'Continue with Naver',
    loginWelcome: 'Welcome back to Seongsu Noodle House',
    signUp: 'Sign up',
    otherLogin: 'Or log in with',
    socialChat: 'Continue with Kakao',
    socialPortal: 'Continue with Naver',
    chatQuestion: 'Recommend noodles for a rainy day',
    chatAnswer: ['A hot broth is best on a rainy day.', 'Knife-cut noodles come in a rich clam broth, and anchovy-broth noodles in a clear one. Add handmade dumplings for a filling meal.'],
    chatHelper: 'Noodle advisor',
    feedLabel: 'Seongsu noodle club posts',
    feedComments: (count: number) => `${count} comments`,
    feedPhotos: (count: number) => `${count} photos`,
    feedNoPhoto: 'No photo',
    shortcutLabel: 'Menu categories',
    shortcuts: { noodle: 'Noodles', dumpling: 'Dumplings', rice: 'Rice bowls', cafe: 'Cafe', dessert: 'Dessert' } as Record<ShortcutId, string>,
    feed: {
      broth: { title: 'The perilla knife-cut noodle broth got richer', meta: 'NoodleLover · Seongsu · 8 min ago', alt: 'A bowl of perilla knife-cut noodles' },
      spicy: { title: 'How do I order the spicy noodles milder?', meta: 'MildPlease · Seongsu · 22 min ago' },
      cat: { title: 'The cat outside the shop finally has a name', meta: 'AlleyWalker · Seongsu · 1 hr ago', alt: 'The cat outside the shop' },
      window: { title: 'There are new window seats now', meta: 'LunchBowl · Seongsu · 3 hr ago', alt: 'Inside the shop with window seats' },
      pack: { title: 'The takeout box for handmade dumplings changed', meta: 'DumplingFan · Seongsu · 9 hr ago', alt: 'Handmade dumpling takeout box' },
    } as Record<FeedId, FeedCopy>,
    chatMode: 'Advice mode',
    chatContext: 'Seongsu Noodle House · 12 menu items',
    chatTodayMenu: 'Today’s menu',
    chatAssistant: 'Advisor',
    chatDone: 'Done',
    chatBusyBefore: 'Too many requests. Please try again later.',
    retry: 'Try again',
    chips: ['Not spicy', 'Large', 'Takeout'],
    chatPlaceholderBefore: 'Type a message',
    pickMenu: 'Pick a dish',
    chatModel: 'Noodle advisor',
    newChat: 'New chat',
    history: 'History',
    copyAnswer: 'Copy answer',
    regenerate: 'Regenerate',
    sources: '2 menu sources',
    chatBusy: 'Too many requests, so I couldn’t answer.',
    detach: 'Remove',
    question: 'Question',
    chatPlaceholder: 'What would you like to eat?',
    attach: 'Attach file',
    send: 'Send',
    examples: {
      order: {
        title: '① Your order',
        principle: 'P5 Boxes are the last resort · P4 Group with spacing',
        before: 'A card for every item, and another box inside each card. Every gap is the same and everything is bold.',
        after: 'One line divides the rows, and each name sits 8px above its options. Amounts form one column on the right.',
      },
      intro: {
        title: '② About the shop',
        principle: 'P6 One alignment line · P8 Empty space only on purpose',
        before: 'Even the multi-line paragraph is centered. Every line starts at a different point, so the eye zigzags.',
        after: 'Everything starts from one left edge. Short facts share one line, split by a single vertical rule.',
      },
      pay: {
        title: '③ Payment summary',
        principle: 'P2 Hierarchy through size, weight and shade · P6 Numbers in one right column',
        before: 'The key amount is buried in a sentence, and labels and numbers share the same size and weight.',
        after: 'The amount gets its own line, at least twice the label size. The breakdown is right-aligned with fixed-width digits, so values compare top to bottom.',
      },
      menu: {
        title: '④ Menu card',
        principle: 'P3 Accent in only one or two places',
        before: 'Gradient text, three colored badges, two filled buttons and a glowing shadow. The accents fight for attention.',
        after: 'One filled button for the main action. Badges become gray text, and the secondary action is a text link.',
      },
      photo: {
        title: '⑤ Today’s noodles',
        principle: 'P9 Don’t cover photos, keep their ratio',
        before: 'The photo is stretched to fit the frame (distorted), and text sits right on the busy pattern.',
        after: 'The photo is cropped to fill a 4:3 frame (object-fit: cover), and the text moves below it.',
      },
      detail: {
        title: '⑥ Menu detail',
        principle: 'P11 Familiar structure · P3 One accent: the detail screen convention',
        before: 'Add, Order now and Save are all filled buttons in the middle of the content. They scroll away, and the price is small gray text.',
        after: 'Photo, name, price, then options. Actions sit in one bar fixed to the bottom, and Add is the only filled button. The bar adds the home indicator height (safe area) below it.',
      },
      settings: {
        title: '⑦ Settings',
        principle: 'P11 Familiar structure · P2 Three text shades · P3 One accent color',
        before: 'Cards with borders and shadows stack on white, and names and descriptions share the same light gray. The accent is default blue, with two filled buttons.',
        after: 'A full-width white list, the shape 26 of 30 Korean apps use. Small faint labels and an 8px band separate groups, and only the row whose meaning is unclear (how often news arrives) gets a description. Switches that are on use the accent, and the off track is light gray. Theme is a row with its current value and a chevron, and Help center, Terms and Version are there too. Delete account drops to a faint text link.',
      },
      login: {
        title: '⑧ Log in',
        principle: 'P3 Carry one accent color · P11 Third-party buttons wear their own color',
        before: 'Default blue button, bold labels and identical white outlined social buttons. Forgot password is gray text that doesn’t look like a link.',
        after: 'The main button uses the service’s one accent color. Links are underlined so they read as links. Social buttons use each provider’s own color and logo (Kakao’s yellow, Naver’s logo) at the same height.',
      },
      chat: {
        title: '⑨ AI chat',
        principle: 'P1 Info in one place · P3 One accent color · P11 The common chat screen convention',
        before: 'Site and context rows pile up under the header, and the same context shows again in the input. Every status gets a yellow or green pill, errors get a pink box, and secondary buttons are gray filled pills.',
        after: 'A one-line header (model, new chat, history). Your messages are gray bubbles, and answers are plain text with one row of neutral icons. Attachments live in one place inside the input, and an error is text in place plus Try again. Send is the only filled button.',
      },
      feed: {
        title: '⑩ Content slots: category art and photos',
        principle: 'P9 Photos · Content art: content carries the color, the frame stays neutral',
        before: 'Category shortcuts are the same line icon in gray circles, and each photo slot is a gray box with a photo icon. Posts without photos get a “No photo” box too. The type and surfaces are tidy, yet it looks like an empty mockup.',
        after: 'Category shortcuts use colored illustrated icons (12 of 16 popular apps draw this slot that way), and photo slots get content art that matches the post (a noodle bowl, a cat, the shop inside, a takeout box). Tabs, text and lines stay neutral. Posts without photos simply leave the slot empty.',
      },
    },
    paneBefore: 'Before',
    paneAfter: 'After',
    controlsLabel: 'Comparison options',
    viewLabel: 'View',
    note: (
      <>
        Left is what AI tends to make. Right is the same screen fixed by the principles, using only tokens (<code>--gap-item</code>,{' '}
        <code>--text-display</code>, <code>--radius-card</code> and more) instead of raw numbers. Layout is not decoration. It is deciding what comes first.
      </>
    ),
    tokensTitle: 'One token set',
    groupRule: ({ inside, between, ok }: { inside: number; between: number; ok: boolean }) =>
      `${inside}px inside a group ≤ half of ${between}px between groups: ${ok ? 'spacing alone shows the groups' : 'the groups do not show'}`,
    spaceTitle: 'Spacing --space-*',
    textTitle: 'Text --text-*',
    // 가장 큰 견본(40px)이 견본 칸을 넘지 않게 짧은 글자로 보인다
    textSample: 'Aa',
    weightRadiusTitle: 'Weight --weight-* · Radius --radius-*',
    weightSample: 'Noodles',
  },
})

const useCopy = () => COPY[useDemoLang()]

/* 사진 위 글자 비교에는 무늬가 많은 실제 음식 사진을 쓴다 — 사진 위에 바로 얹은 글자가 왜 안 읽히는지 보인다 */
const PHOTO = photoSrc('janchi')
const DETAIL_PHOTO = photoSrc('deulkkae')

/* ---- ① 주문 내역 — 상자 대신 간격(P5·P4) ---- */

const OrderBefore = () => {
  const t = useCopy()
  return (
    <div className="lp-b-stack">
      <p className="lp-b-title">{t.orderTitle}</p>
      {ORDER.map((item) => (
        <div key={item.id} className="lp-b-card">
          <p className="lp-b-strong">{t.order[item.id].name}</p>
          <p className="lp-b-strong">{t.order[item.id].option}</p>
          {/* layout-audit-ignore: nested-card — 고치기 전 예시: 카드 안에 상자를 또 넣은 모습 */}
          <div className="lp-b-inner-box">{t.won(item.price)}</div>
        </div>
      ))}
      <div className="lp-b-card">
        {/* layout-audit-ignore: nested-card — 고치기 전 예시 */}
        <div className="lp-b-inner-box">
          {t.total} {t.won(ORDER_TOTAL)}
        </div>
      </div>
    </div>
  )
}

const OrderAfter = () => {
  const t = useCopy()
  return (
    <div className="lp-a-order">
      <p className="lp-a-title">{t.orderTitle}</p>
      <ul className="lp-a-rows">
        {ORDER.map((item) => (
          <li key={item.id} className="lp-a-row">
            <div className="lp-a-row-text">
              <span className="lp-a-name">{t.order[item.id].name}</span>
              <span className="lp-a-sub">{t.order[item.id].option}</span>
            </div>
            <span className="lp-a-amount">{t.won(item.price)}</span>
          </li>
        ))}
      </ul>
      <div className="lp-a-total">
        <span>{t.total}</span>
        <span className="lp-a-amount">{t.won(ORDER_TOTAL)}</span>
      </div>
    </div>
  )
}

/* ---- ② 가게 소개 — 정렬선 하나(P6·P8) ---- */

const IntroBefore = () => {
  const t = useCopy()
  return (
    <div className="lp-b-center">
      <p className="lp-b-title">{t.shopName}</p>
      <p className="lp-b-text">{t.intro}</p>
      <p className="lp-b-text">{t.hours}</p>
      <p className="lp-b-text">{t.address}</p>
      <button type="button" className="lp-b-fill">
        {t.viewMenu}
      </button>
    </div>
  )
}

const IntroAfter = () => {
  const t = useCopy()
  return (
    <div className="lp-a-intro">
      <p className="lp-a-title">{t.shopName}</p>
      <p className="lp-a-body">{t.intro}</p>
      <p className="lp-a-meta">
        <span>11:00–21:00</span>
        <span aria-hidden="true" className="lp-a-divider" />
        <span>{t.address}</span>
      </p>
      <button type="button" className="lp-a-primary">
        {t.viewMenu}
      </button>
    </div>
  )
}

/* ---- ③ 결제 요약 — 숫자 위계와 영수증 정렬(P2·P6) ---- */

const PayBefore = () => {
  const t = useCopy()
  return (
    <div className="lp-b-stack">
      <p className="lp-b-strong">{t.payBeforeTotal(t.won(PAY_TOTAL))}</p>
      {PAY.map((row) => (
        <p key={row.id} className="lp-b-strong">
          {t.pay[row.id]}: {t.won(row.amount)}
        </p>
      ))}
    </div>
  )
}

const PayAfter = () => {
  const t = useCopy()
  return (
    <div className="lp-a-pay">
      <div className="lp-a-key">
        <span className="lp-a-sub">{t.payKey}</span>
        <span className="lp-a-display">{t.won(PAY_TOTAL)}</span>
      </div>
      <dl className="lp-a-receipt">
        {PAY.map((row) => (
          <div key={row.id} className="lp-a-receipt-row">
            <dt>{t.pay[row.id]}</dt>
            <dd className="lp-a-amount">{t.won(row.amount)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ---- ④ 메뉴 카드 — 강조는 한 곳(P3) ---- */

const MenuBefore = () => {
  const t = useCopy()
  return (
    <div className="lp-b-menu">
      <p className="lp-b-gradient-text">{t.menuName}</p>
      <div className="lp-b-badges">
        <span className="lp-b-pill lp-b-pill-red">{t.pillPopular}</span>
        <span className="lp-b-pill lp-b-pill-green">{t.pillNew}</span>
        <span className="lp-b-pill lp-b-pill-blue">{t.pillPick}</span>
      </div>
      <p className="lp-b-text">{t.menuDesc}</p>
      <div className="lp-b-actions">
        <button type="button" className="lp-b-fill">
          {t.add}
        </button>
        <button type="button" className="lp-b-fill">
          {t.orderNow}
        </button>
      </div>
    </div>
  )
}

const MenuAfter = () => {
  const t = useCopy()
  return (
    <div className="lp-a-menu">
      <div className="lp-a-menu-text">
        <span className="lp-a-name">{t.menuName}</span>
        <span className="lp-a-sub">{t.menuDesc}</span>
        <span className="lp-a-tags">{t.tags}</span>
      </div>
      <span className="lp-a-price">{t.won(MENU_PRICE)}</span>
      <div className="lp-a-actions">
        <button type="button" className="lp-a-primary">
          {t.add}
        </button>
        <button type="button" className="lp-a-link">
          {t.details}
        </button>
      </div>
    </div>
  )
}

/* ---- ⑤ 오늘의 국수 — 사진은 가리지 않고 비율을 지킨다(P9) ---- */

const PhotoBefore = () => {
  const t = useCopy()
  return (
    <div className="lp-b-photo">
      <img className="lp-b-photo-img" src={PHOTO} alt={t.todayAlt} width={480} height={360} />
      <div className="lp-b-photo-text">
        <p>{t.todayTitle}</p>
        <p>{t.todayDish(t.won(TODAY_PRICE))}</p>
      </div>
    </div>
  )
}

const PhotoAfter = () => {
  const t = useCopy()
  return (
    <figure className="lp-a-photo">
      <img className="lp-a-photo-img" src={PHOTO} alt={t.todayAlt} width={480} height={360} />
      <figcaption className="lp-a-photo-text">
        <span className="lp-a-sub">{t.todayTitle}</span>
        <span className="lp-a-name">{t.todayDish(t.won(TODAY_PRICE))}</span>
      </figcaption>
    </figure>
  )
}

/* ---- ⑥ 메뉴 상세 — 화면 유형의 관례: 행동은 하단 고정 바 하나(P11·P3) ---- */

const DetailBefore = () => {
  const t = useCopy()
  return (
    <div className="lp-b-detail" tabIndex={0} aria-label={t.detailBeforeLabel}>
      <div className="lp-b-card">
        <img className="lp-b-detail-photo" src={DETAIL_PHOTO} alt={t.detailAlt} width={480} height={360} />
      </div>
      <div className="lp-b-center">
        <p className="lp-b-title">{t.menuName}</p>
        <p className="lp-b-text">{t.won(MENU_PRICE)}</p>
      </div>
      <div className="lp-b-actions">
        <button type="button" className="lp-b-fill">
          {t.add}
        </button>
        <button type="button" className="lp-b-fill">
          {t.orderNow}
        </button>
        <button type="button" className="lp-b-fill">
          {t.save}
        </button>
      </div>
      <div className="lp-b-card">
        <p className="lp-b-strong">{t.spiceChoose}</p>
        {SPICE.map((spice) => (
          // layout-audit-ignore: nested-card — 고치기 전 예시: 선택지마다 상자
          <div key={spice} className="lp-b-inner-box">
            {t.spice[spice]}
          </div>
        ))}
      </div>
      <p className="lp-b-text">{t.detailDesc}</p>
    </div>
  )
}

const DetailAfter = () => {
  const t = useCopy()
  const [spice, setSpice] = useState<Spice>('medium')

  return (
    <div className="lp-a-detail">
      <div className="lp-a-detail-scroll" tabIndex={0} aria-label={t.detailAfterLabel}>
        <img className="lp-a-detail-photo" src={DETAIL_PHOTO} alt={t.detailAlt} width={480} height={360} />
        <div className="lp-a-detail-body">
          <div className="lp-a-detail-head">
            <span className="lp-a-sub">{t.shopName}</span>
            <span className="lp-a-detail-name">{t.menuName}</span>
            <span className="lp-a-display">{t.won(MENU_PRICE)}</span>
            <span className="lp-a-sub">{t.detailDesc}</span>
          </div>
          <fieldset className="lp-a-options">
            <legend className="lp-a-options-title">{t.spiceLegend}</legend>
            {SPICE.map((option) => (
              <label key={option} className="lp-a-option">
                <span>{t.spice[option]}</span>
                <input type="radio" name="lp-spice" value={option} checked={spice === option} onChange={() => setSpice(option)} />
              </label>
            ))}
          </fieldset>
        </div>
      </div>
      <div className="lp-a-buybar">
        <button type="button" className="lp-a-icon-button" aria-label={t.saveAction}>
          <LineIcon name="heart" />
        </button>
        <button type="button" className="lp-a-buy">
          {t.addFor(t.won(MENU_PRICE))}
        </button>
      </div>
    </div>
  )
}

/* ---- ⑦ 설정 — 폭 가득 목록·글자 색 세 단계·강조색 하나(P11·P2·P3). 국내 앱 30곳의 설정 화면 관례 ---- */

const SettingsBefore = () => {
  const t = useCopy()
  return (
    <div className="lp-b-settings">
      <p className="lp-b-title">{t.settings}</p>
      <div className="lp-b-plain-card">
        <p className="lp-b-strong">{t.notification}</p>
        {NOTICES.map((id, index) => (
          <div key={id} className="lp-b-setting-row">
            <div>
              <p className="lp-b-faint">{t.notices[id].label}</p>
              <p className="lp-b-faint">{t.notices[id].desc}</p>
            </div>
            <span className="lp-b-toggle" data-on={index === 0 || undefined} aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="lp-b-plain-card">
        <p className="lp-b-strong">{t.account}</p>
        <button type="button" className="lp-b-blue-fill">
          {t.logout}
        </button>
        <button type="button" className="lp-b-blue-fill">
          {t.deleteAccount}
        </button>
      </div>
    </div>
  )
}

const SettingsAfter = () => {
  const t = useCopy()
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ cook: true, event: false })
  // 설명 줄은 라벨만으로 결과가 낯선 행에만 — 레퍼런스 스위치 화면에서 행의 24%
  const described = new Set<string>(['event'])

  return (
    <div className="lp-t-page lp-t-settings">
      <p className="lp-t-title">{t.settings}</p>
      <p className="lp-t-group-label" id="lp-t-notice">
        {t.notification}
      </p>
      <ul className="lp-t-group" aria-labelledby="lp-t-notice">
        {NOTICES.map((id) => (
          <li key={id}>
            <label className="lp-t-row">
              <span className="lp-t-row-text">
                <span className="lp-t-label">{t.notices[id].label}</span>
                {described.has(id) && <span className="lp-t-desc">{t.notices[id].desc}</span>}
              </span>
              <input
                type="checkbox"
                role="switch"
                className="lp-t-switch"
                checked={enabled[id]}
                onChange={(e) => setEnabled((prev) => ({ ...prev, [id]: e.target.checked }))}
              />
            </label>
          </li>
        ))}
      </ul>
      <p className="lp-t-group-label" id="lp-t-screen">
        {t.screen}
      </p>
      <ul className="lp-t-group" aria-labelledby="lp-t-screen">
        {[
          [t.textSize, t.textSizeValue],
          [t.theme, t.themeValue],
        ].map(([label, value]) => (
          <li key={label}>
            <button type="button" className="lp-t-row lp-t-row-button">
              <span className="lp-t-label">{label}</span>
              <span className="lp-t-value">
                {value}
                <span aria-hidden="true" className="lp-t-chevron" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="lp-t-group-label" id="lp-t-about">
        {t.about}
      </p>
      <ul className="lp-t-group" aria-labelledby="lp-t-about">
        {[t.support, t.terms].map((label) => (
          <li key={label}>
            <button type="button" className="lp-t-row lp-t-row-button">
              <span className="lp-t-label">{label}</span>
              <span aria-hidden="true" className="lp-t-chevron" />
            </button>
          </li>
        ))}
        <li>
          {/* 고칠 수 없는 값에는 꺾쇠를 달지 않는다 */}
          <div className="lp-t-row">
            <span className="lp-t-label">{t.version}</span>
            <span className="lp-t-value">1.4.2</span>
          </div>
        </li>
      </ul>
      <ul className="lp-t-group" aria-label={t.account}>
        <li>
          <button type="button" className="lp-t-row lp-t-row-button">
            <span className="lp-t-label">{t.logout}</span>
          </button>
        </li>
      </ul>
      <button type="button" className="lp-t-quiet">
        {t.deleteAccount}
      </button>
    </div>
  )
}

/* ---- ⑧ 로그인 — 강조색 하나를 이어 쓰고, 외부 서비스 버튼은 그 서비스의 색(P3·P11) ---- */

const LoginBefore = () => {
  const t = useCopy()
  return (
    <div className="lp-b-login">
      <p className="lp-b-title">{t.login}</p>
      <p className="lp-b-strong">{t.email}</p>
      <span className="lp-b-input">name@example.com</span>
      <p className="lp-b-strong">{t.password}</p>
      <span className="lp-b-input">{t.passwordHint}</span>
      <p className="lp-b-faint">{t.forgotPassword}</p>
      <button type="button" className="lp-b-blue-fill">
        {t.login}
      </button>
      <button type="button" className="lp-b-outline">
        {t.socialChatBefore}
      </button>
      <button type="button" className="lp-b-outline">
        {t.socialPortalBefore}
      </button>
    </div>
  )
}

const LoginAfter = () => {
  const t = useCopy()
  return (
    <form className="lp-t-page lp-t-login" onSubmit={(e) => e.preventDefault()}>
      <p className="lp-t-title">{t.loginWelcome}</p>
      <label className="lp-t-field">
        <span className="lp-t-field-label">{t.email}</span>
        <input className="lp-t-input" type="email" placeholder="name@example.com" autoComplete="email" />
      </label>
      <label className="lp-t-field">
        <span className="lp-t-field-label">{t.password}</span>
        <input className="lp-t-input" type="password" placeholder={t.passwordHint} autoComplete="current-password" />
      </label>
      <button type="submit" className="lp-t-primary">
        {t.login}
      </button>
      <p className="lp-t-links">
        <a href="#/layout-principles">{t.forgotPassword}</a>
        <span aria-hidden="true" className="lp-t-links-divider" />
        <a href="#/layout-principles">{t.signUp}</a>
      </p>
      <p className="lp-t-desc lp-t-social-label">{t.otherLogin}</p>
      <button type="button" className="lp-t-social" data-brand="kakao">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="lp-t-social-mark">
          <path d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 5.9l-.9 3.3c-.1.3.3.6.6.4l3.9-2.6c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.1-9-7.1z" />
        </svg>
        {t.socialChat}
      </button>
      <button type="button" className="lp-t-social" data-brand="naver">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="lp-t-social-mark">
          <path d="M14.6 12.4 9.1 4.5H4.5v15h4.9v-7.9l5.5 7.9h4.6v-15h-4.9z" />
        </svg>
        {t.socialPortal}
      </button>
    </form>
  )
}

/* ---- ⑨ AI 채팅 — 머리 한 줄·정보는 한 곳·무채색 + 강조색 하나(P1·P3·P11) ---- */

const ChatBefore = () => {
  const t = useCopy()
  return (
    <div className="lp-b-chat">
      <div className="lp-b-chat-bar">
        <span className="lp-b-avatar">N</span>
        <span className="lp-b-strong">{t.chatHelper}</span>
        <span className="lp-b-pill-amber">{t.chatMode}</span>
      </div>
      <div className="lp-b-chat-bar lp-b-chat-sub">{t.chatContext}</div>
      <div className="lp-b-chat-bar lp-b-chat-sub">
        <span className="lp-b-pill-amber">M1</span> {t.chatTodayMenu}
      </div>
      <p className="lp-b-bubble-me">{t.chatQuestion}</p>
      <div className="lp-b-answer">
        <p className="lp-b-answer-head">
          <span className="lp-b-avatar">N</span> {t.chatAssistant} <span className="lp-b-pill-green">{t.chatDone}</span>
        </p>
        <p className="lp-b-faint">{t.chatAnswer.join(' ')}</p>
      </div>
      <div className="lp-b-error">
        <p className="lp-b-strong">{t.chatBusyBefore}</p>
        <button type="button" className="lp-b-gray-pill">
          {t.retry}
        </button>
      </div>
      <div className="lp-b-chips">
        {t.chips.map((chip) => (
          <span key={chip} className="lp-b-gray-pill">
            {chip}
          </span>
        ))}
      </div>
      <div className="lp-b-composer">
        {/* layout-audit-ignore: nested-card — 일부러 AI 슬롭으로 만든 '전' 화면(입력창 안 색 상자) */}
        <p className="lp-b-attach">
          <span className="lp-b-pill-amber">M1</span> {t.chatTodayMenu}
        </p>
        <span className="lp-b-faint">{t.chatPlaceholderBefore}</span>
        <button type="button" className="lp-b-gray-pill">
          {t.pickMenu}
        </button>
      </div>
    </div>
  )
}

const Icon = ({ d }: { d: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="lp-t-icon">
    <path d={d} />
  </svg>
)
const ICON = {
  chevron: 'm6 9 6 6 6-6',
  newChat: 'M12 5v14M5 12h14',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  retry: 'M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12.6 2M18.5 9A7 7 0 0 0 5.9 7',
  attach: 'm21 11-8.6 8.6a5 5 0 0 1-7-7L14 3.9a3.3 3.3 0 0 1 4.7 4.7L10 17.2a1.7 1.7 0 0 1-2.4-2.4l8-8',
  send: 'M12 19V5M5 12l7-7 7 7',
}

const ChatAfter = () => {
  const t = useCopy()
  const [text, setText] = useState('')
  const [attached, setAttached] = useState(true)

  return (
    <section className="lp-t-chat" aria-label={t.chatHelper}>
      <header className="lp-t-chat-head">
        <button type="button" className="lp-t-model">
          {t.chatModel}
          <Icon d={ICON.chevron} />
        </button>
        <span className="lp-t-chat-actions">
          <button type="button" className="lp-t-icon-button" aria-label={t.newChat}>
            <Icon d={ICON.newChat} />
          </button>
          <button type="button" className="lp-t-icon-button" aria-label={t.history}>
            <Icon d={ICON.history} />
          </button>
        </span>
      </header>
      <div className="lp-t-chat-log">
        <p className="lp-t-bubble">{t.chatQuestion}</p>
        <article className="lp-t-answer">
          {t.chatAnswer.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="lp-t-answer-foot">
            <button type="button" className="lp-t-icon-button" aria-label={t.copyAnswer}>
              <Icon d={ICON.copy} />
            </button>
            <button type="button" className="lp-t-icon-button" aria-label={t.regenerate}>
              <Icon d={ICON.retry} />
            </button>
            <span className="lp-t-desc">{t.sources}</span>
          </p>
        </article>
        <p className="lp-t-chat-error" role="status">
          <span className="lp-t-error-text">{t.chatBusy}</span>
          <button type="button" className="lp-t-text-button">
            {t.retry}
          </button>
        </p>
      </div>
      <form className="lp-t-composer" onSubmit={(e) => e.preventDefault()}>
        {attached && (
          <p className="lp-t-attach">
            <Icon d={ICON.attach} />
            {t.chatTodayMenu}
            <button type="button" className="lp-t-text-button" onClick={() => setAttached(false)}>
              {t.detach}
            </button>
          </p>
        )}
        <label className="lp-t-composer-row">
          <span className="lp-t-sr">{t.question}</span>
          <textarea className="lp-t-composer-input" rows={1} placeholder={t.chatPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <span className="lp-t-composer-row lp-t-composer-tools">
          <button type="button" className="lp-t-icon-button" aria-label={t.attach} onClick={() => setAttached(true)}>
            <Icon d={ICON.attach} />
          </button>
          <button type="submit" className="lp-t-send" aria-label={t.send} disabled={text.trim() === ''}>
            <Icon d={ICON.send} />
          </button>
        </span>
      </form>
    </section>
  )
}

/* ---- ⑩ 글 목록의 사진 자리 — 사진이 없으면 콘텐츠 그림, 색은 콘텐츠가 맡는다(P9) ---- */

const FeedBefore = () => {
  const t = useCopy()
  return (
    <div className="lp-b-feed">
    <ul className="lp-b-shortcuts" aria-label={t.shortcutLabel}>
      {SHORTCUTS.map((item) => (
        <li key={item.id}>
          <span className="lp-b-shortcut-icon">
            <LineIcon name={item.line} />
          </span>
          {t.shortcuts[item.id]}
        </li>
      ))}
    </ul>
    <ul className="lp-b-feed-list" aria-label={t.feedLabel}>
      {FEED.map((post) => {
        const copy = t.feed[post.id]
        return (
          <li key={post.id} className="lp-b-feed-row">
            <div className="lp-b-feed-text">
              <p className="lp-b-strong">{copy.title}</p>
              <p className="lp-b-faint">{copy.meta}</p>
            </div>
            <span className="lp-b-feed-thumb">
              {post.scene ? <LineIcon name="image" /> : <span className="lp-b-faint">{t.feedNoPhoto}</span>}
            </span>
          </li>
        )
      })}
    </ul>
    </div>
  )
}

const FeedAfter = () => {
  const t = useCopy()
  return (
    <div className="lp-a-feed">
    <ul className="lp-a-shortcuts" aria-label={t.shortcutLabel}>
      {SHORTCUTS.map((item) => (
        <li key={item.id}>
          <Illustration name={item.art} size={40} />
          {t.shortcuts[item.id]}
        </li>
      ))}
    </ul>
    <ul className="lp-a-feed-list" aria-label={t.feedLabel}>
      {FEED.map((post) => {
        const copy = t.feed[post.id]
        return (
          <li key={post.id} className="lp-a-feed-row">
            <div className="lp-a-feed-text">
              <p className="lp-a-feed-title">{copy.title}</p>
              <p className="lp-a-feed-meta">
                {copy.meta} · {t.feedComments(post.comments)}
              </p>
            </div>
            {post.scene && (
              <span className="lp-a-feed-thumb">
                <span className={`art art--${post.scene} art--${post.tone}`} role="img" aria-label={copy.alt} />
                {post.photos > 1 && (
                  <span className="lp-a-feed-count">
                    <span aria-hidden="true">{post.photos}</span>
                    <span className="lp-t-sr">{t.feedPhotos(post.photos)}</span>
                  </span>
                )}
              </span>
            )}
          </li>
        )
      })}
    </ul>
    </div>
  )
}

type Example = { id: ExampleId; Before: () => ReactNode; After: () => ReactNode; flush?: boolean; light?: boolean }

const EXAMPLES: Example[] = [
  { id: 'order', Before: OrderBefore, After: OrderAfter },
  { id: 'intro', Before: IntroBefore, After: IntroAfter },
  { id: 'pay', Before: PayBefore, After: PayAfter },
  { id: 'menu', Before: MenuBefore, After: MenuAfter },
  { id: 'photo', Before: PhotoBefore, After: PhotoAfter },
  { id: 'detail', Before: DetailBefore, After: DetailAfter, flush: true },
  { id: 'settings', Before: SettingsBefore, After: SettingsAfter, flush: true, light: true },
  { id: 'login', Before: LoginBefore, After: LoginAfter, flush: true, light: true },
  { id: 'chat', Before: ChatBefore, After: ChatAfter, flush: true, light: true },
  { id: 'feed', Before: FeedBefore, After: FeedAfter, flush: true, light: true },
]

const Pane = ({ label, note, tone, flush = false, light = false, children }: { label: string; note: string; tone: 'before' | 'after'; flush?: boolean; light?: boolean; children: ReactNode }) => (
  <div className="lp-pane" data-tone={tone}>
    <p className="lp-pane-label">{label}</p>
    <div className="lp-screen" data-flush={flush || undefined} data-light={light || undefined}>
      {children}
    </div>
    <p className="lp-pane-note">{note}</p>
  </div>
)

export const LayoutPrinciplesDemo = () => {
  const t = useCopy()
  const [view, setView] = useState<View>('both')

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>{t.viewLabel}</span>
          <select value={view} onChange={(e) => setView(e.target.value as View)}>
            {VIEWS.map((key) => (
              <option key={key} value={key}>
                {t.view[key]}
              </option>
            ))}
          </select>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      {EXAMPLES.map((example) => {
        const copy = t.examples[example.id]
        return (
          <section key={example.id} className="lp-example" aria-labelledby={`lp-${example.id}`}>
            <div className="lp-example-head">
              <h2 id={`lp-${example.id}`}>{copy.title}</h2>
              <p>{copy.principle}</p>
            </div>
            <div className="lp-compare" data-view={view}>
              {view !== 'after' && (
                <Pane label={t.paneBefore} note={copy.before} tone="before" flush={example.flush} light={example.light}>
                  <example.Before />
                </Pane>
              )}
              {view !== 'before' && (
                <Pane label={t.paneAfter} note={copy.after} tone="after" flush={example.flush} light={example.light}>
                  <example.After />
                </Pane>
              )}
            </div>
          </section>
        )
      })}

      <section className="lp-example" aria-labelledby="lp-tokens">
        <div className="lp-example-head">
          <h2 id="lp-tokens">{t.tokensTitle}</h2>
          <p>{t.groupRule({ inside: GAP.item, between: GAP.group, ok: groupGapOk({ inside: GAP.item, between: GAP.group }) })}</p>
        </div>
        <div className="lp-tokens">
          <div className="lp-token-group">
            <p className="lp-token-title">{t.spaceTitle}</p>
            <ul className="lp-token-list">
              {Object.entries(SPACE).map(([step, px]) => (
                <li key={step} className="lp-token-row">
                  <code>--space-{step}</code>
                  <span className="lp-space-bar" style={{ '--bar': `${px}px` } as CSSProperties} aria-hidden="true" />
                  <span className="lp-token-value">{px}px</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-token-group">
            <p className="lp-token-title">{t.textTitle}</p>
            <ul className="lp-token-list">
              {Object.entries(TEXT).map(([name, px]) => (
                <li key={name} className="lp-token-row">
                  <code>--text-{name}</code>
                  <span className="lp-type-sample" style={{ fontSize: `${px}px` }}>
                    {t.textSample}
                  </span>
                  <span className="lp-token-value">{px}px</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-token-group">
            <p className="lp-token-title">{t.weightRadiusTitle}</p>
            <ul className="lp-token-list">
              {Object.entries(WEIGHT).map(([name, weight]) => (
                <li key={name} className="lp-token-row">
                  <code>--weight-{name}</code>
                  <span className="lp-type-sample" style={{ fontWeight: weight }}>
                    {t.weightSample}
                  </span>
                  <span className="lp-token-value">{weight}</span>
                </li>
              ))}
              {Object.entries(RADIUS).map(([name, px]) => (
                <li key={name} className="lp-token-row">
                  <code>--radius-{name}</code>
                  <span className="lp-radius-swatch" style={{ borderRadius: `${px}px` }} aria-hidden="true" />
                  <span className="lp-token-value">{px}px</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
