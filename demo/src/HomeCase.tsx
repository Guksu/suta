import { defineCopy } from './demoLang'
import type { Lang } from './i18n'

/* 데모 첫 화면의 대표 사례 — 같은 요청을 suta 없이와 suta로 만든 결과.
 * 숫자는 docs/comparisons.md "모바일 웹앱: 걷기 리워드" 절의 측정값을 그대로 옮겼다(suta 0.11.0, 조건마다 2번).
 * 그 뒤 버전으로 다시 재지 않았으므로 버전과 날짜를 화면에 함께 적는다. 이미지는 각 조건의 첫 실행이다.
 * 색·모양보다 직접 확인할 수 있는 차이(포커스·움직임·접근성 검사)를 고르고, 늘어난 시간·비용과 판정의 한계도 같은 자리에 둔다 */

const REPO_BLOB = 'https://github.com/Guksu/suta/blob/main'

type Diff = { what: string; before: string; after: string }
type Try = { href: string; label: string; hint: string }

const COPY = defineCopy({
  ko: {
    title: '대표 사례 — 걷기 리워드 앱',
    lead: '같은 요청을 suta 없이 두 번, suta 0.11.0으로 두 번 만들었습니다. 모델과 설정은 같습니다.',
    request:
      '걷기 리워드 앱을 구현해줘. 걸으면 포인트가 쌓이는 게이미피케이션 앱이야. 홈(오늘 걸음 수·포인트 받기) / 출석·미션 / 목표 달성 축하 / 걸음 순위 / 배지 / 마이(포인트 내역·주간 기록) / 하단 탭이 있어야 해.',
    requestLabel: '요청',
    alt: 'AS-IS와 TO-BE 비교. 왼쪽 AS-IS는 suta 없이 만든 목표 달성 축하 화면으로, 별도 페이지에 이모지 트로피와 흩어진 색종이, 버튼 세 개가 있다. 오른쪽 TO-BE는 suta 0.11.0으로 만든 화면으로, 홈 위에 뜬 대화상자에 금색 원판 트로피, 오늘 목표 달성, +50P, 확인 버튼 하나가 있다.',
    caption: '목표 달성 축하 화면(390px). 각 조건의 첫 실행이고, 2026-10-12에 쟀습니다.',
    diffTitle: '달라진 부분 3개',
    diffNote: '두 실행의 값을 차례로 적었습니다.',
    beforeLabel: 'suta 없이',
    afterLabel: 'suta 0.11.0',
    diffs: [
      { what: '축하 창이 열릴 때 키보드 포커스', before: '문서 처음에 남음(2번 모두)', after: '창의 "확인" 버튼으로 이동(2번 모두)' },
      { what: '멈춰 있는 축하 화면의 무한 반복 애니메이션', before: '25개 · 28개', after: '0개 · 0개' },
      { what: '접근성 검사 위반(axe, 390px, 화면 6개)', before: '51곳 · 35곳', after: '5곳 · 0곳 — 5곳은 직접 고른 회색 글자 4곳과 보이는 글자와 이름이 다른 링크 1곳' },
    ] as Diff[],
    cost: '생성 시간은 2.1~2.2분에서 4.7~8.9분으로, 비용은 0.30~0.34달러에서 0.98~1.62달러로 늘었습니다.',
    limits:
      '조건마다 두 번만 실행했고, 이후 버전으로는 다시 재지 않았습니다. 가린 화면을 두 모델이 비교한 디자인 선호(두 모델 모두 24번 중 20번 suta)는 위 접근성 결과와 따로 봐야 합니다. 판정 모델 하나는 화면을 만든 모델과 같고, 정지 화면만 봤습니다.',
    sourceLink: '측정 방법과 전체 결과',
    sourceHref: `${REPO_BLOB}/docs/comparisons.md#모바일-웹앱-걷기-리워드게이미피케이션`,
    tryTitle: '직접 확인하기',
    tries: [
      {
        href: '#/celebration',
        label: '축하 오버레이',
        hint: '"9개까지 채우기"를 누른 뒤 "도장 찍기"에 키보드로 가서 Enter. 창이 열리면 포커스가 "쿠폰 받기"로 가고, Esc로 닫으면 "도장 찍기"로 돌아옵니다. 동작 줄이기를 켜면 조각 없이 짧은 페이드만 남습니다.',
      },
      {
        href: '#/modal-dialog',
        label: '모달 다이얼로그',
        hint: '"주문 취소"에서 Enter. 포커스가 "돌아가기"로 가고, Esc로 닫으면 "주문 취소"로 돌아옵니다. 뒤 화면은 그동안 잠깁니다.',
      },
      {
        href: '#/layout-audit',
        label: '레이아웃 검사',
        hint: '예시 코드를 고치면 결과가 바로 바뀝니다. 플러그인의 편집 후 검사는 같은 규칙을 파일을 고칠 때마다 돌리고, error를 file:line으로 에이전트에게 돌려줍니다.',
      },
    ] as Try[],
  },
  en: {
    title: 'Example: a walking rewards app',
    lead: 'The same request was run twice without suta and twice with suta 0.11.0, with the same model and settings.',
    request:
      'Build a walking rewards app, a gamified app where walking earns points. It needs Home (today’s steps, claim points) / Check-in and missions / Goal celebration / Step ranking / Badges / My page (points history, weekly record) / bottom tabs.',
    requestLabel: 'Request (translated from Korean)',
    alt: 'AS-IS and TO-BE comparison. Left, AS-IS: the goal celebration screen built without suta, a separate page with an emoji trophy, scattered confetti and three buttons. Right, TO-BE: the screen built with suta 0.11.0, a dialog over the home screen with a trophy on a gold disc, the goal message, +50P and a single OK button.',
    caption: 'Goal celebration screen at 390px. First run of each condition, measured on 2026-10-12.',
    diffTitle: 'Three things that changed',
    diffNote: 'Values are listed for each of the two runs.',
    beforeLabel: 'Without suta',
    afterLabel: 'suta 0.11.0',
    diffs: [
      { what: 'Keyboard focus when the celebration opens', before: 'Stays at the start of the page (both runs)', after: 'Moves to the dialog’s OK button (both runs)' },
      { what: 'Infinite animations on the idle celebration screen', before: '25 and 28', after: '0 and 0' },
      {
        what: 'Accessibility violations (axe, 390px, 6 screens)',
        before: '51 and 35',
        after: '5 and 0. The 5 are four hand-picked gray labels and one link whose name differs from its visible text',
      },
    ] as Diff[],
    cost: 'Generation time went from 2.1–2.2 minutes to 4.7–8.9 minutes, and cost from $0.30–0.34 to $0.98–1.62.',
    limits:
      'There were only two runs per condition, and later versions have not been measured again. The blind design preference (both judge models picked suta in 20 of 24 comparisons) is separate from the accessibility results above. One judge was also the generating model, and the judges saw still images only.',
    sourceLink: 'Method and full results',
    sourceHref: `${REPO_BLOB}/docs/comparisons.en.md#mobile-web-app-walking-rewards-gamification`,
    tryTitle: 'Try it yourself',
    tries: [
      {
        href: '#/celebration',
        label: 'Celebration overlay',
        hint: 'Press “Fill up to nine”, then move to “Add a stamp” with the keyboard and press Enter. Focus moves to “Get the coupon”; Esc closes the dialog and focus returns to “Add a stamp”. With reduced motion on, only a short fade remains.',
      },
      {
        href: '#/modal-dialog',
        label: 'Modal dialog',
        hint: 'Press Enter on “Cancel order”. Focus moves to “Go back”, and Esc returns it to “Cancel order”. The page behind is locked while the dialog is open.',
      },
      {
        href: '#/layout-audit',
        label: 'Layout audit',
        hint: 'Edit the sample code and the results update. The plugin’s post-edit check runs the same rules each time a file changes and sends errors back to the agent as file:line.',
      },
    ] as Try[],
  },
})

