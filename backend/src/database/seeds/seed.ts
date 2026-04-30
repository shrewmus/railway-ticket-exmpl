import 'reflect-metadata';
import appDataSource from '../data-source';
import {
  Booking,
  BookingItem,
  Route,
  RouteStop,
  Station,
  Train,
  TrainSeat,
  Trip,
} from '../entities';

type StationSeed = {
  code: string;
  name: string;
};

type TrainSeed = {
  number: string;
  name: string;
};

// hehe OpenTTD inspired station names :D
const stationsSeed: StationSeed[] = [
  { code: 'NUNN', name: 'Nunningstone' },
  { code: 'GEBU', name: 'Geburg' },
  { code: 'SLON', name: 'Slondingville' },
  { code: 'WRUT', name: 'Wruthill City' },
  { code: 'PENN', name: 'Peningwell' },
  { code: 'BECI', name: 'Becingwell Ridge' },
];

const trainsSeed: TrainSeed[] = [
  { number: 'IC-101', name: 'Intercity North' },
  { number: 'REG-202', name: 'Regional South' },
];

async function resetTables() {
  await appDataSource.query(`
    TRUNCATE TABLE
      booking_items,
      bookings,
      trips,
      route_stops,
      train_seats,
      routes,
      trains,
      stations
    RESTART IDENTITY CASCADE
  `);
}

async function seedStations() {
  const repository = appDataSource.getRepository(Station);

  const stations = repository.create(stationsSeed);
  await repository.save(stations);

  return new Map(stations.map((station) => [station.code, station]));
}

async function seedTrains() {
  const repository = appDataSource.getRepository(Train);

  const trains = repository.create(trainsSeed);
  await repository.save(trains);

  return new Map(trains.map((train) => [train.number, train]));
}

/**
 * Creates fixed seats for each seeded train - 2 cars x 8 seats
 */
async function seedSeats(trainsByNumber: Map<string, Train>) {
  const repository = appDataSource.getRepository(TrainSeat);
  const seats: TrainSeat[] = [];

  for (const train of trainsByNumber.values()) {
    for (let carNumber = 1; carNumber <= 2; carNumber += 1) {
      for (let seat = 1; seat <= 8; seat += 1) {
        seats.push(
          repository.create({
            trainId: train.id,
            carNumber,
            seatNumber: String(seat),
          }),
        );
      }
    }
  }

  await repository.save(seats);

  return new Map(
    seats.map((seat) => [
      `${seat.trainId}:${seat.carNumber}:${seat.seatNumber}`,
      seat,
    ]),
  );
}

async function seedRoutes(stationsByCode: Map<string, Station>) {
  const routeRepository = appDataSource.getRepository(Route);
  const routeStopRepository = appDataSource.getRepository(RouteStop);

  const routes = routeRepository.create([
    { code: 'R1', name: 'Nunningstone to Peningwell' },
    { code: 'R2', name: 'Geburg to Becingwell Ridge' },
  ]);
  await routeRepository.save(routes);

  const routesByCode = new Map(routes.map((route) => [route.code, route]));

  const routeStops = routeStopRepository.create([
    {
      routeId: routesByCode.get('R1')!.id,
      stationId: stationsByCode.get('NUNN')!.id,
      stopOrder: 1,
      defaultArrivalOffsetMinutes: null,
      defaultDepartureOffsetMinutes: 0,
    },
    {
      routeId: routesByCode.get('R1')!.id,
      stationId: stationsByCode.get('GEBU')!.id,
      stopOrder: 2,
      defaultArrivalOffsetMinutes: 45,
      defaultDepartureOffsetMinutes: 50,
    },
    {
      routeId: routesByCode.get('R1')!.id,
      stationId: stationsByCode.get('SLON')!.id,
      stopOrder: 3,
      defaultArrivalOffsetMinutes: 95,
      defaultDepartureOffsetMinutes: 100,
    },
    {
      routeId: routesByCode.get('R1')!.id,
      stationId: stationsByCode.get('WRUT')!.id,
      stopOrder: 4,
      defaultArrivalOffsetMinutes: 145,
      defaultDepartureOffsetMinutes: 150,
    },
    {
      routeId: routesByCode.get('R1')!.id,
      stationId: stationsByCode.get('PENN')!.id,
      stopOrder: 5,
      defaultArrivalOffsetMinutes: 205,
      defaultDepartureOffsetMinutes: null,
    },
    {
      routeId: routesByCode.get('R2')!.id,
      stationId: stationsByCode.get('GEBU')!.id,
      stopOrder: 1,
      defaultArrivalOffsetMinutes: null,
      defaultDepartureOffsetMinutes: 0,
    },
    {
      routeId: routesByCode.get('R2')!.id,
      stationId: stationsByCode.get('WRUT')!.id,
      stopOrder: 2,
      defaultArrivalOffsetMinutes: 55,
      defaultDepartureOffsetMinutes: 60,
    },
    {
      routeId: routesByCode.get('R2')!.id,
      stationId: stationsByCode.get('BECI')!.id,
      stopOrder: 3,
      defaultArrivalOffsetMinutes: 110,
      defaultDepartureOffsetMinutes: null,
    },
  ]);

  await routeStopRepository.save(routeStops);

  return routesByCode;
}

