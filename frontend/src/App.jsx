import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PageLoader } from "./components/Ui/Loading";
import RequireAuth from "./components/auth/RequireAuth";
import GuestOnly from "./components/auth/GuestOnly";

const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const CoursesPage = lazy(() => import("./pages/CoursesPage.jsx"));
const ContactUsPage = lazy(() => import("./pages/ContactUsPage.jsx"));
const RecordPage = lazy(() => import("./pages/RecordPage.jsx"));
const GalleryPage = lazy(() => import("./pages/GalleryPage.jsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.jsx"));
const ErrorPage = lazy(() => import("./pages/ErrorPage.jsx"));
const AppHomePage = lazy(() => import("./pages/AppHomePage.jsx"));
const AdminHomePage = lazy(() => import("./pages/AdminHomePage.jsx"));
const AdminPendingDocumentsPage = lazy(() => import("./pages/admin/AdminPendingDocumentsPage.jsx"));
const AdminDocumentReviewPage = lazy(() => import("./pages/admin/AdminDocumentReviewPage.jsx"));
const AdminReportsPage = lazy(() => import("./pages/admin/AdminReportsPage.jsx"));
const AdminAttendancePage = lazy(() => import("./pages/admin/AdminAttendancePage.jsx"));
const AdminCoursesPage = lazy(() => import("./pages/admin/AdminCoursesPage.jsx"));
const AdminCourseNewPage = lazy(() => import("./pages/admin/AdminCourseNewPage.jsx"));
const AdminCourseDetailPage = lazy(() => import("./pages/admin/AdminCourseDetailPage.jsx"));
const AdminCourseEditPage = lazy(() => import("./pages/admin/AdminCourseEditPage.jsx"));
const AdminClassesPage = lazy(() => import("./pages/admin/AdminClassesPage.jsx"));
const AdminClassNewPage = lazy(() => import("./pages/admin/AdminClassNewPage.jsx"));
const AdminClassDetailPage = lazy(() => import("./pages/admin/AdminClassDetailPage.jsx"));
const AdminClassEditPage = lazy(() => import("./pages/admin/AdminClassEditPage.jsx"));
const AdminInstructorsPage = lazy(() => import("./pages/admin/AdminInstructorsPage.jsx"));
const AdminPaymentsPage = lazy(() => import("./pages/admin/AdminPaymentsPage.jsx"));
const AdminPaymentDetailPage = lazy(() => import("./pages/admin/AdminPaymentDetailPage.jsx"));
const AdminNotificationsPage = lazy(() => import("./pages/admin/AdminNotificationsPage.jsx"));
const AdminNotificationDetailPage = lazy(
  () => import("./pages/admin/AdminNotificationDetailPage.jsx"),
);
const AdminParticipantsPage = lazy(() => import("./pages/admin/AdminParticipantsPage.jsx"));
const AdminParticipantDetailPage = lazy(() => import("./pages/admin/AdminParticipantDetailPage.jsx"));
const AdminEnrollmentDetailPage = lazy(() => import("./pages/admin/AdminEnrollmentDetailPage.jsx"));
const InstructorHomePage = lazy(() => import("./pages/instructor/InstructorHomePage.jsx"));
const InstructorClassesPage = lazy(() => import("./pages/instructor/InstructorClassesPage.jsx"));
const InstructorClassPage = lazy(() => import("./pages/instructor/InstructorClassPage.jsx"));
const InstructorClassAttendancePage = lazy(
  () => import("./pages/instructor/InstructorClassAttendancePage.jsx"),
);
const AppCoursesPage = lazy(() => import("./pages/app/AppCoursesPage.jsx"));

const AppClassDetailPage = lazy(() => import("./pages/app/AppClassDetailPage.jsx"));
const AppClassRegisterPage = lazy(() => import("./pages/app/AppClassRegisterPage.jsx"));
const AppPaymentCallbackPage = lazy(() => import("./pages/app/AppPaymentCallbackPage.jsx"));
const AppPaymentResultPage = lazy(() => import("./pages/app/AppPaymentResultPage.jsx"));
const AppEnrollmentCompliancePage = lazy(() => import("./pages/app/AppEnrollmentCompliancePage.jsx"));
const AppEnrollmentsPage = lazy(() => import("./pages/app/AppEnrollmentsPage.jsx"));
const AppEnrollmentDetailPage = lazy(() => import("./pages/app/AppEnrollmentDetailPage.jsx"));
const AppParticipantsPage = lazy(() => import("./pages/app/AppParticipantsPage.jsx"));
const AppParticipantNewPage = lazy(() => import("./pages/app/AppParticipantNewPage.jsx"));
const AppParticipantDetailPage = lazy(() => import("./pages/app/AppParticipantDetailPage.jsx"));
const AppParticipantEditPage = lazy(() => import("./pages/app/AppParticipantEditPage.jsx"));

