-- Clear existing data (optional, but common in dev)
TRUNCATE TABLE public.trip RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.ride_offer RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.ride_request RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.location RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.car RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.users RESTART IDENTITY CASCADE;

-- Seed users (explicit IDs for clarity)
INSERT INTO public.users (user_id, first_name, last_name, username, email, phone, password_hash, profile_photo_path, car_id, created_at)
VALUES
    (1, 'Marcus', 'Rivera', 'marcusrivera', 'marcus.rivera@byu.edu', '8015550001', crypt('ChangeMe123!', gen_salt('bf')), NULL, NULL, CURRENT_TIMESTAMP),
    (2, 'John',   'Doe',    'johndoe',      'john.doe@byu.edu',      '8015550002', crypt('ChangeMe123!', gen_salt('bf')), NULL, NULL, CURRENT_TIMESTAMP),
    (3, 'Jane',   'Doe',    'janedoe',      'jane.doe@byu.edu',      '8015550003', crypt('ChangeMe123!', gen_salt('bf')), NULL, NULL, CURRENT_TIMESTAMP);

-- Seed cars; user_id must match existing user rows
INSERT INTO public.car (car_id, user_id, make, model, color, year, license_plate)
VALUES
    (1, 1, 'Toyota', 'Camry', 'Blue', 2020, 'ABC123'),
    (2, 2, 'Honda',  'Civic', 'Red',  2019, 'XYZ987');

-- (Optional) link each user to their car via users.car_id
UPDATE public.users SET car_id = 1 WHERE user_id = 1;
UPDATE public.users SET car_id = 2 WHERE user_id = 2;

-- Ensure sequences are ahead of the seeded IDs
SELECT pg_catalog.setval('public.users_user_id_seq', (SELECT MAX(user_id) FROM public.users), true);
SELECT pg_catalog.setval('public.car_car_id_seq',    (SELECT MAX(car_id)  FROM public.car),  true);

-- Seed locations (explicit IDs for stable references)
INSERT INTO public.location (location_id, name, location_type, address, latitude, longitude)
VALUES
    (1, 'Heritage Halls', 'residential', '825 E Heritage Dr, Provo, UT', 40.2505, -111.64932),
    (2, 'The Village', 'residential', '602 E 600 N, Provo, UT', 40.2570, -111.65723),
    (3, 'RB Parking Lot', 'campus', '1111 N 900 E, Provo, UT', 40.2481, -111.65194),
    (4, 'Tanner Building', 'campus', 'BYU Main Campus, Provo, UT', 40.2508, -111.65275),
    (5, 'Wilkinson Center', 'campus', '1060 WSC, Provo, UT', 40.2486, -111.64606),
    (6, 'Marriott Center', 'campus', '700 E University Pkwy, Provo, UT', 40.2549, -111.64937),
    (7, 'Liberty Square', 'residential', '556 N 400 E, Provo, UT', 40.2435, -111.65088),
    (8, 'Old Academy', 'residential', '450 N 400 E, Provo, UT', 40.2421, -111.65079),
    (9, 'King Henry', 'residential', '1130 E 450 N, Provo, UT', 40.2431, -111.6378),
    (10, 'Helaman Halls', 'residential', '9448 Helaman Dr, Provo, UT', 40.2504, -111.66011),
    (11, 'The Provo MTC', 'campus', '2005 N 900 E, Provo, UT', 40.2638, -111.6431),
    (12, 'Glenwood Apartments', 'residential', '1565 N University Ave, Provo, UT', 40.2559, -111.6611),
    (13, 'Liberty on 8th', 'residential', '745 N 100 E, Provo, UT', 40.2464, -111.6568),
    (14, 'The Isles', 'residential', '650 N 300 E, Provo, UT', 40.2449, -111.6528),
    (15, 'LES Stadium Parking', 'campus', '1700 N Canyon Rd, Provo, UT', 40.2581, -111.6575);
    (16, 'Wyview Park', 'residential', '1990 N 40 W, Provo, UT', 40.2628, -111.6622);

-- Seed one-time ride offers (active)
INSERT INTO public.ride_offer (
  offer_id,
  user_id,
  from_location_id,
  to_location_id,
  departure_time,
  available_seats,
  notes,
  status,
  created_at
)
VALUES
  (1, 1, 1, 4, CURRENT_TIMESTAMP + INTERVAL '45 minutes', 3, 'Leaving soon — can pick up at the main entrance.', 'active', CURRENT_TIMESTAMP),
  (2, 2, 2, 5, CURRENT_TIMESTAMP + INTERVAL '1 hour 15 minutes', 2, 'No food in the car please.', 'active', CURRENT_TIMESTAMP),
  (3, 3, 1, 3, CURRENT_TIMESTAMP + INTERVAL '2 hours', 1, 'Quick ride to campus parking.', 'active', CURRENT_TIMESTAMP),
  (4, 1, 6, 1, CURRENT_TIMESTAMP + INTERVAL '3 hours', 2, 'After the game — flexible on exact time.', 'active', CURRENT_TIMESTAMP);

-- Ensure sequences are ahead of seeded IDs
SELECT pg_catalog.setval('public.location_location_id_seq', (SELECT MAX(location_id) FROM public.location), true);
SELECT pg_catalog.setval('public.ride_offer_offer_id_seq',  (SELECT MAX(offer_id)    FROM public.ride_offer), true);