async function seedTrips(
  trainsByNumber: Map<string, Train>,
  routesByCode: Map<string, Route>,
) {
  const repository = appDataSource.getRepository(Trip);

  const trips = repository.create([
    {
      trainId: trainsByNumber.get('IC-101')!.id,
      routeId: routesByCode.get('R1')!.id,
      serviceDate: '2026-05-10',
      pricePerSegment: '20.00',
    },
    {
      trainId: trainsByNumber.get('IC-101')!.id,
      routeId: routesByCode.get('R1')!.id,
      serviceDate: '2026-05-11',
      pricePerSegment: '20.00',
    },
    {
      trainId: trainsByNumber.get('REG-202')!.id,
      routeId: routesByCode.get('R2')!.id,
      serviceDate: '2026-05-10',
      pricePerSegment: '15.00',
    },
  ]);

  await repository.save(trips);

  return new Map(trips.map((trip) => [`${trip.trainId}:${trip.routeId}:${trip.serviceDate}`, trip]));
}

async function createBookingWithItems(params: {
  trip: Trip;
  fromStation: Station;
  toStation: Station;
  fromStopOrder: number;
  toStopOrder: number;
  customerName: string;
  documentNumber: string;
  seatRefs: Array<{ carNumber: number; seatNumber: string }>;
  seatsByKey: Map<string, TrainSeat>;
  pricePerSeat: string;
}) {
  const bookingRepository = appDataSource.getRepository(Booking);
  const bookingItemRepository = appDataSource.getRepository(BookingItem);

  const booking = bookingRepository.create({
    tripId: params.trip.id,
    fromStationId: params.fromStation.id,
    toStationId: params.toStation.id,
    fromStopOrder: params.fromStopOrder,
    toStopOrder: params.toStopOrder,
    seatCount: params.seatRefs.length,
    priceTotal: (Number(params.pricePerSeat) * params.seatRefs.length).toFixed(2),
    customerName: params.customerName,
    documentNumber: params.documentNumber,
    status: 'confirmed',
  });

  await bookingRepository.save(booking);

  const items = bookingItemRepository.create(
    params.seatRefs.map((seatRef) => {
      const seat = params.seatsByKey.get(
        `${params.trip.trainId}:${seatRef.carNumber}:${seatRef.seatNumber}`,
      );

      if (!seat) {
        throw new Error(
          `Missing seed seat ${seatRef.carNumber}/${seatRef.seatNumber} for trip ${params.trip.id}`,
        );
      }

      return {
        bookingId: booking.id,
        seatId: seat.id,
        price: params.pricePerSeat,
      };
    }),
  );

  await bookingItemRepository.save(items);
}

async function seedBookings(params: {
  stationsByCode: Map<string, Station>;
  routesByCode: Map<string, Route>;
  tripsByKey: Map<string, Trip>;
  trainsByNumber: Map<string, Train>;
  seatsByKey: Map<string, TrainSeat>;
}) {
  const trip1 = params.tripsByKey.get(
    `${params.trainsByNumber.get('IC-101')!.id}:${params.routesByCode.get('R1')!.id}:2026-05-10`,
  );

  if (!trip1) {
    throw new Error('Trip 1 seed data was not created');
  }

  await createBookingWithItems({
    trip: trip1,
    fromStation: params.stationsByCode.get('NUNN')!,
    toStation: params.stationsByCode.get('GEBU')!,
    fromStopOrder: 1,
    toStopOrder: 2,
    customerName: 'Aline Mercer',
    documentNumber: 'DOC-1001',
    seatRefs: [{ carNumber: 1, seatNumber: '1' }],
    seatsByKey: params.seatsByKey,
    pricePerSeat: '20.00',
  });

  await createBookingWithItems({
    trip: trip1,
    fromStation: params.stationsByCode.get('GEBU')!,
    toStation: params.stationsByCode.get('WRUT')!,
    fromStopOrder: 2,
    toStopOrder: 4,
    customerName: 'Boris Hale',
    documentNumber: 'DOC-1002',
    seatRefs: [{ carNumber: 1, seatNumber: '2' }],
    seatsByKey: params.seatsByKey,
    pricePerSeat: '40.00',
  });

  await createBookingWithItems({
    trip: trip1,
    fromStation: params.stationsByCode.get('NUNN')!,
    toStation: params.stationsByCode.get('SLON')!,
    fromStopOrder: 1,
    toStopOrder: 3,
    customerName: 'Clara Stone',
    documentNumber: 'DOC-1003',
    seatRefs: [{ carNumber: 1, seatNumber: '3' }],
    seatsByKey: params.seatsByKey,
    pricePerSeat: '40.00',
  });

  await createBookingWithItems({
    trip: trip1,
    fromStation: params.stationsByCode.get('SLON')!,
    toStation: params.stationsByCode.get('PENN')!,
    fromStopOrder: 3,
    toStopOrder: 5,
    customerName: 'Daria Bloom',
    documentNumber: 'DOC-1004',
    seatRefs: [
      { carNumber: 2, seatNumber: '1' },
      { carNumber: 2, seatNumber: '2' },
    ],
    seatsByKey: params.seatsByKey,
    pricePerSeat: '40.00',
  });
}

async function runSeed() {
  await appDataSource.initialize();

  try {
    await resetTables();

    const stationsByCode = await seedStations();
    const trainsByNumber = await seedTrains();
    const seatsByKey = await seedSeats(trainsByNumber);
    const routesByCode = await seedRoutes(stationsByCode);
    const tripsByKey = await seedTrips(trainsByNumber, routesByCode);

    await seedBookings({
      stationsByCode,
      routesByCode,
      tripsByKey,
      trainsByNumber,
      seatsByKey,
    });

    console.log('Seed completed successfully.');
  } finally {
    await appDataSource.destroy();
  }
}

void runSeed().catch((error) => {
  console.error('Seed failed.', error);
  process.exitCode = 1;
});
