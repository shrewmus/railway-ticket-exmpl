import { createBrowserRouter } from 'react-router'
import App from '../App'
import { SearchPage } from '../pages/SearchPage'
import { TripDetailsPage } from '../pages/TripDetailsPage'
import { appRoutes } from './routes'

export const router = createBrowserRouter([
  {
    path: appRoutes.search,
    element: <App />,
    children: [
      {
        id: 'search',
        index: true,
        element: <SearchPage />,
      },
      {
        id: 'trip-details',
        path: appRoutes.tripDetails,
        element: <TripDetailsPage />,
      },
    ],
  },
])
