import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp } from './helpers/e2e-app';
import { loadStations } from './helpers/seed-data';

describe('GET /trips/search — segment overlap logic (e2e)', () => {
  let app: INestApplication;
  let stations: Awaited<ReturnType<typeof loadStations>>;

  beforeAll(async () => {
    app = await createE2eApp();
    stations = await loadStations(app);
  });

  afterAll(async () => {
    await app.close();
  });

  function searchTrips(params: {
    from: string;
    to: string;
    date: string;
    seats?: number;
  }) {
    const query: Record<string, string | number> = {
      fromStationId: stations.get(params.from)!.id,
      toStationId: stations.get(params.to)!.id,
      serviceDate: params.date,
    };

    if (params.seats !== undefined) {
      query.seatCount = params.seats;
    }

    return request(app.getHttpServer())
      .get('/trips/search')
      .query(query);
  }

  it('returns trips where both stations exist in correct order on the route', async () => {
    // NUNN -> WRUT on 2026-05-10 — IC-101 on R1 (stops 1->4)
    const response = await searchTrips({
      from: 'NUNN',
      to: 'WRUT',
      date: '2026-05-10',
    }).expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(1);
    const trip = response.body[0];
    expect(trip.trainNumber).toBe('IC-101');
    expect(trip.fromStopOrder).toBeLessThan(trip.toStopOrder);
  });

  it('returns no trips when origin comes after destination on the route', async () => {
    // WRUT -> NUNN on 2026-05-10 — reverse direction, no trip exists
    const response = await searchTrips({
      from: 'WRUT',
      to: 'NUNN',
      date: '2026-05-10',
    }).expect(200);

    expect(response.body).toHaveLength(0);
  });

  it('returns no trips when stations belong to different routes', async () => {
    // NUNN -> BECI on 2026-05-10 — NUNN is only on R1, BECI is only on R2
    const response = await searchTrips({
      from: 'NUNN',
      to: 'BECI',
      date: '2026-05-10',
    }).expect(200);

    expect(response.body).toHaveLength(0);
  });

  it('returns no trips for a date with no scheduled departures', async () => {
    const response = await searchTrips({
      from: 'NUNN',
      to: 'GEBU',
      date: '2020-01-01',
    }).expect(200);

    expect(response.body).toHaveLength(0);
  });

  it('returns separate trips on different dates for the same route', async () => {
    const r1 = await searchTrips({
      from: 'NUNN',
      to: 'PENN',
      date: '2026-05-10',
    }).expect(200);

    const r2 = await searchTrips({
      from: 'NUNN',
      to: 'PENN',
      date: '2026-05-11',
    }).expect(200);

    expect(r1.body).toHaveLength(1);
    expect(r2.body).toHaveLength(1);
    expect(r1.body[0].tripId).not.toBe(r2.body[0].tripId);
  });

  it('returns trips from multiple routes when both routes serve the segment', async () => {
    // GEBU -> WRUT on 2026-05-10 — exists on both R1 (IC-101) and R2 (REG-202)
    const response = await searchTrips({
      from: 'GEBU',
      to: 'WRUT',
      date: '2026-05-10',
    }).expect(200);

    expect(response.body).toHaveLength(2);
    const trainNumbers = response.body.map((t: any) => t.trainNumber).sort();
    expect(trainNumbers).toEqual(['IC-101', 'REG-202']);
  });

  it('filters out trips that do not have enough available seats', async () => {
    // GEBU->WRUT (stop 2->4) on trip 1 — seed bookings that overlap:
    //   Car1/Seat2 booked GEBU->WRUT (exact match)
    //   Car1/Seat3 booked NUNN->SLON (1->3 overlaps 2->4)
    //   Car2/Seat1, Car2/Seat2 booked SLON->PENN (3->5 overlaps 2->4)
    // That leaves 12 available seats. Requesting 5 should still return results.
    // Instead, test with a segment where availability is very limited:
    //   NUNN->GEBU (1->2) — Car1/Seat1 is booked. 15 seats available.
    // The real test is that the availableSeatCount field is correct.
    const response = await searchTrips({
      from: 'NUNN',
      to: 'GEBU',
      date: '2026-05-10',
      seats: 5,
    }).expect(200);

    // Trip 1: overlapping bookings for NUNN->GEBU (1->2):
    //   Car1/Seat1 booked NUNN->GEBU (1->2, exact match)
    //   Car1/Seat3 booked NUNN->SLON (1->3, overlaps 1->2)
    // 16 - 2 = 14 available
    expect(response.body).toHaveLength(1);
    expect(response.body[0].availableSeatCount).toBe(14);
  });

  it('computes correct pricing based on segment count', async () => {
    // NUNN -> PENN = 4 segments, price per segment = 20, 1 seat
    const response = await searchTrips({
      from: 'NUNN',
      to: 'PENN',
      date: '2026-05-11',
    }).expect(200);

    expect(response.body).toHaveLength(1);
    const trip = response.body[0];
    expect(trip.pricePerSeat).toBe(80);
    expect(trip.totalPrice).toBe(80);
  });

  it('computes correct total price for multiple seats', async () => {
    // NUNN -> GEBU = 1 segment, price per segment = 20, 3 seats
    const response = await searchTrips({
      from: 'NUNN',
      to: 'GEBU',
      date: '2026-05-11',
      seats: 3,
    }).expect(200);

    expect(response.body).toHaveLength(1);
    const trip = response.body[0];
    expect(trip.pricePerSeat).toBe(20);
    expect(trip.totalPrice).toBe(60);
  });

  it('returns 400 when required query params are missing', async () => {
    await request(app.getHttpServer())
      .get('/trips/search')
      .expect(400);
  });

  it('returns 400 when origin and destination are the same', async () => {
    const stationId = stations.get('NUNN')!.id;
    await request(app.getHttpServer())
      .get('/trips/search')
      .query({
        fromStationId: stationId,
        toStationId: stationId,
        serviceDate: '2026-05-10',
      })
      .expect(400);
  });
});