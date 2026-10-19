import { useNavigate } from 'react-router'
import { SubHeader } from '../../components/layout/PageHeader'
import { ListGroup, ListRow } from '../../components/ui/ListGroup'
import { SectionLabel } from '../../components/ui/SectionLabel'

/** Einstellungen im Aufbau des Originals (S43/S44), angepasst an Repwise (DECISIONS.md). */
export function SettingsPage() {
  const navigate = useNavigate()
  const go = (p: string) => () => navigate(`/einstellungen/${p}`)
  return (
    <div className="min-h-dvh bg-bg pb-16">
      <SubHeader title="Einstellungen" onBack={() => navigate('/home')} />
      <SectionLabel className="mt-[27px]">Konto</SectionLabel>
      <ListGroup className="mx-4 mt-[13px]">
        <ListRow icon="profile" title="Profil" onClick={go('profil')} />
      </ListGroup>

      <SectionLabel className="mt-[34px]">Personalisierung</SectionLabel>
      <ListGroup className="mx-4 mt-[13px]">
        <ListRow icon="settings" color="#ff6e40" title="Trainingsplan" onClick={go('trainingsplan')} />
        <ListRow icon="calendar" color="#f3af3d" title="Zyklus" onClick={() => navigate('/zyklus')} />
        <ListRow icon="heartMonitor" color="#673ab7" title="Cardio-Trainingsplan" onClick={go('cardio')} />
        <ListRow icon="trophy" color="#ffaa00" title="Ziele & Kalorien" onClick={go('ziele')} />
        <ListRow icon="walk" color="#7a5be0" title="Schritte" onClick={go('schritte')} />
        <ListRow icon="notifications" color="#20c040" title="Hinweise" onClick={go('hinweise')} />
      </ListGroup>

      <SectionLabel className="mt-[34px]">Aktionen</SectionLabel>
      <ListGroup className="mx-4 mt-[13px]">
        <ListRow icon="camera" color="#ffaa00" title="Fortschrittsfotos" onClick={go('fotos')} />
        <ListRow icon="history" color="#ed774d" title="Trainingsverlauf" onClick={() => navigate('/verlauf')} />
        <ListRow icon="database" color="#2020ff" title="Daten & Backup" onClick={go('daten')} />
      </ListGroup>

      <SectionLabel className="mt-[34px]">Über Repwise</SectionLabel>
      <ListGroup className="mx-4 mt-[13px]">
        <ListRow icon="info" color="#007888" title="Über die App" subtitle={`Version ${__APP_VERSION__} · Anleitung fürs iPhone`} onClick={go('info')} />
      </ListGroup>
    </div>
  )
}
