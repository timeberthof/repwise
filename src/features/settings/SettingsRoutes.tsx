import { Navigate, Route, Routes } from 'react-router'
import { SettingsPage } from './SettingsPage'
import { ProfilePage } from './ProfilePage'
import { CardioSettingsPage } from './CardioSettingsPage'
import { TrainingSettingsPage } from './TrainingSettingsPage'
import { HintsSettingsPage } from './HintsSettingsPage'
import { DataPage } from './DataPage'
import { AboutPage } from './AboutPage'

export default function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<SettingsPage />} />
      <Route path="profil" element={<ProfilePage />} />
      <Route path="training" element={<TrainingSettingsPage />} />
      <Route path="cardio" element={<CardioSettingsPage />} />
      <Route path="hinweise" element={<HintsSettingsPage />} />
      <Route path="daten" element={<DataPage />} />
      <Route path="backup" element={<DataPage />} />
      <Route path="fotos" element={<Navigate to="/koerper" replace />} />
      <Route path="info" element={<AboutPage />} />
      <Route path="*" element={<SettingsPage />} />
    </Routes>
  )
}
