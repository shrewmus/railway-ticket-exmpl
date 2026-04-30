import { createBrowserRouter } from 'react-router'
import App from '../App'
import { SearchPage } from '../pages/SearchPage'
import { TripDetailsPage } from '../pages/TripDetailsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <SearchPage />,
      },
      {
        path: 'trips/:tripId',
        element: <TripDetailsPage />,
      },
    ],
  },
])
