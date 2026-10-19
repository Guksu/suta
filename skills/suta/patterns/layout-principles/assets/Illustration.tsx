import { ILLUSTRATIONS, type IllustrationName } from './illustrations'

type IllustrationProps = {
  name: IllustrationName
  size?: number
  /** 그림만으로 뜻을 전할 때만 적는다(화면 낭독기가 읽는다). 옆에 이름 글자가 있으면(바로가기 칸 등) 비워서 숨긴다 */
  label?: string
  className?: string
}

/** 콘텐츠 자리의 그림 아이콘 React 래퍼 — 색은 그림에 들어 있다. 탭 바·머리·버튼 같은 틀에는 Icon(선 아이콘)을 쓴다 */
export const Illustration = ({ name, size = 40, label, className }: IllustrationProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    focusable="false"
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    // 그림 데이터는 이 파일과 함께 복사한 정적 문자열(illustrations.ts)이라 사용자 입력이 섞이지 않는다
    dangerouslySetInnerHTML={{ __html: ILLUSTRATIONS[name] }}
  />
)