const RootLayout = lazy(() => import("./layouts/RootLayout.jsx"));
const AuthLayout = lazy(() => import("./layouts/AuthLayout.jsx"));
const ProductAppLayout = lazy(() => import("./layouts/ProductAppLayout.jsx"));
const InstructorLayout = lazy(() => import("./layouts/InstructorLayout.jsx"));

const route = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "courses", element: <CoursesPage /> },
      { path: "contact", element: <ContactUsPage /> },
      { path: "record", element: <RecordPage /> },
      { path: "gallery", element: <GalleryPage /> },
    ],
  },
  {
    path: "/auth",
    element: <GuestOnly />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ index: true, element: <AuthPage /> }],
      },
    ],
  },
  {
    path: "/app",
    element: <RequireAuth />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <ProductAppLayout variant="user" />,
        children: [
          { index: true, element: <AppHomePage /> },
          { path: "courses", element: <AppCoursesPage /> },
          { path: "courses/:classId/register", element: <AppClassRegisterPage /> },
          { path: "courses/:classId", element: <AppClassDetailPage /> },
          { path: "enrollments", element: <AppEnrollmentsPage /> },
          { path: "enrollments/payment/callback", element: <AppPaymentCallbackPage /> },
          { path: "enrollments/:enrollmentId/compliance", element: <AppEnrollmentCompliancePage /> },
          { path: "enrollments/:enrollmentId", element: <AppEnrollmentDetailPage /> },
          { path: "payments/:paymentId/result", element: <AppPaymentResultPage /> },
          { path: "participants", element: <AppParticipantsPage /> },
          { path: "participants/new", element: <AppParticipantNewPage /> },
          { path: "participants/:participantId/edit", element: <AppParticipantEditPage /> },
          { path: "participants/:participantId", element: <AppParticipantDetailPage /> },
        ],
      },
    ],
  },
  {
    path: "/instructor",
    element: <RequireAuth />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <InstructorLayout />,
        children: [
          { index: true, element: <InstructorHomePage /> },
          { path: "classes", element: <InstructorClassesPage /> },
          { path: "classes/:classId/attendance", element: <InstructorClassAttendancePage /> },
          { path: "classes/:classId", element: <InstructorClassPage /> },
        ],
      },
    ],
  },
  {
    path: "/admin",
    element: <RequireAuth roles={["ADMIN"]} />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <ProductAppLayout variant="admin" />,
        children: [
          { index: true, element: <AdminHomePage /> },
          { path: "courses", element: <AdminCoursesPage /> },
          { path: "courses/new", element: <AdminCourseNewPage /> },
          { path: "courses/:courseId/edit", element: <AdminCourseEditPage /> },
          { path: "courses/:courseId", element: <AdminCourseDetailPage /> },
          { path: "classes", element: <AdminClassesPage /> },
          { path: "classes/new", element: <AdminClassNewPage /> },
          { path: "classes/:classId/edit", element: <AdminClassEditPage /> },
          { path: "classes/:classId", element: <AdminClassDetailPage /> },
          { path: "instructors", element: <AdminInstructorsPage /> },
          { path: "participants", element: <AdminParticipantsPage /> },
          { path: "participants/:participantId", element: <AdminParticipantDetailPage /> },
          { path: "enrollments/:enrollmentId", element: <AdminEnrollmentDetailPage /> },
          { path: "payments", element: <AdminPaymentsPage /> },
          { path: "payments/:paymentId", element: <AdminPaymentDetailPage /> },
          { path: "notifications", element: <AdminNotificationsPage /> },
          { path: "notifications/:notificationId", element: <AdminNotificationDetailPage /> },
          { path: "documents/pending", element: <AdminPendingDocumentsPage /> },
          { path: "documents/:kind/:documentId", element: <AdminDocumentReviewPage /> },
          { path: "reports", element: <AdminReportsPage /> },
          { path: "attendance", element: <AdminAttendancePage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <ErrorPage />,
  },
]);

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RouterProvider router={route} />
    </Suspense>
  );
}

export default App;
