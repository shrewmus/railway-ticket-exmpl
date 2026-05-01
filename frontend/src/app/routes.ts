export const appRoutes = {
  search: '/',
  tripDetails: '/trips/:tripId',
} as const

type TripDetailsRouteQuery = {
  fromStationId?: string
  toStationId?: string
  serviceDate?: string
  seatCount?: number
}

export function buildTripDetailsPath(
  tripId: string,
  query?: TripDetailsRouteQuery,
) {
  const basePath = `/trips/${tripId}`

  if (!query) {
    return basePath
  }

  const searchParams = new URLSearchParams()

  if (query.fromStationId) {
    searchParams.set('fromStationId', query.fromStationId)
  }

  if (query.toStationId) {
    searchParams.set('toStationId', query.toStationId)
  }

  if (query.serviceDate) {
    searchParams.set('serviceDate', query.serviceDate)
  }

  if (query.seatCount) {
    searchParams.set('seatCount', String(query.seatCount))
  }

  const serializedQuery = searchParams.toString()

  return serializedQuery ? `${basePath}?${serializedQuery}` : basePath
}
