// import { useEffect } from "react";
// import { useSelector } from "react-redux";
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import RootLayout from './layouts/RootLayout.jsx'
import ErrorPage from './pages/ErrorPage.jsx'
import HomePage from './pages/HomePage.jsx'

const route = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout></RootLayout>,
    errorElement: <ErrorPage></ErrorPage>,
    children: [
      {
        path: '',
        element: <HomePage />
      },
    {
      path:'auth'
    }

    ]
  }
])

function App() {

  // Dark mode 

  {/* const theme = useSelector((state) => state.theme.mode);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  */}


  return (
    <>
      <RouterProvider router={route} />
    </>
  )
}

export default App
