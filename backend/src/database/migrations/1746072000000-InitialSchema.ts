import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1746072000000 implements MigrationInterface {
  name = 'InitialSchema1746072000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "stations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(32) NOT NULL,
        "name" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_stations_code" UNIQUE ("code"),
        CONSTRAINT "PK_stations_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_stations_code" ON "stations" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stations_name" ON "stations" ("name")`,
    );

    await queryRunner.query(`
      CREATE TABLE "trains" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "number" varchar(32) NOT NULL,
        "name" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_trains_number" UNIQUE ("number"),
        CONSTRAINT "PK_trains_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "routes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(32) NOT NULL,
        "name" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_routes_code" UNIQUE ("code"),
        CONSTRAINT "PK_routes_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "train_seats" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "train_id" uuid NOT NULL,
        "car_number" smallint NOT NULL,
        "seat_number" varchar(32) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CHK_train_seats_car_number_positive" CHECK ("car_number" > 0),
        CONSTRAINT "UQ_train_seats_train_car_seat" UNIQUE ("train_id", "car_number", "seat_number"),
        CONSTRAINT "PK_train_seats_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_train_seats_train_id" FOREIGN KEY ("train_id") REFERENCES "trains" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_train_seats_train_id" ON "train_seats" ("train_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "route_stops" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "route_id" uuid NOT NULL,
        "station_id" uuid NOT NULL,
        "stop_order" integer NOT NULL,
        "default_arrival_offset_minutes" integer,
        "default_departure_offset_minutes" integer,
        CONSTRAINT "CHK_route_stops_stop_order_positive" CHECK ("stop_order" > 0),
        CONSTRAINT "CHK_route_stops_arrival_offset_non_negative" CHECK ("default_arrival_offset_minutes" IS NULL OR "default_arrival_offset_minutes" >= 0),
        CONSTRAINT "CHK_route_stops_departure_offset_non_negative" CHECK ("default_departure_offset_minutes" IS NULL OR "default_departure_offset_minutes" >= 0),
        CONSTRAINT "UQ_route_stops_route_stop_order" UNIQUE ("route_id", "stop_order"),
        CONSTRAINT "UQ_route_stops_route_station" UNIQUE ("route_id", "station_id"),
        CONSTRAINT "PK_route_stops_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_route_stops_route_id" FOREIGN KEY ("route_id") REFERENCES "routes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_route_stops_station_id" FOREIGN KEY ("station_id") REFERENCES "stations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_route_stops_route_id" ON "route_stops" ("route_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_route_stops_station_id" ON "route_stops" ("station_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_route_stops_route_station_stop_order" ON "route_stops" ("route_id", "station_id", "stop_order")`,
    );

    await queryRunner.query(`
      CREATE TABLE "trips" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "train_id" uuid NOT NULL,
        "route_id" uuid NOT NULL,
        "service_date" date NOT NULL,
        "price_per_segment" numeric(10,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CHK_trips_price_per_segment_non_negative" CHECK ("price_per_segment" >= 0),
        CONSTRAINT "UQ_trips_train_route_service_date" UNIQUE ("train_id", "route_id", "service_date"),
        CONSTRAINT "PK_trips_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trips_train_id" FOREIGN KEY ("train_id") REFERENCES "trains" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_trips_route_id" FOREIGN KEY ("route_id") REFERENCES "routes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_route_id" ON "trips" ("route_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_service_date" ON "trips" ("service_date")`,
    );

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "trip_id" uuid NOT NULL,
        "from_station_id" uuid NOT NULL,
        "to_station_id" uuid NOT NULL,
        "from_stop_order" integer NOT NULL,
        "to_stop_order" integer NOT NULL,
        "seat_count" smallint NOT NULL,
        "price_total" numeric(10,2) NOT NULL,
        "customer_name" varchar(255) NOT NULL,
        "document_number" varchar(128) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'confirmed',
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CHK_bookings_seat_count_range" CHECK ("seat_count" BETWEEN 1 AND 5),
        CONSTRAINT "CHK_bookings_from_stop_positive" CHECK ("from_stop_order" > 0),
        CONSTRAINT "CHK_bookings_to_stop_positive" CHECK ("to_stop_order" > 0),
        CONSTRAINT "CHK_bookings_stop_interval" CHECK ("from_stop_order" < "to_stop_order"),
        CONSTRAINT "CHK_bookings_price_total_non_negative" CHECK ("price_total" >= 0),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bookings_trip_id" FOREIGN KEY ("trip_id") REFERENCES "trips" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_bookings_from_station_id" FOREIGN KEY ("from_station_id") REFERENCES "stations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_bookings_to_station_id" FOREIGN KEY ("to_station_id") REFERENCES "stations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_trip_id" ON "bookings" ("trip_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_trip_interval" ON "bookings" ("trip_id", "from_stop_order", "to_stop_order")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_created_at" ON "bookings" ("created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "booking_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "seat_id" uuid NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CHK_booking_items_price_non_negative" CHECK ("price" >= 0),
        CONSTRAINT "UQ_booking_items_booking_seat" UNIQUE ("booking_id", "seat_id"),
        CONSTRAINT "PK_booking_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_booking_items_booking_id" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_booking_items_seat_id" FOREIGN KEY ("seat_id") REFERENCES "train_seats" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_items_seat_id" ON "booking_items" ("seat_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_items_seat_id"`);
    await queryRunner.query(`DROP TABLE "booking_items"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_trip_interval"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_trip_id"`);
    await queryRunner.query(`DROP TABLE "bookings"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_trips_service_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_trips_route_id"`);
    await queryRunner.query(`DROP TABLE "trips"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_route_stops_route_station_stop_order"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_route_stops_station_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_route_stops_route_id"`);
    await queryRunner.query(`DROP TABLE "route_stops"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_train_seats_train_id"`);
    await queryRunner.query(`DROP TABLE "train_seats"`);

    await queryRunner.query(`DROP TABLE "routes"`);
    await queryRunner.query(`DROP TABLE "trains"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_stations_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_stations_code"`);
    await queryRunner.query(`DROP TABLE "stations"`);
  }
}
