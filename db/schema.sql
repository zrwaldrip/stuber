-- Dumped by pg_dump version 15.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 49769)
-- Name: car; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.car (
    car_id integer NOT NULL,
    user_id integer NOT NULL,
    make character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    color character varying(50),
    year integer,
    license_plate character varying(20) NOT NULL
);


ALTER TABLE public.car OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 49768)
-- Name: car_car_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.car_car_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.car_car_id_seq OWNER TO postgres;

--
-- TOC entry 3386 (class 0 OID 0)
-- Dependencies: 218
-- Name: car_car_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.car_car_id_seq OWNED BY public.car.car_id;


--
-- TOC entry 221 (class 1259 OID 49781)
-- Name: location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.location (
    location_id integer NOT NULL,
    name character varying(200) NOT NULL,
    location_type character varying(50) NOT NULL,
    address character varying(300) NOT NULL,
    latitude double precision,
    longitude double precision
);


ALTER TABLE public.location OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 49780)
-- Name: location_location_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.location_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.location_location_id_seq OWNER TO postgres;

--
-- TOC entry 3387 (class 0 OID 0)
-- Dependencies: 220
-- Name: location_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.location_location_id_seq OWNED BY public.location.location_id;


--
-- TOC entry 225 (class 1259 OID 49816)
-- Name: ride_offer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.ride_offer (
    offer_id integer NOT NULL,
    user_id integer NOT NULL,
    from_location_id integer NOT NULL,
    to_location_id integer NOT NULL,
    departure_time timestamp without time zone NOT NULL,
    available_seats integer NOT NULL,
    notes character varying(1000),
    status character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ride_offer OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 49815)
-- Name: ride_offer_offer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.ride_offer_offer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ride_offer_offer_id_seq OWNER TO postgres;

--
-- TOC entry 3388 (class 0 OID 0)
-- Dependencies: 224
-- Name: ride_offer_offer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ride_offer_offer_id_seq OWNED BY public.ride_offer.offer_id;


--
-- TOC entry 223 (class 1259 OID 49791)
-- Name: ride_request; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.ride_request (
    request_id integer NOT NULL,
    user_id integer NOT NULL,
    from_location_id integer NOT NULL,
    to_location_id integer NOT NULL,
    earliest_departure timestamp without time zone NOT NULL,
    latest_departure timestamp without time zone,
    seats_needed integer NOT NULL,
    notes character varying(1000),
    status character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ride_request OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 49790)
-- Name: ride_request_request_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.ride_request_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ride_request_request_id_seq OWNER TO postgres;

--
-- TOC entry 3389 (class 0 OID 0)
-- Dependencies: 222
-- Name: ride_request_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ride_request_request_id_seq OWNED BY public.ride_request.request_id;


--
-- TOC entry 217 (class 1259 OID 49755)
-- Name: student_verification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.student_verification (
    verification_id integer NOT NULL,
    user_id integer NOT NULL,
    byu_id character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    verified_at timestamp without time zone
);


ALTER TABLE public.student_verification OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 49754)
-- Name: student_verification_verification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.student_verification_verification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_verification_verification_id_seq OWNER TO postgres;

--
-- TOC entry 3390 (class 0 OID 0)
-- Dependencies: 216
-- Name: student_verification_verification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_verification_verification_id_seq OWNED BY public.student_verification.verification_id;


--
-- TOC entry 227 (class 1259 OID 49841)
-- Name: trip; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.trip (
    trip_id integer NOT NULL,
    offer_id integer NOT NULL,
    request_id integer NOT NULL,
    confirmed_time timestamp without time zone,
    seats_confirmed integer NOT NULL,
    status character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.trip OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 49840)
-- Name: trip_trip_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.trip_trip_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.trip_trip_id_seq OWNER TO postgres;

--
-- TOC entry 3391 (class 0 OID 0)
-- Dependencies: 226
-- Name: trip_trip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trip_trip_id_seq OWNED BY public.trip.trip_id;


