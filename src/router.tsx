import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import AuthGuard from '@/components/AuthGuard';
import AppLayout from '@/components/AppLayout';

// Eager: auth pages (small, needed immediately)
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// Lazy: public auth pages
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const AcceptInvitationPage = lazy(() => import('@/pages/AcceptInvitationPage'));

// Lazy: all authenticated pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ContactsPage = lazy(() => import('@/pages/ContactsPage'));
const ContactDetailPage = lazy(() => import('@/pages/ContactDetailPage'));
const ContactFormPage = lazy(() => import('@/pages/ContactFormPage'));
const CompaniesPage = lazy(() => import('@/pages/CompaniesPage'));
const CompanyDetailPage = lazy(() => import('@/pages/CompanyDetailPage'));
const CompanyFormPage = lazy(() => import('@/pages/CompanyFormPage'));
const DealsPage = lazy(() => import('@/pages/DealsPage'));
const DealDetailPage = lazy(() => import('@/pages/DealDetailPage'));
const DealFormPage = lazy(() => import('@/pages/DealFormPage'));
const PipelinesPage = lazy(() => import('@/pages/PipelinesPage'));
const ActivitiesPage = lazy(() => import('@/pages/ActivitiesPage'));
const ActivityDetailPage = lazy(() => import('@/pages/ActivityDetailPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const TeamMembersPage = lazy(() => import('@/pages/TeamMembersPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const EmailsPage = lazy(() => import('@/pages/EmailsPage'));
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage'));
const WorkflowsPage = lazy(() => import('@/pages/WorkflowsPage'));
const SettingsLayout = lazy(() => import('@/components/SettingsLayout'));
const GeneralSettingsPage = lazy(() => import('@/pages/settings/GeneralSettingsPage'));
const MembersSettingsPage = lazy(() => import('@/pages/settings/MembersSettingsPage'));
const SecuritySettingsPage = lazy(() => import('@/pages/settings/SecuritySettingsPage'));
const PipelineSettingsPage = lazy(() => import('@/pages/settings/PipelineSettingsPage'));
const CustomFieldsSettingsPage = lazy(() => import('@/pages/settings/CustomFieldsSettingsPage'));
const IntegrationsSettingsPage = lazy(() => import('@/pages/settings/IntegrationsSettingsPage'));
const WebhooksSettingsPage = lazy(() => import('@/pages/settings/WebhooksSettingsPage'));
const BillingSettingsPage = lazy(() => import('@/pages/settings/BillingSettingsPage'));
const ImportSettingsPage = lazy(() => import('@/pages/settings/ImportSettingsPage'));
const RolesSettingsPage = lazy(() => import('@/pages/settings/RolesSettingsPage'));
const UsersSettingsPage = lazy(() => import('@/pages/settings/UsersSettingsPage'));
const TeamsSettingsPage = lazy(() => import('@/pages/settings/TeamsSettingsPage'));
const CurrencySettingsPage = lazy(() => import('@/pages/settings/CurrencySettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function LazyFallback() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
      <CircularProgress />
    </Box>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LazyFallback />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <SuspenseWrapper><ForgotPasswordPage /></SuspenseWrapper>,
  },
  {
    path: '/reset-password',
    element: <SuspenseWrapper><ResetPasswordPage /></SuspenseWrapper>,
  },
  {
    path: '/invitation/:token',
    element: <SuspenseWrapper><AcceptInvitationPage /></SuspenseWrapper>,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },

          { path: '/contacts', element: <SuspenseWrapper><ContactsPage /></SuspenseWrapper> },
          { path: '/contacts/new', element: <SuspenseWrapper><ContactFormPage /></SuspenseWrapper> },
          { path: '/contacts/:id', element: <SuspenseWrapper><ContactDetailPage /></SuspenseWrapper> },
          { path: '/contacts/:id/edit', element: <SuspenseWrapper><ContactFormPage /></SuspenseWrapper> },

          { path: '/companies', element: <SuspenseWrapper><CompaniesPage /></SuspenseWrapper> },
          { path: '/companies/new', element: <SuspenseWrapper><CompanyFormPage /></SuspenseWrapper> },
          { path: '/companies/:id', element: <SuspenseWrapper><CompanyDetailPage /></SuspenseWrapper> },
          { path: '/companies/:id/edit', element: <SuspenseWrapper><CompanyFormPage /></SuspenseWrapper> },

          { path: '/deals', element: <SuspenseWrapper><DealsPage /></SuspenseWrapper> },
          { path: '/deals/new', element: <SuspenseWrapper><DealFormPage /></SuspenseWrapper> },
          { path: '/deals/:id', element: <SuspenseWrapper><DealDetailPage /></SuspenseWrapper> },
          { path: '/deals/:id/edit', element: <SuspenseWrapper><DealFormPage /></SuspenseWrapper> },

          { path: '/activities', element: <SuspenseWrapper><ActivitiesPage /></SuspenseWrapper> },
          { path: '/activities/:id', element: <SuspenseWrapper><ActivityDetailPage /></SuspenseWrapper> },
          { path: '/calendar', element: <SuspenseWrapper><CalendarPage /></SuspenseWrapper> },
          { path: '/emails', element: <SuspenseWrapper><EmailsPage /></SuspenseWrapper> },
          { path: '/pipelines', element: <SuspenseWrapper><PipelinesPage /></SuspenseWrapper> },
          { path: '/reports', element: <SuspenseWrapper><ReportsPage /></SuspenseWrapper> },
          { path: '/team', element: <SuspenseWrapper><TeamMembersPage /></SuspenseWrapper> },
          { path: '/audit-log', element: <SuspenseWrapper><AuditLogPage /></SuspenseWrapper> },
          { path: '/workflows', element: <SuspenseWrapper><WorkflowsPage /></SuspenseWrapper> },
          {
            path: '/settings',
            element: <SuspenseWrapper><SettingsLayout /></SuspenseWrapper>,
            children: [
              { index: true, element: <SuspenseWrapper><GeneralSettingsPage /></SuspenseWrapper> },
              { path: 'members', element: <SuspenseWrapper><MembersSettingsPage /></SuspenseWrapper> },
              { path: 'security', element: <SuspenseWrapper><SecuritySettingsPage /></SuspenseWrapper> },
              { path: 'pipelines', element: <SuspenseWrapper><PipelineSettingsPage /></SuspenseWrapper> },
              { path: 'custom-fields', element: <SuspenseWrapper><CustomFieldsSettingsPage /></SuspenseWrapper> },
              { path: 'integrations', element: <SuspenseWrapper><IntegrationsSettingsPage /></SuspenseWrapper> },
              { path: 'webhooks', element: <SuspenseWrapper><WebhooksSettingsPage /></SuspenseWrapper> },
              { path: 'billing', element: <SuspenseWrapper><BillingSettingsPage /></SuspenseWrapper> },
              { path: 'imports', element: <SuspenseWrapper><ImportSettingsPage /></SuspenseWrapper> },
              { path: 'roles', element: <SuspenseWrapper><RolesSettingsPage /></SuspenseWrapper> },
              { path: 'users', element: <SuspenseWrapper><UsersSettingsPage /></SuspenseWrapper> },
              { path: 'teams', element: <SuspenseWrapper><TeamsSettingsPage /></SuspenseWrapper> },
              { path: 'currencies', element: <SuspenseWrapper><CurrencySettingsPage /></SuspenseWrapper> },
            ],
          },

          { path: '*', element: <SuspenseWrapper><NotFoundPage /></SuspenseWrapper> },
        ],
      },
    ],
  },
]);

export default router;
