import { memo } from 'react'

export type SuspectState = 'alive' | 'crossed' | 'alibiPick' | 'accused'

interface Props {
  value: number
  index: number
  state: SuspectState
  onClick?: () => void
}

function SuspectCardInner({ value, index, state, onClick }: Props) {
  const cls = [
    'suspect',
    state === 'crossed' ? 'suspect--crossed' : '',
    state === 'alibiPick' ? 'suspect--alibi' : '',
    state === 'accused' ? 'suspect--accused' : '',
  ].join(' ')
  return (
    <button type="button" className={cls} onClick={onClick} aria-label={`Suspect number ${value}`}>
      <span className="suspect__pip suspect__pip--tl">{index + 1}</span>
      <span className="suspect__pip suspect__pip--br">{index + 1}</span>
      <span className="suspect__number">{value}</span>
      <span className="suspect__frame" aria-hidden />
      <span className="suspect__stamp" aria-hidden>
        CROSSED OUT
      </span>
      {state === 'accused' && (
        <span className="suspect__wanted" aria-hidden>
          ACCUSED
        </span>
      )}
      <span className="suspect__sheen" aria-hidden />
    </button>
  )
}

export const SuspectCard = memo(SuspectCardInner)