--
-- TOC entry 215 (class 1259 OID 49745)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.users (
    user_id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone integer NOT NULL,
    profile_photo_url character varying(255),
    car_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 214 (class 1259 OID 49744)
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_user_id_seq OWNER TO postgres;

--
-- TOC entry 3392 (class 0 OID 0)
-- Dependencies: 214
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- TOC entry 3207 (class 2604 OID 49772)
-- Name: car car_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.car ALTER COLUMN car_id SET DEFAULT nextval('public.car_car_id_seq'::regclass);


--
-- TOC entry 3208 (class 2604 OID 49784)
-- Name: location location_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location ALTER COLUMN location_id SET DEFAULT nextval('public.location_location_id_seq'::regclass);


--
-- TOC entry 3211 (class 2604 OID 49819)
-- Name: ride_offer offer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ride_offer ALTER COLUMN offer_id SET DEFAULT nextval('public.ride_offer_offer_id_seq'::regclass);


--
-- TOC entry 3209 (class 2604 OID 49794)
-- Name: ride_request request_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ride_request ALTER COLUMN request_id SET DEFAULT nextval('public.ride_request_request_id_seq'::regclass);


--
-- TOC entry 3205 (class 2604 OID 49758)
-- Name: student_verification verification_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_verification ALTER COLUMN verification_id SET DEFAULT nextval('public.student_verification_verification_id_seq'::regclass);


--
-- TOC entry 3213 (class 2604 OID 49844)
-- Name: trip trip_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip ALTER COLUMN trip_id SET DEFAULT nextval('public.trip_trip_id_seq'::regclass);


--
-- TOC entry 3203 (class 2604 OID 49748)
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- TOC entry 3220 (class 2606 OID 49774)
-- Name: car car_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.car
    ADD CONSTRAINT car_pkey PRIMARY KEY (car_id);


--
-- TOC entry 3222 (class 2606 OID 49788)
-- Name: location location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_pkey PRIMARY KEY (location_id);


--
-- TOC entry 3226 (class 2606 OID 49824)
-- Name: ride_offer ride_offer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ride_offer
    ADD CONSTRAINT ride_offer_pkey PRIMARY KEY (offer_id);


--
-- TOC entry 3224 (class 2606 OID 49799)
-- Name: ride_request ride_request_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ride_request
    ADD CONSTRAINT ride_request_pkey PRIMARY KEY (request_id);


--
-- TOC entry 3218 (class 2606 OID 49761)
-- Name: student_verification student_verification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_verification
    ADD CONSTRAINT student_verification_pkey PRIMARY KEY (verification_id);


--
-- TOC entry 3228 (class 2606 OID 49847)
-- Name: trip trip_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip
    ADD CONSTRAINT trip_pkey PRIMARY KEY (trip_id);


--
-- TOC entry 3216 (class 2606 OID 49753)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 3230 (class 2606 OID 49775)
-- Name: car car_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.car
    ADD CONSTRAINT car_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3234 (class 2606 OID 49830)
-- Name: ride_offer ride_offer_from_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ride_offer
    ADD CONSTRAINT ride_offer_from_location_id_fkey FOREIGN KEY (from_location_id) REFERENCES public.location(location_id);


--
-- TOC entry 3235 (class 2606 OID 49835)
-- Name: ride_offer ride_offer_to_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ride_offer
    ADD CONSTRAINT ride_offer_to_location_id_fkey FOREIGN KEY (to_location_id) REFERENCES public.location(location_id);


--
-- TOC entry 3236 (class 2606 OID 49825)
-- Name: ride_offer ride_offer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ride_offer
    ADD CONSTRAINT ride_offer_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3231 (class 2606 OID 49805)
-- Name: ride_request ride_request_from_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ride_request
    ADD CONSTRAINT ride_request_from_location_id_fkey FOREIGN KEY (from_location_id) REFERENCES public.location(location_id);


--
-- TOC entry 3232 (class 2606 OID 49810)
-- Name: ride_request ride_request_to_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ride_request
    ADD CONSTRAINT ride_request_to_location_id_fkey FOREIGN KEY (to_location_id) REFERENCES public.location(location_id);


--
-- TOC entry 3233 (class 2606 OID 49800)
-- Name: ride_request ride_request_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ride_request
    ADD CONSTRAINT ride_request_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3229 (class 2606 OID 49762)
-- Name: student_verification student_verification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_verification
    ADD CONSTRAINT student_verification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3237 (class 2606 OID 49848)
-- Name: trip trip_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip
    ADD CONSTRAINT trip_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.ride_offer(offer_id);


--
-- TOC entry 3238 (class 2606 OID 49853)
-- Name: trip trip_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip
    ADD CONSTRAINT trip_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.ride_request(request_id);
