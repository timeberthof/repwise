import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { ToastProvider } from './components/ui/Toast'
import { TabsLayout } from './components/layout/TabsLayout'
import { UpdateBanner } from './components/layout/UpdateBanner'
import { useProfile } from './db/hooks'

const SettingsRoutes = lazy(() => import('./features/settings/SettingsRoutes'))
const OnboardingFlow = lazy(() => import('./features/onboarding/OnboardingFlow'))
const WorkoutScreen = lazy(() => import('./features/workout/WorkoutScreen'))
const SummaryScreen = lazy(() => import('./features/workout/SummaryScreen'))
const ExerciseStatScreen = lazy(() => import('./features/statistik/ExerciseStatScreen'))
const ZyklusPage = lazy(() => import('./features/zyklus/ZyklusPage'))
const ZyklusPlanen = lazy(() => import('./features/zyklus/ZyklusPlanen'))
const VerlaufPage = lazy(() => import('./features/verlauf/VerlaufPage'))
const SessionDetailScreen = lazy(() => import('./features/verlauf/SessionDetailScreen'))
const PreviewScreen = lazy(() => import('./features/training/PreviewScreen'))
const CardioForm = lazy(() => import('./features/cardio/CardioForm'))

/** Startseite: ohne abgeschlossenes Onboarding → Onboarding, sonst Dashboard. */
function Start() {
  const profile = useProfile()
  if (profile === undefined) return <div className="h-dvh bg-bg" />
  if (!profile || !profile.onboardingDone) return <Navigate to="/onboarding" replace />
  return <Navigate to="/home" replace />
}

export function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Suspense fallback={<div className="h-dvh bg-bg" />}>
          <Routes>
            <Route path="/" element={<Start />} />
            <Route path="/onboarding/*" element={<OnboardingFlow />} />
            <Route path="/einstellungen/*" element={<SettingsRoutes />} />
            <Route path="/workout/:id" element={<WorkoutScreen />} />
            <Route path="/workout/:id/abschluss" element={<SummaryScreen />} />
            <Route path="/statistik/uebung/:id" element={<ExerciseStatScreen />} />
            <Route path="/zyklus" element={<ZyklusPage />} />
            <Route path="/zyklus/planen" element={<ZyklusPlanen />} />
            <Route path="/verlauf" element={<VerlaufPage />} />
            <Route path="/verlauf/:id" element={<SessionDetailScreen />} />
            <Route path="/vorschau/:date/:dayId" element={<PreviewScreen />} />
            <Route path="/cardio/neu" element={<CardioForm />} />
            <Route path="/cardio/:id" element={<CardioForm />} />
            <Route path="/:tab" element={<TabsLayout />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <UpdateBanner />
      </HashRouter>
    </ToastProvider>
  )
}
