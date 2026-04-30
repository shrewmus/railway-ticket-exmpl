import { apiFetch, buildQueryString } from './http'
import type {
  BookingCreated,
  CreateBookingInput,
  SearchTripResult,
  SearchTripsQuery,
  Station,
  TripDetails,
  TripSeat,
  TripSegmentQuery,
} from './types'

export const apiClient = {
  getStations() {
    return apiFetch<Station[]>('/stations')
  },

  searchTrips(query: SearchTripsQuery) {
    return apiFetch<SearchTripResult[]>(
      `/trips/search${buildQueryString(query)}`,
    )
  },

  getTripDetails(tripId: string, query: TripSegmentQuery) {
    return apiFetch<TripDetails>(
      `/trips/${tripId}${buildQueryString(query)}`,
    )
  },

  getTripSeats(tripId: string, query: TripSegmentQuery) {
    return apiFetch<TripSeat[]>(
      `/trips/${tripId}/seats${buildQueryString(query)}`,
    )
  },

  createBooking(input: CreateBookingInput) {
    return apiFetch<BookingCreated>('/bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}
