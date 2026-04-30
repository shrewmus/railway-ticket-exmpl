export type Station = {
  id: string
  code: string
  name: string
  createdAt: string
}

export type SearchTripsQuery = {
  fromStationId: string
  toStationId: string
  serviceDate: string
  seatCount?: number
}

export type SearchTripResult = {
  tripId: string
  trainId: string
  trainNumber: string
  trainName: string | null
  routeId: string
  serviceDate: string
  departureTime: string
  arrivalTime: string
  fromStopOrder: number
  toStopOrder: number
  availableSeatCount: number
  pricePerSeat: number
  totalPrice: number
}

export type TripSegmentQuery = {
  fromStationId: string
  toStationId: string
}

export type TripSegmentSummary = {
  fromStationId: string
  fromStationCode: string
  fromStationName: string
  toStationId: string
  toStationCode: string
  toStationName: string
  fromStopOrder: number
  toStopOrder: number
  segmentCount: number
  departureTime: string
  arrivalTime: string
  pricePerSeat: number
}

export type TripRouteStop = {
  stationId: string
  stationCode: string
  stationName: string
  stopOrder: number
  arrivalTime: string | null
  departureTime: string | null
  isSelectedFrom: boolean
  isSelectedTo: boolean
  isWithinSelectedSegment: boolean
  isDepartureLegSelected: boolean
}

export type TripDetails = {
  tripId: string
  trainId: string
  trainNumber: string
  trainName: string | null
  routeId: string
  routeCode: string
  routeName: string | null
  serviceDate: string
  pricePerSegment: number
  selectedSegment: TripSegmentSummary
  routeStops: TripRouteStop[]
}

export type TripSeat = {
  seatId: string
  carNumber: number
  seatNumber: string
  label: string
}

export type CreateBookingInput = {
  tripId: string
  fromStationId: string
  toStationId: string
  seatIds: string[]
  customerName: string
  documentNumber: string
}

export type BookingCreated = {
  bookingId: string
  tripId: string
  seatCount: number
  totalPrice: string
  seatIds: string[]
}

export type ApiConflictPayload = {
  message: string
  conflictingSeatIds?: string[]
}
