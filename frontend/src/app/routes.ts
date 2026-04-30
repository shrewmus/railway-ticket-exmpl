export const appRoutes = {
  search: '/',
  tripDetails: '/trips/:tripId',
} as const

export function buildTripDetailsPath(tripId: string) {
  return `/trips/${tripId}`
}
