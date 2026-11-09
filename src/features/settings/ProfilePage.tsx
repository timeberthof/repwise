import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { useProfile } from '../../db/hooks'
import { BodyDataEditor } from '../flow/steps/BodySteps'
import { Button } from '../../components/ui/Button'
import { Section, SettingsLayout } from './SettingsLayout'

/** Profil: Geschlecht, Geburtsdatum, Größe. Gewicht und Fotos liegen im Tab „Körper“. */
export function ProfilePage() {
  const navigate = useNavigate()
  const profile = useProfile()
  if (!profile) return <SettingsLayout title="Profil">{null}</SettingsLayout>
  return (
    <SettingsLayout title="Profil">
      <div className="px-4">
        <BodyDataEditor
          sex={profile.sex}
          birthDate={profile.birthDate}
          heightCm={profile.heightCm}
          onChange={async (p) => {
            await db.profile.update('me', { ...(p.sex ? { sex: p.sex } : {}), ...(p.birthDate ? { birthDate: p.birthDate } : {}), ...(p.heightCm ? { heightCm: p.heightCm } : {}) })
          }}
        />
      </div>
      <Section title="Gewicht & Fotos" hint="Körpergewicht, Verlauf und Fortschrittsfotos findest Du im Tab „Körper“.">
        <Button variant="secondary" icon="chevronRight" onClick={() => navigate('/koerper')}>
          Zu „Körper“
        </Button>
      </Section>
    </SettingsLayout>
  )
}
