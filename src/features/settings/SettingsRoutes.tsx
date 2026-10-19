import { Route, Routes } from 'react-router'
import { SettingsPage } from './SettingsPage'
import { ProfilePage } from './ProfilePage'
import { GoalsPage } from './GoalsPage'
import { TrainingSettingsPage } from './TrainingSettingsPage'
import { CardioSettingsPage } from './CardioSettingsPage'
import { StepsSettingsPage } from './StepsSettingsPage'
import { HintsSettingsPage } from './HintsSettingsPage'
import { DataPage } from './DataPage'
import { AboutPage } from './AboutPage'
import { PhotosPage } from '../photos/PhotosPage'

export default function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<SettingsPage />} />
      <Route path="profil" element={<ProfilePage />} />
      <Route path="ziele" element={<GoalsPage />} />
      <Route path="trainingsplan" element={<TrainingSettingsPage />} />
      <Route path="cardio" element={<CardioSettingsPage />} />
      <Route path="schritte" element={<StepsSettingsPage />} />
      <Route path="hinweise" element={<HintsSettingsPage />} />
      <Route path="daten" element={<DataPage />} />
      <Route path="backup" element={<DataPage />} />
      <Route path="fotos" element={<PhotosPage />} />
      <Route path="info" element={<AboutPage />} />
      <Route path="*" element={<SettingsPage />} />
    </Routes>
  )
}
