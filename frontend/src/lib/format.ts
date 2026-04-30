import type { Station } from '../api/types'

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatTripTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

export function formatServiceDate(value: string) {
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00.000Z`
    : value
  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return dateFormatter.format(date)
}

export function formatPrice(value: number | string) {
  const numericValue =
    typeof value === 'number' ? value : Number.parseFloat(value)

  return currencyFormatter.format(numericValue)
}

export function formatStationLabel(input: Pick<Station, 'name' | 'code'>) {
  return `${input.name} (${input.code})`
}

export function formatDurationBetween(
  departureTime: string,
  arrivalTime: string,
) {
  const durationInMinutes = Math.max(
    0,
    Math.round(
      (new Date(arrivalTime).getTime() - new Date(departureTime).getTime()) /
        60000,
    ),
  )

  const hours = Math.floor(durationInMinutes / 60)
  const minutes = durationInMinutes % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}
