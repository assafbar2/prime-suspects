import { memo } from 'react'
import { getProbe } from '../engine/probes'

const TIER_CLASS: Record<string, string> = {
  beat: 'beat',
  detective: 'detective',
  specialist: 'specialist',
  wildcard: 'wildcard',
}

interface Props {
  id: string
  used: boolean
  blocked?: boolean
  selectedInDraft?: boolean
  onClick?: () => void
}

function ProbeCardInner({ id, used, blocked, selectedInDraft, onClick }: Props) {
  const def = getProbe(id)
  const disabled = used || blocked
  return (
    <button
      type="button"
      className={[
        'probe',
        `probe--${TIER_CLASS[def.tier]}`,
        used ? 'probe--used' : '',
        blocked ? 'probe--blocked' : '',
        selectedInDraft ? 'probe--picked' : '',
      ].join(' ')}
      onClick={onClick}
      disabled={disabled}
      title={blocked ? BLOCKED_NOTE : def.note}
      aria-label={`${def.label} (${def.tier})${blocked ? ' — no new information right now' : ''}`}
      aria-disabled={blocked}
    >
      <span className="probe__gem" aria-hidden />
      <span className="probe__face" aria-hidden>
        {def.face}
      </span>
      <span className="probe__label">{def.label}</span>
      <span className="probe__tier">{blocked ? 'DEAD' : def.tier}</span>
      <span className="probe__sheen" aria-hidden />
    </button>
  )
}

const BLOCKED_NOTE =
  'Every survivor agrees on this one — it cannot split the room. No chip will be spent.'

export const ProbeCard = memo(ProbeCardInner)