export const HomeCase = ({ lang }: { lang: Lang }) => {
  const t = COPY[lang]
  return (
    <section className="home-case" aria-labelledby="home-case-title">
      <h2 id="home-case-title">{t.title}</h2>
      <p className="home-case-lead">{t.lead}</p>
      <figure className="home-case-request">
        <figcaption>{t.requestLabel}</figcaption>
        <blockquote>{t.request}</blockquote>
      </figure>
      <div className="home-case-body">
        <figure className="home-case-shot">
          {/* 사진 크기를 미리 잡아 둔다 — 불러오는 동안 아래 글이 밀리지 않게 */}
          <img src={`${import.meta.env.BASE_URL}compare/walking-celebration.jpg`} width={658} height={723} alt={t.alt} loading="lazy" />
          <figcaption>{t.caption}</figcaption>
        </figure>
        <div className="home-case-diffs">
          <h3>{t.diffTitle}</h3>
          <p className="home-case-note">{t.diffNote}</p>
          <ol>
            {t.diffs.map((diff) => (
              <li key={diff.what}>
                <strong>{diff.what}</strong>
                <dl>
                  <div>
                    <dt>{t.beforeLabel}</dt>
                    <dd>{diff.before}</dd>
                  </div>
                  <div>
                    <dt>{t.afterLabel}</dt>
                    <dd>{diff.after}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
          <p className="home-case-note">{t.cost}</p>
          <p className="home-case-note">{t.limits}</p>
          <a href={t.sourceHref} target="_blank" rel="noreferrer">
            {t.sourceLink}
          </a>
        </div>
      </div>
      <h3 className="home-case-try-title">{t.tryTitle}</h3>
      <ul className="home-case-try">
        {t.tries.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{item.label}</a>
            <p>{item.hint}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
