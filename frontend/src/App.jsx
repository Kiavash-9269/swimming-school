import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Lazy Pages
const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const CoursesPage = lazy(() => import("./pages/CoursesPage.jsx"));
const ContactUsPage = lazy(() => import("./pages/ContactUsPage.jsx"));
const RecordPage = lazy(() => import("./pages/RecordPage.jsx"));
const GalleryPage = lazy(() => import("./pages/GalleryPage.jsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.jsx"));
const ErrorPage = lazy(() => import("./pages/ErrorPage.jsx"));

// Lazy Layouts
const RootLayout = lazy(() => import("./layouts/RootLayout.jsx"));
const AuthLayout = lazy(() => import("./layouts/AuthLayout.jsx"));

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
    element: <AuthLayout />,
    children: [{ index: true, element: <AuthPage /> }],
  },
]);

function App() {
  return (
    <Suspense fallback={
  <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
  </div>
}>
      <RouterProvider router={route} />
    </Suspense>
  );
}

export default App;