import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { SearchTripsQuery } from '../api/types'
import { buildTripDetailsPath } from '../app/routes'
import { Button, Card, Input, Select } from '../components/ui'
import {
  formatDurationBetween,
  formatPrice,
  formatServiceDate,
  formatStationLabel,
  formatTripTime,
} from '../lib/format'

export function SearchPage() {
  const defaultServiceDate = useMemo(() => getTodayDateValue(), [])
  const stationsQuery = useQuery({
    queryKey: ['stations'],
    queryFn: () => apiClient.getStations(),
  })

  const stationOptions = stationsQuery.data ?? []
  const isStationsLoading = stationsQuery.isLoading
  const hasStationError = stationsQuery.isError
  const [fromStationId, setFromStationId] = useState('')
  const [toStationId, setToStationId] = useState('')
  const [serviceDate, setServiceDate] = useState(defaultServiceDate)
  const [seatCount, setSeatCount] = useState('1')
  const [submittedQuery, setSubmittedQuery] = useState<SearchTripsQuery | null>(
    null,
  )
  const validationErrors = getSearchFormErrors({
    fromStationId,
    toStationId,
    serviceDate,
    seatCount,
  })
  const hasValidationErrors = validationErrors.length > 0
  const tripsQuery = useQuery({
    queryKey: ['trip-search', submittedQuery],
    queryFn: () => apiClient.searchTrips(submittedQuery!),
    enabled: submittedQuery !== null,
  })
  const hasNoTrips =
    submittedQuery !== null &&
    tripsQuery.isSuccess &&
    (tripsQuery.data?.length ?? 0) === 0
  const isSearchDisabled =
    hasStationError || hasValidationErrors || tripsQuery.isFetching
  const isPristine =
    fromStationId === '' &&
    toStationId === '' &&
    serviceDate === defaultServiceDate &&
    seatCount === '1' &&
    submittedQuery === null

  function handleReset() {
    setFromStationId('')
    setToStationId('')
    setServiceDate(defaultServiceDate)
    setSeatCount('1')
    setSubmittedQuery(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (hasStationError || hasValidationErrors) {
      return
    }

    setSubmittedQuery({
      fromStationId,
      toStationId,
      serviceDate,
      seatCount: Number(seatCount),
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <section className="hero-panel w-full">
        <p className="eyebrow">Long-distance rail</p>
        <h1>Find seats across the full route, not just the terminal stations.</h1>
        <p className="summary">
          Search by departure station, arrival station, travel date, and seat
          count. The results will reflect segment-based seat availability on
          multi-stop trips.
        </p>
      </section>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="eyebrow mb-0">Trip search</p>
            <h2 className="text-3xl leading-tight text-[var(--text)]">
              Search available trains
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
              This layout is now ready for real station data, search
              submission, and result rendering in the next tasks.
            </p>
          </div>

          <form
            id="trip-search-form"
            className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4"
            onSubmit={handleSubmit}
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">
                From
              </span>
              <Select
                value={fromStationId}
                disabled={isStationsLoading || hasStationError}
                onChange={(event) => setFromStationId(event.target.value)}
              >
                <option value="" disabled>
                  {isStationsLoading
                    ? 'Loading stations...'
                    : hasStationError
                      ? 'Could not load stations'
                      : 'Select departure station'}
                </option>
                {stationOptions.map((station) => (
                  <option key={station.id} value={station.id}>
                    {formatStationLabel(station)}
                  </option>
                ))}
              </Select>
              {hasStationError ? (
                <p className="text-sm text-[var(--danger)]">
                  Station list is unavailable right now. Retry after the API is
                  reachable.
                </p>
              ) : null}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">
                To
              </span>
              <Select
                value={toStationId}
                disabled={isStationsLoading || hasStationError}
                onChange={(event) => setToStationId(event.target.value)}
              >
                <option value="" disabled>
                  {isStationsLoading
                    ? 'Loading stations...'
                    : hasStationError
                      ? 'Could not load stations'
                      : 'Select arrival station'}
                </option>
                {stationOptions.map((station) => (
                  <option key={station.id} value={station.id}>
                    {formatStationLabel(station)}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">
                Date
              </span>
              <Input
                type="date"
                min={defaultServiceDate}
                value={serviceDate}
                onChange={(event) => setServiceDate(event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">
                Seats
              </span>
              <Select
                value={seatCount}
                onChange={(event) => setSeatCount(event.target.value)}
              >
                <option value="1">1 seat</option>
                <option value="2">2 seats</option>
                <option value="3">3 seats</option>
                <option value="4">4 seats</option>
                <option value="5">5 seats</option>
              </Select>
            </label>
          </form>

          {hasValidationErrors ? (
            <div className="rounded-2xl border border-[rgba(180,35,24,0.16)] bg-[rgba(180,35,24,0.06)] px-4 py-3 text-sm text-[var(--danger)]">
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              form="trip-search-form"
              disabled={isSearchDisabled}
            >
              {tripsQuery.isFetching ? 'Searching...' : 'Search trips'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPristine || tripsQuery.isFetching}
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Reset clears the selected stations and current search state, and
            restores today&apos;s date with 1 seat.
          </p>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-3">
          <p className="eyebrow mb-0">Results area</p>
          <h2 className="text-2xl leading-tight text-[var(--text)]">
            Search results will render below this form
          </h2>
          {submittedQuery === null ? (
            <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Submit the form to fetch matching trips from the backend. The
              next tasks will render actual result cards and empty states.
            </p>
          ) : tripsQuery.isFetching ? (
            <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Searching available trips for the selected segment and date...
            </p>
          ) : tripsQuery.isError ? (
            <p className="max-w-3xl text-sm leading-6 text-[var(--danger)]">
              Search request failed. Check the backend connection or submitted
              data and try again.
            </p>
          ) : hasNoTrips ? (
            <>
              <h2 className="text-2xl leading-tight text-[var(--text)]">
                No trains found for this segment
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
                No trips currently match the selected departure station,
                arrival station, date, and seat count. Try another date, a
                different station pair, or fewer seats.
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
                Matching trips found:{' '}
                <span className="font-semibold text-[var(--text)]">
                  {tripsQuery.data?.length ?? 0}
                </span>
                . Detailed pricing, timing, and navigation actions will be
                expanded in the next tasks.
              </p>

              <div className="grid gap-4">
                {tripsQuery.data?.map((trip) => (
                  <Card
                    key={trip.tripId}
                    as="article"
                    className="p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-col gap-2">
                          <p className="eyebrow mb-0">{trip.trainNumber}</p>
                          <h3 className="text-xl leading-tight text-[var(--text)]">
                            {trip.trainName ?? 'Unnamed train'}
                          </h3>
                          <p className="text-sm text-[var(--muted)]">
                            Service date: {formatServiceDate(trip.serviceDate)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            Total for {submittedQuery?.seatCount ?? 1}{' '}
                            {submittedQuery?.seatCount === 1 ? 'seat' : 'seats'}
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-[var(--text)]">
                            {formatPrice(trip.totalPrice)}
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {formatPrice(trip.pricePerSeat)} per seat
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            Departure
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[var(--text)]">
                            {formatTripTime(trip.departureTime)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            Arrival
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[var(--text)]">
                            {formatTripTime(trip.arrivalTime)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            Duration
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[var(--text)]">
                            {formatDurationBetween(
                              trip.departureTime,
                              trip.arrivalTime,
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            Available seats
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[var(--text)]">
                            {trip.availableSeatCount}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-[var(--muted)]">
                          This trip currently satisfies the requested segment
                          and seat count.
                        </p>
                        <Link
                          to={buildTripDetailsPath(trip.tripId, {
                            fromStationId: submittedQuery?.fromStationId,
                            toStationId: submittedQuery?.toStationId,
                            serviceDate: submittedQuery?.serviceDate,
                            seatCount: submittedQuery?.seatCount,
                          })}
                          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                        >
                          View trip
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10)
}

function getSearchFormErrors(input: {
  fromStationId: string
  toStationId: string
  serviceDate: string
  seatCount: string
}) {
  const errors: string[] = []

  if (!input.fromStationId) {
    errors.push('Choose a departure station.')
  }

  if (!input.toStationId) {
    errors.push('Choose an arrival station.')
  }

  if (
    input.fromStationId &&
    input.toStationId &&
    input.fromStationId === input.toStationId
  ) {
    errors.push('Departure and arrival stations must be different.')
  }

  if (!input.serviceDate) {
    errors.push('Choose a travel date.')
  }

  const numericSeatCount = Number(input.seatCount)

  if (!Number.isInteger(numericSeatCount) || numericSeatCount < 1 || numericSeatCount > 5) {
    errors.push('Seat count must be between 1 and 5.')
  }

  return errors
}
