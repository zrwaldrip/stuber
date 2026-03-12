-- Clear existing data (optional, but common in dev)
TRUNCATE TABLE public.car RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.users RESTART IDENTITY CASCADE;

-- Seed users (explicit IDs for clarity)
INSERT INTO public.users (user_id, first_name, last_name, email, phone, profile_photo_url, car_id, created_at)
VALUES
    (1, 'Marcus', 'Rivera', 'marcus.rivera@byu.edu', 8015550001, NULL, NULL, CURRENT_TIMESTAMP),
    (2, 'John',   'Doe',    'john.doe@byu.edu',      8015550002, NULL, NULL, CURRENT_TIMESTAMP),
    (3, 'Jane',   'Doe',    'jane.doe@byu.edu',      8015550003, NULL, NULL, CURRENT_TIMESTAMP);

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