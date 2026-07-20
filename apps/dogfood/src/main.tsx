import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DogfoodProvider } from './lib/state';
import { Shell } from './components/Shell';
import { OverviewPage } from './pages/Overview';
import { PlansPage } from './pages/Plans';
import { CreditsPage } from './pages/Credits';
import { BillingPage } from './pages/Billing';
import { PaymentsPage } from './pages/Payments';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DogfoodProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<OverviewPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="credits" element={<CreditsPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DogfoodProvider>
  </StrictMode>,
);
