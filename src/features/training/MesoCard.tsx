import { useState } from 'react'
import { Icon } from '../../components/icons/Icon'
import { useToast } from '../../components/ui/Toast'

/** „Mesozyklus beenden“ (S02) – erscheint in der letzten Woche des Zyklus. */
export function MesoCard({ onOptimize }: { onOptimize: () => void }) {
  const toast = useToast()
  const [, setInfo] = useState(false)
  return (
    <div className="rounded-xl bg-surface px-[13px] pb-[26px] pt-[13px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-semibold">Mesozyklus beenden</h2>
        <button
          type="button"
          aria-label="Info"
          onClick={() => {
            setInfo(true)
            toast('Mesozyklus', 'Ein Zyklus dauert 6 Wochen: Intro, 2 × Normal, Overreaching, Peak Week und Deload. Danach wird Dein Plan anhand Deiner Trainings optimiert.')
          }}
          className="text-fg"
        >
          <Icon name="info" size={28} />
        </button>
      </div>
      <p className="mt-[18px] text-[17.5px] leading-[1.32]">Du bist in der letzten Woche des Mesozyklus angekommen. Starte die Evaluation und gib Deine Präferenzen an.</p>
      <button type="button" onClick={onOptimize} className="mx-[9px] mt-[22px] flex h-14 w-[calc(100%-18px)] items-center justify-between rounded-xl bg-fg px-[18px] text-fg-inverse active:scale-[0.98]">
        <span className="text-[18px] font-bold">Trainingsplan optimieren</span>
        <Icon name="chevronRight" size={24} />
      </button>
    </div>
  )
}
