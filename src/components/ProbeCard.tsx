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
  selectedInDraft?: boolean
  onClick?: () => void
}

function ProbeCardInner({ id, used, selectedInDraft, onClick }: Props) {
  const def = getProbe(id)
  return (
    <button
      type="button"
      className={[
        'probe',
        `probe--${TIER_CLASS[def.tier]}`,
        used ? 'probe--used' : '',
        selectedInDraft ? 'probe--picked' : '',
      ].join(' ')}
      onClick={onClick}
      disabled={used}
      title={def.note}
      aria-label={`${def.label} (${def.tier})`}
    >
      <span className="probe__gem" aria-hidden />
      <span className="probe__face" aria-hidden>
        {def.face}
      </span>
      <span className="probe__label">{def.label}</span>
      <span className="probe__tier">{def.tier}</span>
      <span className="probe__sheen" aria-hidden />
    </button>
  )
}

export const ProbeCard = memo(ProbeCardInner)
