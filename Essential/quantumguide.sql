--
-- PostgreSQL database dump
--

\restrict Twn7tA0HlgfHhodKZ5rFP0DJnSC0yfA6QVDBLWlDZnMf8IebEYTGRmqgGYZ1NZl

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

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

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    user_role character varying(50),
    action character varying(100) NOT NULL,
    method character varying(10) NOT NULL,
    endpoint character varying(255) NOT NULL,
    ip_address character varying(45),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: guide; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guide (
    id integer NOT NULL,
    group_id integer NOT NULL,
    title character varying(255) NOT NULL,
    function_desc text,
    important_note text,
    video_url text,
    video_description text,
    viewcount integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.guide OWNER TO postgres;

--
-- Name: guide_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guide_groups (
    id integer NOT NULL,
    type_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    group_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.guide_groups OWNER TO postgres;

--
-- Name: guide_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.guide_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.guide_groups_id_seq OWNER TO postgres;

--
-- Name: guide_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.guide_groups_id_seq OWNED BY public.guide_groups.id;


--
-- Name: guide_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.guide_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.guide_id_seq OWNER TO postgres;

--
-- Name: guide_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.guide_id_seq OWNED BY public.guide.id;


--
-- Name: guide_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guide_steps (
    id integer NOT NULL,
    guide_id integer NOT NULL,
    step_order integer NOT NULL,
    step_description text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.guide_steps OWNER TO postgres;

--
-- Name: guide_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.guide_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.guide_steps_id_seq OWNER TO postgres;

--
-- Name: guide_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.guide_steps_id_seq OWNED BY public.guide_steps.id;


--
-- Name: parent_slugs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parent_slugs (
    id integer NOT NULL,
    slug character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.parent_slugs OWNER TO postgres;

--
-- Name: parent_slugs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parent_slugs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parent_slugs_id_seq OWNER TO postgres;

--
-- Name: parent_slugs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parent_slugs_id_seq OWNED BY public.parent_slugs.id;


--
-- Name: type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    image_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    parent_slug_id integer NOT NULL
);


ALTER TABLE public.type OWNER TO postgres;

--
-- Name: type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.type_id_seq OWNER TO postgres;

--
-- Name: type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_id_seq OWNED BY public.type.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    token_version integer DEFAULT 0
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: guide id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide ALTER COLUMN id SET DEFAULT nextval('public.guide_id_seq'::regclass);


--
-- Name: guide_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide_groups ALTER COLUMN id SET DEFAULT nextval('public.guide_groups_id_seq'::regclass);


--
-- Name: guide_steps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide_steps ALTER COLUMN id SET DEFAULT nextval('public.guide_steps_id_seq'::regclass);


--
-- Name: parent_slugs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_slugs ALTER COLUMN id SET DEFAULT nextval('public.parent_slugs_id_seq'::regclass);


--
-- Name: type id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type ALTER COLUMN id SET DEFAULT nextval('public.type_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: job; Type: TABLE DATA; Schema: cron; Owner: postgres
--

COPY cron.job (jobid, schedule, command, nodename, nodeport, database, username, active, jobname) FROM stdin;
1	0 0 * * 0	DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '7 days';	localhost	5432	quantumguide	postgres	t	delete-old-logs-job
\.


--
-- Data for Name: job_run_details; Type: TABLE DATA; Schema: cron; Owner: postgres
--

COPY cron.job_run_details (jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time) FROM stdin;
\.


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, user_id, user_role, action, method, endpoint, ip_address, created_at) FROM stdin;
1	3	ITAdmin	Create Guide baru: "test" (ID: 55)	POST	/api/guides	::ffff:127.0.0.1	2026-10-27 16:59:21.741568
2	3	ITAdmin	View Guide: "test" (ID: 55)	POST	/api/guides/55/view	::ffff:127.0.0.1	2026-10-27 16:59:45.22265
3	3	ITAdmin	Delete Guide: "test" (ID: 55)	DELETE	/api/guides/55	::ffff:127.0.0.1	2026-10-27 16:59:49.014148
4	3	ITAdmin	View Guide: "test" (ID: 54)	POST	/api/guides/54/view	::ffff:127.0.0.1	2026-10-27 16:59:50.667833
5	3	ITAdmin	Update Guide: "test" menjadi "testfwdsef" (ID: 54)	PUT	/api/guides/54	::ffff:127.0.0.1	2026-10-27 16:59:55.010263
6	3	ITAdmin	View Guide: "testfwdsef" (ID: 54)	POST	/api/guides/54/view	::ffff:127.0.0.1	2026-10-27 16:59:55.047879
7	3	ITAdmin	Delete Guide: "testfwdsef" (ID: 54)	DELETE	/api/guides/54	::ffff:127.0.0.1	2026-10-27 16:59:58.161559
8	3	ITAdmin	Create Group baru: "test" (ID: 19)	POST	/api/groups	::ffff:127.0.0.1	2026-10-27 17:23:34.277798
9	3	ITAdmin	Delete Group: "test" (ID: 19)	DELETE	/api/groups/19	::ffff:127.0.0.1	2026-10-28 08:32:33.438986
10	4	user	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:127.0.0.1	2026-10-28 10:34:01.923326
11	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:127.0.0.1	2026-10-28 10:40:01.322212
12	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:127.0.0.1	2026-10-28 10:40:11.010367
13	3	ITAdmin	View Guide: "Login" (ID: 42)	POST	/api/guides/42/view	::ffff:127.0.0.1	2026-10-28 11:47:19.963961
14	3	ITAdmin	Create Group baru: "test" (ID: 20)	POST	/api/groups	::ffff:127.0.0.1	2026-10-28 11:47:36.28077
15	3	ITAdmin	Create Guide baru: "test" (ID: 56)	POST	/api/guides	::ffff:127.0.0.1	2026-10-28 11:47:45.335355
16	3	ITAdmin	View Guide: "test" (ID: 56)	POST	/api/guides/56/view	::ffff:127.0.0.1	2026-10-28 11:47:46.769295
17	3	ITAdmin	Update Guide: "test" menjadi "testdawdawd" (ID: 56)	PUT	/api/guides/56	::ffff:127.0.0.1	2026-10-28 11:47:49.575543
18	3	ITAdmin	View Guide: "testdawdawd" (ID: 56)	POST	/api/guides/56/view	::ffff:127.0.0.1	2026-10-28 11:47:49.615849
19	3	ITAdmin	Delete Guide: "testdawdawd" (ID: 56)	DELETE	/api/guides/56	::ffff:127.0.0.1	2026-10-28 11:47:53.690627
20	3	ITAdmin	Delete Group: "test" (ID: 20)	DELETE	/api/groups/20	::ffff:127.0.0.1	2026-10-28 11:47:58.76857
21	4	user	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	::ffff:127.0.0.1	2026-10-28 13:43:48.670386
22	4	user	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:127.0.0.1	2026-10-28 14:49:42.659115
23	4	user	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	::ffff:127.0.0.1	2026-10-28 14:49:45.943388
24	4	user	View Guide: "Create Work Order Manual IKR" (ID: 18)	POST	/api/guides/18/view	::ffff:127.0.0.1	2026-10-28 14:49:59.450604
25	4	user	View Guide: "Create Team Backbone" (ID: 16)	POST	/api/guides/16/view	::ffff:127.0.0.1	2026-10-28 14:51:12.487553
26	4	user	View Guide: "Create Team Backbone" (ID: 16)	POST	/api/guides/16/view	::ffff:127.0.0.1	2026-10-28 14:51:36.432935
27	4	user	View Guide: "Create Team Backbone" (ID: 16)	POST	/api/guides/16/view	::ffff:127.0.0.1	2026-10-28 14:53:01.760952
28	3	ITAdmin	View Guide: "Monitoring Work Order IKR" (ID: 23)	POST	/api/guides/23/view	::ffff:127.0.0.1	2026-10-30 08:54:52.462288
29	3	ITAdmin	View Guide: "Create Team IKR" (ID: 15)	POST	/api/guides/15/view	::ffff:127.0.0.1	2026-10-30 09:22:56.074702
30	3	ITAdmin	View Guide: "Create Work Order Manual IKR" (ID: 18)	POST	/api/guides/18/view	::ffff:127.0.0.1	2026-10-30 09:23:07.113753
31	3	ITAdmin	View Guide: "Create Team IKR" (ID: 15)	POST	/api/guides/15/view	::ffff:127.0.0.1	2026-10-30 09:24:07.065461
32	3	ITAdmin	View Guide: "Create Work Order Manual IKR" (ID: 18)	POST	/api/guides/18/view	::ffff:192.168.11.144	2026-10-30 09:59:13.299226
33	4	user	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	::ffff:127.0.0.1	2026-10-30 09:59:54.266974
34	6	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:127.0.0.1	2026-10-30 10:01:11.704014
35	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:192.168.11.144	2026-10-30 10:02:14.433221
36	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:192.168.11.144	2026-10-30 10:02:58.535039
37	3	ITAdmin	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	::ffff:192.168.11.144	2026-10-30 10:03:17.953124
38	3	ITAdmin	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	::ffff:192.168.11.144	2026-10-30 10:03:28.559252
39	6	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:127.0.0.1	2026-10-30 10:07:18.934594
40	3	ITAdmin	View Guide: "Create Team IKR" (ID: 15)	POST	/api/guides/15/view	::ffff:127.0.0.1	2026-10-30 10:54:17.745229
41	3	ITAdmin	View Guide: "Create Team IKR" (ID: 15)	POST	/api/guides/15/view	::ffff:127.0.0.1	2026-10-30 11:36:20.525354
42	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:192.168.7.203	2026-10-30 11:46:43.227401
43	3	ITAdmin	View Guide: "Create & Assign Material ke Tim" (ID: 26)	POST	/api/guides/26/view	::ffff:192.168.7.203	2026-10-30 11:46:52.483763
44	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:100.89.127.114	2026-11-02 11:43:11.863296
45	3	ITAdmin	View Guide: "Monitoring Work Order IKR" (ID: 23)	POST	/api/guides/23/view	::ffff:100.89.127.114	2026-11-02 11:43:17.525182
46	3	ITAdmin	Create Group baru: "test" (ID: 21)	POST	/api/groups	::ffff:100.89.127.114	2026-11-02 11:43:43.100653
47	3	ITAdmin	Create Guide baru: "test" (ID: 57)	POST	/api/guides	::ffff:100.89.127.114	2026-11-02 11:44:19.39252
48	3	ITAdmin	View Guide: "test" (ID: 57)	POST	/api/guides/57/view	::ffff:100.89.127.114	2026-11-02 11:44:20.992575
49	3	ITAdmin	Update Guide: "test" menjadi "testa" (ID: 57)	PUT	/api/guides/57	::ffff:100.89.127.114	2026-11-02 11:45:19.978541
50	3	ITAdmin	View Guide: "testa" (ID: 57)	POST	/api/guides/57/view	::ffff:100.89.127.114	2026-11-02 11:45:20.056565
51	3	ITAdmin	Delete Guide: "testa" (ID: 57)	DELETE	/api/guides/57	::ffff:100.89.127.114	2026-11-02 11:45:35.963359
52	3	ITAdmin	Delete Group: "test" (ID: 21)	DELETE	/api/groups/21	::ffff:100.89.127.114	2026-11-02 11:46:07.100914
53	3	ITAdmin	View Guide: "Absen Keluar" (ID: 52)	POST	/api/guides/52/view	100.89.127.114	2026-11-02 13:00:47.030869
54	3	ITAdmin	View Guide: "Login" (ID: 42)	POST	/api/guides/42/view	100.89.127.114	2026-11-02 13:00:52.762988
55	3	ITAdmin	Create Guide baru: "test" (ID: 58)	POST	/api/guides	100.89.127.114	2026-11-02 13:14:52.643675
56	3	ITAdmin	View Guide: "test" (ID: 58)	POST	/api/guides/58/view	100.89.127.114	2026-11-02 13:14:54.66853
57	3	ITAdmin	Update Guide: "test" menjadi "testtest" (ID: 58)	PUT	/api/guides/58	100.89.127.114	2026-11-02 13:16:36.743157
58	3	ITAdmin	View Guide: "testtest" (ID: 58)	POST	/api/guides/58/view	100.89.127.114	2026-11-02 13:16:37.065752
59	3	ITAdmin	Delete Guide: "testtest" (ID: 58)	DELETE	/api/guides/58	100.89.127.114	2026-11-02 13:17:00.741523
60	4	user	View Guide: "Stock Material" (ID: 31)	POST	/api/guides/31/view	100.89.127.114	2026-11-02 13:20:08.627846
61	4	user	View Guide: "Download foto Backbone" (ID: 37)	POST	/api/guides/37/view	100.89.127.114	2026-11-02 13:45:24.293483
62	4	user	View Guide: "Download foto Backbone" (ID: 37)	POST	/api/guides/37/view	100.89.127.114	2026-11-02 13:45:26.90542
63	4	user	View Guide: "Assign Work Order IKR" (ID: 2)	POST	/api/guides/2/view	100.89.127.114	2026-11-02 13:45:33.150142
64	4	user	View Guide: "Stock Material" (ID: 31)	POST	/api/guides/31/view	100.89.127.114	2026-11-02 13:45:56.821614
65	4	user	View Guide: "Stock Material" (ID: 31)	POST	/api/guides/31/view	100.89.127.114	2026-11-02 13:46:05.435433
66	3	ITAdmin	View Guide: "Create Work Order Manual IKR" (ID: 18)	POST	/api/guides/18/view	100.89.127.114	2026-11-02 13:46:34.83369
67	3	ITAdmin	View Guide: "Create Team Backbone" (ID: 16)	POST	/api/guides/16/view	100.89.127.114	2026-11-02 13:50:26.469992
68	3	ITAdmin	View Guide: "Create Team IKR" (ID: 15)	POST	/api/guides/15/view	100.89.127.114	2026-11-02 13:50:36.466187
69	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	100.89.127.114	2026-11-02 14:51:23.952388
70	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	100.89.127.114	2026-11-02 14:51:49.909346
71	3	ITAdmin	View Guide: "Material Return" (ID: 28)	POST	/api/guides/28/view	100.89.127.114	2026-11-02 14:51:57.055531
72	3	ITAdmin	View Guide: "Daftarkan Motor" (ID: 32)	POST	/api/guides/32/view	100.89.127.114	2026-11-02 15:20:08.721843
73	3	ITAdmin	View Guide: "Download Kamera Timestamp" (ID: 47)	POST	/api/guides/47/view	100.89.127.114	2026-11-02 15:20:26.664999
74	3	ITAdmin	View Guide: "Download Kamera Geotag" (ID: 48)	POST	/api/guides/48/view	100.89.127.114	2026-11-02 15:52:14.421053
75	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	100.114.9.52	2026-11-02 17:29:03.637052
76	3	ITAdmin	View Guide: "Create Team IKR" (ID: 15)	POST	/api/guides/15/view	100.114.9.52	2026-11-02 17:29:14.149278
77	3	ITAdmin	View Guide: "Create Team IKR" (ID: 15)	POST	/api/guides/15/view	100.114.9.52	2026-11-02 17:31:10.488906
78	3	ITAdmin	View Guide: "Download Kamera Marki" (ID: 49)	POST	/api/guides/49/view	100.114.9.52	2026-11-02 17:32:33.716166
79	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	100.89.127.114	2026-11-03 10:24:56.764053
80	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	100.89.127.114	2026-11-03 10:25:01.233388
81	3	ITAdmin	Create Guide baru: "test" (ID: 59)	POST	/api/guides	100.89.127.114	2026-11-03 10:25:17.565969
82	3	ITAdmin	View Guide: "test" (ID: 59)	POST	/api/guides/59/view	100.89.127.114	2026-11-03 10:25:19.330344
83	3	ITAdmin	Update Guide: "test" menjadi "testse" (ID: 59)	PUT	/api/guides/59	100.89.127.114	2026-11-03 10:25:26.766612
84	3	ITAdmin	View Guide: "testse" (ID: 59)	POST	/api/guides/59/view	100.89.127.114	2026-11-03 10:25:26.874015
85	3	ITAdmin	Delete Guide: "testse" (ID: 59)	DELETE	/api/guides/59	100.89.127.114	2026-11-03 10:25:38.418143
86	3	ITAdmin	Create Guide baru: "test" (ID: 60)	POST	/api/guides	100.89.127.114	2026-11-03 10:25:54.424558
87	3	ITAdmin	View Guide: "test" (ID: 60)	POST	/api/guides/60/view	100.89.127.114	2026-11-03 10:25:55.534922
88	3	ITAdmin	Create Group baru: "test" (ID: 22)	POST	/api/groups	100.89.127.114	2026-11-03 10:29:51.483981
89	3	ITAdmin	Delete Group: "test" (ID: 22)	DELETE	/api/groups/22	100.89.127.114	2026-11-03 10:29:54.167218
90	3	ITAdmin	Create Group baru: "test" (ID: 23)	POST	/api/groups	100.89.127.114	2026-11-03 10:29:58.06548
91	3	ITAdmin	Create Guide baru: "test" (ID: 61)	POST	/api/guides	100.89.127.114	2026-11-03 10:30:16.963841
92	3	ITAdmin	View Guide: "test" (ID: 61)	POST	/api/guides/61/view	100.89.127.114	2026-11-03 10:30:18.109325
93	3	ITAdmin	Delete Guide: "test" (ID: 61)	DELETE	/api/guides/61	100.89.127.114	2026-11-03 10:30:22.737339
94	3	ITAdmin	Create Guide baru: "test" (ID: 62)	POST	/api/guides	100.89.127.114	2026-11-03 10:35:17.610426
95	3	ITAdmin	View Guide: "test" (ID: 62)	POST	/api/guides/62/view	100.89.127.114	2026-11-03 10:35:18.943885
96	3	ITAdmin	Delete Guide: "test" (ID: 62)	DELETE	/api/guides/62	100.89.127.114	2026-11-03 10:35:28.576263
97	3	ITAdmin	Create Guide baru: "test" (ID: 63)	POST	/api/guides	100.89.127.114	2026-11-03 10:37:17.105761
98	3	ITAdmin	View Guide: "test" (ID: 63)	POST	/api/guides/63/view	100.89.127.114	2026-11-03 10:37:18.43492
99	3	ITAdmin	View Guide: "test" (ID: 63)	POST	/api/guides/63/view	100.89.127.114	2026-11-03 10:37:29.58599
100	3	ITAdmin	Delete Guide: "test" (ID: 63)	DELETE	/api/guides/63	100.89.127.114	2026-11-03 10:37:33.021266
101	3	ITAdmin	Delete Group: "test" (ID: 23)	DELETE	/api/groups/23	100.89.127.114	2026-11-03 10:44:26.759461
102	3	ITAdmin	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	100.89.127.114	2026-11-03 12:06:49.121104
103	3	ITAdmin	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	100.89.127.114	2026-11-04 15:17:11.441684
104	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	100.89.127.114	2026-11-04 15:17:19.240742
105	3	ITAdmin	View Guide: "Create Work Order Manual IKR" (ID: 18)	POST	/api/guides/18/view	100.89.127.114	2026-11-04 15:17:33.795876
106	3	ITAdmin	View Guide: "Daftarkan Motor" (ID: 32)	POST	/api/guides/32/view	100.89.127.114	2026-11-04 15:20:23.103662
107	3	ITAdmin	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	100.89.127.114	2026-11-04 15:20:43.708916
108	3	ITAdmin	View Guide: "Assign Work Order Backbone" (ID: 21)	POST	/api/guides/21/view	100.89.127.114	2026-11-04 15:20:51.341211
109	3	ITAdmin	View Guide: "Download foto Backbone" (ID: 37)	POST	/api/guides/37/view	100.89.127.114	2026-11-04 15:21:04.231149
110	3	ITAdmin	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	100.89.127.114	2026-11-04 15:21:14.362197
111	3	ITAdmin	Update Type: "HRIS" menjadi "HRIS" (ID: 9)	PUT	/api/types/9	100.89.127.114	2026-11-04 15:45:11.502454
112	3	ITAdmin	Update Type: "HRIS" menjadi "HRIS" (ID: 9)	PUT	/api/types/9	100.89.127.114	2026-11-04 15:47:43.228623
113	3	ITAdmin	Update Type: "HRIS" menjadi "HRIS" (ID: 9)	PUT	/api/types/9	100.89.127.114	2026-11-04 15:48:22.916311
114	3	ITAdmin	Create Group baru: "Start" (ID: 24)	POST	/api/groups	100.89.127.114	2026-11-04 15:51:58.396911
115	3	ITAdmin	Update Type: "Heatmap" menjadi "Heatmap" (ID: 5)	PUT	/api/types/5	100.89.127.114	2026-11-04 16:06:27.507224
116	3	ITAdmin	Update Type: "Heatmap" menjadi "Heatmap" (ID: 5)	PUT	/api/types/5	100.89.127.114	2026-11-04 16:31:20.95864
117	3	ITAdmin	Create Type baru: Email (ID: 10)	POST	/api/types	100.89.127.114	2026-11-04 16:53:13.012857
118	3	ITAdmin	Delete Type: "Email" (ID: 10)	DELETE	/api/types/10	100.89.127.114	2026-11-04 16:53:29.437722
119	3	ITAdmin	Create Type baru: Email (ID: 11)	POST	/api/types	100.89.127.114	2026-11-04 16:53:34.787097
120	3	ITAdmin	Delete Type: "Email" (ID: 11)	DELETE	/api/types/11	100.89.127.114	2026-11-04 17:01:39.918261
121	3	ITAdmin	Create Type baru: Email (ID: 12)	POST	/api/types	100.89.127.114	2026-11-04 17:01:46.818984
122	3	ITAdmin	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	100.89.127.114	2026-11-06 15:35:34.449809
123	3	ITAdmin	View Guide: "Login" (ID: 5)	POST	/api/guides/5/view	::ffff:100.89.127.114	2026-11-09 16:17:38.903589
124	3	ITAdmin	Create Group baru: "test" (ID: 25)	POST	/api/groups	100.89.127.114	2026-11-10 14:15:46.798135
125	3	ITAdmin	Delete Group: "test" (ID: 25)	DELETE	/api/groups/25	100.89.127.114	2026-11-10 14:16:17.734905
126	3	ITAdmin	View Guide: "test" (ID: 60)	POST	/api/guides/60/view	100.89.127.114	2026-11-10 17:07:52.896038
127	3	ITAdmin	Delete Guide: "test" (ID: 60)	DELETE	/api/guides/60	100.89.127.114	2026-11-10 17:07:57.775542
128	3	ITAdmin	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	100.89.127.114	2026-11-11 09:51:22.782276
129	3	ITAdmin	View Guide: "Logout" (ID: 13)	POST	/api/guides/13/view	::ffff:100.89.127.114	2026-11-11 16:54:47.345926
\.


--
-- Data for Name: guide; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guide (id, group_id, title, function_desc, important_note, video_url, video_description, viewcount, created_at, updated_at) FROM stdin;
43	11	Logout	Memperlihatkan cara untuk mengeluarkan akun dari aplikasi OSS Mobile.	Kalau sebelumnya klik tombol 'Ingat Saya', username dan password dapat muncul kembali secara automatis.	/videos/oss_mobile/logout/1792997371495.mp4	\N	1	2026-10-26 13:49:31.508195+07	2026-10-27 13:57:10.099536+07
51	11	Absen Masuk	Memperlihatkan cara untuk absen masuk pada aplikasi OSS Mobile.	Untuk memakai absen masuk anda harus berada di tempat terang, dan tidak memakai atribut pakaian yang menutupi muka.	/videos/oss_mobile/absen_masuk/1793085873646.mp4	\N	2	2026-10-27 14:24:33.656516+07	2026-10-27 14:24:43.369397+07
17	1	Create Team Project	Panduan untuk membuat team yang akan digunakan dalam pengerjaan Work Order.	IKR, Backbone, Project merupakan tipe pekerjaan yang berbeda dan memerlukan tim yang berbeda juga	/videos/oss_web/create_team_project/1792562893649.mp4	\N	0	2026-10-21 13:08:13.665039+07	2026-10-23 11:01:23.838574+07
19	1	Create Work Order Manual Backbone	Panduan untuk membuat Work Order baru dengan mengisi data pekerjaan yang dibutuhkan.	Kolom berwarna merah merupakan kolom wajib. Kombinasi Client dan Type WO dapat menampilkan kolom tambahan.	/videos/oss_web/create_work_order_manual_backbone/1792563145009.mp4	\N	1	2026-10-21 13:12:25.018488+07	2026-10-23 11:01:23.838574+07
20	1	Create Work Order Manual Project	Panduan untuk membuat Work Order baru dengan mengisi data pekerjaan yang dibutuhkan.	Kolom berwarna merah merupakan kolom wajib. Kombinasi Client dan Type WO dapat menampilkan kolom tambahan.	/videos/oss_web/create_work_order_manual_project/1792563230387.mp4	\N	1	2026-10-21 13:13:50.404244+07	2026-10-23 11:01:23.838574+07
30	8	Material Collect	Panduan untuk memantau pengambilan material.	Menu monitoring Material Collect.	/videos/oss_web/material_collect/1792565024561.mp4	\N	0	2026-10-21 13:43:44.57635+07	2026-10-23 11:01:23.838574+07
22	2	Assign Work Order Project	Panduan untuk melakukan assign teknisi pada Work Order Project.	Gunakan filter untuk menemukan Work Order yang ingin diproses. Tombol reset digunakan untuk menghapus isi filter.	/videos/oss_web/assign_work_order_project/1792564037066.mp4	\N	0	2026-10-21 13:27:17.07531+07	2026-10-23 11:01:23.838574+07
24	2	Monitoring Work Order Backbone	Panduan untuk mencari Work Order dan melihat detail serta progress atau aktivitas pekerjaan.	Detail progress atau aktivitas dapat dilihat dari halaman detail Work Order setelah Work Order ditemukan.	/videos/oss_web/monitoring_work_order_backbone/1792564341317.mp4	\N	0	2026-10-21 13:32:21.325742+07	2026-10-23 11:01:23.838574+07
25	2	Monitoring Work Order Project	Panduan untuk mencari Work Order dan melihat detail serta progress atau aktivitas pekerjaan.	Detail progress atau aktivitas dapat dilihat dari halaman detail Work Order setelah Work Order ditemukan.	/videos/oss_web/monitoring_work_order_project/1792564404699.mp4	\N	0	2026-10-21 13:33:24.709721+07	2026-10-23 11:01:23.838574+07
29	8	Material Transfer	Panduan untuk mencatat perpindahan atau transfer material dan melakukan proses konfirmasi.	Pastikan material yang akan ditransfer sudah ditemukan melalui filter dan dipilih sebelum membuat data transfer.	/videos/oss_web/material_transfer/1792564932357.mp4	\N	1	2026-10-21 13:42:12.368319+07	2026-10-23 11:01:23.838574+07
27	8	Material In	Panduan untuk mencatat material yang masuk ke aplikasi beserta bukti penerimaannya.	Bukti material diterima perlu disiapkan dalam bentuk foto atau PDF.	/videos/oss_web/material_in/1792564647031.mp4	\N	0	2026-10-21 13:37:27.042359+07	2026-10-23 11:01:23.838574+07
23	2	Monitoring Work Order IKR	Panduan untuk mencari Work Order dan melihat detail serta progress atau aktivitas pekerjaan.	Detail progress atau aktivitas dapat dilihat dari halaman detail Work Order setelah Work Order ditemukan.	/videos/oss_web/monitoring_work_order_ikr/1792564221110.mp4	\N	3	2026-10-21 13:30:21.120379+07	2026-11-02 11:43:17.520166+07
52	11	Absen Keluar	Memperlihatkan cara untuk absen keluar pada aplikasi OSS Mobile.		/videos/oss_mobile/absen_keluar/1793086654612.mp4	\N	1	2026-10-27 14:37:34.624177+07	2026-11-02 13:00:47.022708+07
42	11	Login	Memperlihatkan cara untuk masuk ke OSS Mobile menggunakan akun HRIS.	Menekan tombol 'Ingat Saya' akan secara automatis mengisi username dan password akun ketika anda kembali masuk ke aplikasi.	/videos/oss_mobile/login/1792997137828.mp4	\N	5	2026-10-26 13:45:37.845808+07	2026-11-02 13:00:52.759741+07
31	8	Stock Material	Panduan untuk stok material.	Menu monitoring Stok material.	/videos/oss_web/stock_material/1792565149238.mp4	\N	3	2026-10-21 13:45:49.247566+07	2026-11-02 13:46:05.433136+07
2	2	Assign Work Order IKR	Panduan untuk melakukan assign teknisi pada Work Order IKR.	Gunakan filter untuk menemukan Work Order yang ingin diproses. Tombol reset digunakan untuk menghapus isi filter.	/videos/oss_web/assign_work_order_ikr/1792563718670.mp4	Video penjelasan perbaikan login VPN.	55	2026-10-20 16:48:31.387545+07	2026-11-02 13:45:33.147617+07
13	10	Logout	Panduan untuk keluar dari akun OSS Web.	Pastikan ingat password untuk kembali masuk ke akun anda.	/videos/oss_web/logout/1792562586629.mp4	\N	20	2026-10-21 11:46:59.11144+07	2026-11-11 16:54:47.34137+07
16	1	Create Team Backbone	Panduan untuk membuat team yang akan digunakan dalam pengerjaan Work Order.	IKR, Backbone, Project merupakan tipe pekerjaan yang berbeda dan memerlukan tim yang berbeda juga	/videos/oss_web/create_team_backbone/1792562814724.mp4	\N	5	2026-10-21 13:06:54.742675+07	2026-11-02 13:50:26.465576+07
15	1	Create Team IKR	Panduan untuk membuat team yang akan digunakan dalam pengerjaan Work Order IKR.	IKR, Backbone, Project merupakan tipe pekerjaan yang berbeda dan memerlukan tim yang berbeda juga	/videos/oss_web/create_team_ikr/1792562722163.mp4	\N	9	2026-10-21 13:05:22.175774+07	2026-11-02 17:31:10.483419+07
28	8	Material Return	Panduan untuk mencatat material yang dikembalikan ke klien, melihat riwayat return, dan melakukan konfirmasi.	Gunakan rentang waktu atau nomor dokumen untuk menemukan data material return secara lebih spesifik.	/videos/oss_web/material_return/1792564801270.mp4	\N	1	2026-10-21 13:40:01.28179+07	2026-11-02 14:51:57.050835+07
47	11	Download Kamera Timestamp	Panduan untuk mengunduh aplikasi kamera Timestamp	Timestamp harus di download untuk melakukan absen dan mengerjakan work order.	/videos/oss_mobile/download_kamera_timestamp/1792998863439.mp4	\N	2	2026-10-26 14:14:23.461485+07	2026-11-02 15:20:26.660266+07
49	11	Download Kamera Marki	Panduan untuk mengunduh aplikasi kamera Marki	Beberapa klien mengharuskan dokumentasi Work Order menggunakan aplikasi Marki	/videos/oss_mobile/downloa_kamera_marki/1792999169937.mp4	\N	10	2026-10-26 14:18:55.007606+07	2026-11-02 17:32:33.710663+07
18	1	Create Work Order Manual IKR	Panduan untuk membuat Work Order baru dengan mengisi data pekerjaan yang dibutuhkan.	Kolom berwarna merah merupakan kolom wajib. Kombinasi Client dan Type WO dapat menampilkan kolom tambahan.	/videos/oss_web/create_work_order_manual_ikr/1792563047157.mp4	\N	5	2026-10-21 13:10:47.169921+07	2026-11-04 15:17:33.793279+07
21	2	Assign Work Order Backbone	Panduan untuk melakukan assign teknisi pada Work Order Backbone.	Gunakan filter untuk menemukan Work Order yang ingin diproses. Tombol reset digunakan untuk menghapus isi filter.	/videos/oss_web/assign_work_order_backbone/1792563797661.mp4	\N	2	2026-10-21 13:23:17.672137+07	2026-11-04 15:20:51.338961+07
37	2	Download foto Backbone	Panduan untuk download foto yang diambil oleh teknisi selama mengerjakan Work Order Backbone	-	/videos/oss_web/download_foto_backbone/1792746336715.mp4	\N	10	2026-10-23 16:04:40.381195+07	2026-11-04 15:21:04.228696+07
26	8	Create & Assign Material ke Tim	Panduan untuk membuat package material dari material yang tersedia pada stok & Assign kepada Tim Teknisi.	Material harus tersedia pada stok sebelum dipilih untuk dibuat menjadi package.	/videos/oss_web/create___assign_material_ke_tim/1792564581084.mp4	\N	1	2026-10-21 13:36:21.093362+07	2026-10-30 11:46:52.471444+07
36	2	Download foto IKR	Panduan untuk download foto yang diambil oleh teknisi selama mengerjakan Work Order IKR	-	/videos/oss_web/download_foto_ikr/1792746085372.mp4	\N	5	2026-10-23 15:58:51.442376+07	2026-10-23 16:01:25.631055+07
48	11	Download Kamera Geotag	Panduan untuk mengunduh aplikasi kamera Geotag	Beberapa klien mengharuskan dokumentasi Work Order menggunakan aplikasi Geotag	/videos/oss_mobile/download_kamera_geotag/1792999068995.mp4	\N	3	2026-10-26 14:17:49.02073+07	2026-11-02 15:52:14.416249+07
32	9	Daftarkan Motor	Mendaftarkan data motor ke website sehingga dapat dipakai ketika membuat Tim.	Pada bagian tabel Sewa Motor, pengguna dapat menggunakan dropdown dibagian atas tabel untuk filter / mencari data motor yang sudah terdaftar.	/videos/oss_web/daftarkan_motor/1792565349879.mp4	\N	3	2026-10-21 13:49:09.889825+07	2026-11-04 15:20:23.098618+07
5	10	Login	Panduan untuk masuk ke OSS Web dan mengenali halaman home serta menu aplikasi.	Pastikan memiliki akun HRIS yang aktif dan perangkat terhubung dengan internet sebelum menggunakan aplikasi.	/videos/oss_web/login/1792557172765.mp4	\N	31	2026-10-21 11:10:09.348755+07	2026-11-09 16:17:38.882858+07
\.


--
-- Data for Name: guide_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guide_groups (id, type_id, title, description, group_order, created_at, updated_at) FROM stdin;
10	1	Start	\N	1	2026-10-21 11:07:40.564123+07	2026-10-21 11:07:55.178109+07
1	1	Create	Langkah-langkah membuat akun VPN baru	2	2026-10-20 16:48:31.387545+07	2026-10-21 11:08:05.470046+07
2	1	Work Order	Penanganan kendala gagal koneksi VPN	3	2026-10-20 16:48:31.387545+07	2026-10-21 11:08:12.103783+07
8	1	Material	\N	4	2026-10-21 11:07:21.809464+07	2026-10-21 11:08:21.819599+07
11	2	Start		2	2026-10-21 16:24:33.254844+07	2026-10-21 16:24:33.254844+07
12	2	Work Order		2	2026-10-21 16:25:02.93252+07	2026-10-21 16:25:02.93252+07
13	2	Material		3	2026-10-21 16:25:11.405788+07	2026-10-21 16:25:11.405788+07
14	2	Forms		4	2026-10-21 16:25:24.595494+07	2026-10-21 16:25:24.595494+07
9	1	Motor		5	2026-10-21 11:07:25.707565+07	2026-10-23 16:53:47.008175+07
15	1	Verify Dispatch	testt	6	2026-10-21 16:29:45.326471+07	2026-10-26 10:22:16.500677+07
24	9	Start		1	2026-11-04 15:51:58.393653+07	2026-11-04 15:51:58.393653+07
\.


--
-- Data for Name: guide_steps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guide_steps (id, guide_id, step_order, step_description, created_at) FROM stdin;
250	49	1	Klik tombol 'kamera'	2026-10-27 11:07:00.81675+07
251	49	2	Klik tombol 'download' milik Marki	2026-10-27 11:07:00.81675+07
252	49	3	Klik tombol 'install'	2026-10-27 11:07:00.81675+07
253	49	4	Klik tombol 'buka'	2026-10-27 11:07:00.81675+07
260	51	1	Klik tombol 'Absensi'	2026-10-27 14:24:33.656516+07
261	51	2	Klik tombol 'Pilih Shift'	2026-10-27 14:24:33.656516+07
262	51	3	Pilih shift yang sesuai dengan jam kerja anda	2026-10-27 14:24:33.656516+07
263	51	4	Klik tombol "terapkan shift"	2026-10-27 14:24:33.656516+07
264	51	5	Klik tombol "Absen In"	2026-10-27 14:24:33.656516+07
265	51	6	Scan wajah anda dengan kamera depan	2026-10-27 14:24:33.656516+07
266	51	7	Klik tombol "submit"	2026-10-27 14:24:33.656516+07
43	13	1	Pergi ke halaman home OSS	2026-10-21 13:03:06.843413+07
44	13	2	Klik nama akun dibagian kanan atas	2026-10-21 13:03:06.843413+07
45	13	3	Klik tombol Sign Out	2026-10-21 13:03:06.843413+07
46	15	1	Buka menu.	2026-10-21 13:05:22.175774+07
47	15	2	Navigasi menu Operation -> Team -> IKR.	2026-10-21 13:05:22.175774+07
48	15	3	Isi data team sesuai kebutuhan, seperti tanggal, tipe team, status, cabang, teknisi, dan status motor.	2026-10-21 13:05:22.175774+07
49	15	4	Klik Reset jika ingin mengosongkan seluruh kolom.	2026-10-21 13:05:22.175774+07
50	15	5	Klik Create untuk membuat team.	2026-10-21 13:05:22.175774+07
51	16	1	Buka menu.	2026-10-21 13:06:54.742675+07
52	16	2	Navigasi menu Operation -> Team -> Backbone.	2026-10-21 13:06:54.742675+07
53	16	3	Isi data team sesuai kebutuhan, seperti tanggal, tipe team, status, region, cabang, teknisi.	2026-10-21 13:06:54.742675+07
54	16	4	Klik Reset jika ingin mengosongkan seluruh kolom.	2026-10-21 13:06:54.742675+07
55	16	5	Klik Create untuk membuat team.	2026-10-21 13:06:54.742675+07
56	17	1	Buka menu.	2026-10-21 13:08:13.665039+07
57	17	2	Navigasi menu Operation -> Team -> Project.	2026-10-21 13:08:13.665039+07
58	17	3	Isi data team sesuai kebutuhan, seperti tanggal, tipe team, status, region, cabang, teknisi.	2026-10-21 13:08:13.665039+07
59	17	4	Klik Reset jika ingin mengosongkan seluruh kolom.	2026-10-21 13:08:13.665039+07
60	17	5	Klik Create untuk membuat team.	2026-10-21 13:08:13.665039+07
61	18	1	Buka menu	2026-10-21 13:10:47.169921+07
62	18	2	Navigasi menu, klik  Create Orders -> IKR.	2026-10-21 13:10:47.169921+07
63	18	3	Klik tombol	2026-10-21 13:10:47.169921+07
64	18	4	Isi kolom wajib atau semua kolom.	2026-10-21 13:10:47.169921+07
65	18	5	Periksa kolom tambahan apabila kombinasi Client dan Type WO memunculkannya.	2026-10-21 13:10:47.169921+07
66	18	6	Klik Create untuk membuat Work Order.	2026-10-21 13:10:47.169921+07
67	18	7	Gunakan tombol reset jika ingin mengosongkan seluruh kolom.	2026-10-21 13:10:47.169921+07
68	19	1	Buka menu	2026-10-21 13:12:25.018488+07
69	19	2	Navigasi menu, klik  Create Orders -> Backbone.	2026-10-21 13:12:25.018488+07
70	19	3	Klik tombol	2026-10-21 13:12:25.018488+07
71	19	4	Isi kolom wajib atau semua kolom.	2026-10-21 13:12:25.018488+07
72	19	5	Periksa kolom tambahan apabila kombinasi Client dan Type WO memunculkannya.	2026-10-21 13:12:25.018488+07
73	19	6	Klik Create untuk membuat Work Order.	2026-10-21 13:12:25.018488+07
74	19	7	Gunakan tombol reset jika ingin mengosongkan seluruh kolom.	2026-10-21 13:12:25.018488+07
75	20	1	Buka menu	2026-10-21 13:13:50.404244+07
76	20	2	Navigasi menu, klik  Create Orders -> Project.	2026-10-21 13:13:50.404244+07
77	20	3	Klik tombol	2026-10-21 13:13:50.404244+07
78	20	4	Isi kolom wajib atau semua kolom.	2026-10-21 13:13:50.404244+07
79	20	5	Periksa kolom tambahan apabila kombinasi Client dan Type WO memunculkannya.	2026-10-21 13:13:50.404244+07
80	20	6	Klik Create untuk membuat Work Order.	2026-10-21 13:13:50.404244+07
81	20	7	Gunakan tombol reset jika ingin mengosongkan seluruh kolom.	2026-10-21 13:13:50.404244+07
82	2	1	Buka menu.	2026-10-21 13:21:58.679804+07
83	2	2	Navigasi menu, klik Assign & Monitoring -> IKR.	2026-10-21 13:21:58.679804+07
84	2	3	Isi filter yang diperlukan, lalu klik tombol pencarian untuk menampilkan Work Order.	2026-10-21 13:21:58.679804+07
85	2	4	Pada tabel Action, klik action berwarna merah.	2026-10-21 13:21:58.679804+07
86	2	5	Klik Assign Teknisi.	2026-10-21 13:21:58.679804+07
87	2	6	(optional)Pilih teknisi tambahan melalui dropdown Pilih Teknisi Tambahan jika diperlukan.	2026-10-21 13:21:58.679804+07
88	2	7	Klik Tambahkan ke Daftar setelah memilih teknisi.	2026-10-21 13:21:58.679804+07
89	21	1	Buka menu.	2026-10-21 13:23:17.672137+07
90	21	2	Navigasi menu, klik Assign & Monitoring -> Backbone.	2026-10-21 13:23:17.672137+07
91	21	3	Isi filter yang diperlukan, lalu klik tombol pencarian untuk menampilkan Work Order.	2026-10-21 13:23:17.672137+07
92	21	4	Pada tabel Action, klik action berwarna merah.	2026-10-21 13:23:17.672137+07
93	21	5	Klik Assign Teknisi.	2026-10-21 13:23:17.672137+07
94	21	6	(optional)Pilih teknisi tambahan melalui dropdown Pilih Teknisi Tambahan jika diperlukan.	2026-10-21 13:23:17.672137+07
95	21	7	Klik Tambahkan ke Daftar setelah memilih teknisi.	2026-10-21 13:23:17.672137+07
96	21	8	Klik Assign untuk menyimpan penugasan.	2026-10-21 13:23:17.672137+07
97	22	1	Buka menu.	2026-10-21 13:27:17.07531+07
98	22	2	Navigasi menu, klik Assign & Monitoring -> Project.	2026-10-21 13:27:17.07531+07
99	22	3	Isi filter yang diperlukan, lalu klik tombol pencarian untuk menampilkan Work Order.	2026-10-21 13:27:17.07531+07
100	22	4	Pada tabel Action, klik action berwarna merah.	2026-10-21 13:27:17.07531+07
101	22	5	Klik Assign Teknisi.	2026-10-21 13:27:17.07531+07
102	22	6	(optional)Pilih teknisi tambahan melalui dropdown Pilih Teknisi Tambahan jika diperlukan.	2026-10-21 13:27:17.07531+07
103	22	7	Klik Tambahkan ke Daftar setelah memilih teknisi.	2026-10-21 13:27:17.07531+07
104	22	8	Klik Assign untuk menyimpan penugasan.	2026-10-21 13:27:17.07531+07
105	23	1	Buka menu.	2026-10-21 13:30:21.120379+07
106	23	2	Navigasi menu, Klik Assign & Monitoring -> IKR.	2026-10-21 13:30:21.120379+07
107	23	3	Gunakan filter untuk menemukan Work Order yang ingin dipantau.	2026-10-21 13:30:21.120379+07
108	23	4	Klik nomor Work Order Client untuk membuka detail Work Order.	2026-10-21 13:30:21.120379+07
109	23	5	Pada halaman detail, cari bagian Activity.	2026-10-21 13:30:21.120379+07
110	24	1	Buka menu.	2026-10-21 13:32:21.325742+07
111	24	2	Navigasi menu, Klik Assign & Monitoring -> Backbone.	2026-10-21 13:32:21.325742+07
112	24	3	Gunakan filter untuk menemukan Work Order yang ingin dipantau.	2026-10-21 13:32:21.325742+07
113	24	4	Klik nomor Work Order Client untuk membuka detail Work Order.	2026-10-21 13:32:21.325742+07
114	24	5	Pada halaman detail, cari bagian Installation Report & Activity untuk melihat progress atau aktivitas.	2026-10-21 13:32:21.325742+07
115	25	1	Buka menu.	2026-10-21 13:33:24.709721+07
116	25	2	Navigasi menu, Klik Assign & Monitoring -> Project.	2026-10-21 13:33:24.709721+07
117	25	3	Gunakan filter untuk menemukan Work Order yang ingin dipantau.	2026-10-21 13:33:24.709721+07
118	25	4	Klik nomor Work Order Client untuk membuka detail Work Order.	2026-10-21 13:33:24.709721+07
119	25	5	Pada halaman detail, cari bagian Activity.	2026-10-21 13:33:24.709721+07
120	26	1	============================ CREATE =======================================	2026-10-21 13:36:21.093362+07
121	26	2	Buka menu.	2026-10-21 13:36:21.093362+07
122	26	3	Navigasi menu, klik Logistik -> Material In Technician	2026-10-21 13:36:21.093362+07
123	26	4	Klik Material in Technician.	2026-10-21 13:36:21.093362+07
124	26	5	Gunakan filter untuk melihat material yang tersedia.	2026-10-21 13:36:21.093362+07
125	26	6	Klik tombol pencarian untuk menerapkan filter.	2026-10-21 13:36:21.093362+07
126	26	7	Pada kolom Stok Tersedia, checklist material yang ingin dipackage.	2026-10-21 13:36:21.093362+07
127	26	8	Klik tombol + Tambah.	2026-10-21 13:36:21.093362+07
128	26	9	Pastikan Qty atau kuantitas setiap material yang ditambahkan sudah sesuai.	2026-10-21 13:36:21.093362+07
129	26	10	Klik Create Package.	2026-10-21 13:36:21.093362+07
130	26	11	============================ ASSIGN =======================================	2026-10-21 13:36:21.093362+07
131	26	12	Cari material yang belum di-assign pada kolom Action.	2026-10-21 13:36:21.093362+07
132	26	13	Klik action berwarna hijau.	2026-10-21 13:36:21.093362+07
133	26	14	Cari dan pilih teknisi penerima pada dropdown.	2026-10-21 13:36:21.093362+07
134	27	1	Klik Logistik.	2026-10-21 13:37:27.042359+07
135	27	2	Klik Material In.	2026-10-21 13:37:27.042359+07
136	27	3	Isi form Identitas Material.	2026-10-21 13:37:27.042359+07
137	27	4	Upload foto atau PDF sebagai bukti material diterima.	2026-10-21 13:37:27.042359+07
138	27	5	Tambahkan item material.	2026-10-21 13:37:27.042359+07
139	27	6	Lengkapi data material yang diperlukan, termasuk cabang, tipe, tanggal rilis, klien, nomor dokumen, karyawan request, dan karyawan receive.	2026-10-21 13:37:27.042359+07
140	28	1	Klik Logistik.	2026-10-21 13:40:01.28179+07
141	28	2	Klik Material Return.	2026-10-21 13:40:01.28179+07
142	28	3	Isi data identitas material.	2026-10-21 13:40:01.28179+07
143	28	4	Pilih material.	2026-10-21 13:40:01.28179+07
144	28	5	Klik tombol pencarian untuk menampilkan stok material yang dipilih.	2026-10-21 13:40:01.28179+07
145	28	6	Checklist material yang ingin direturn.	2026-10-21 13:40:01.28179+07
146	28	7	Klik Tambahkan ke Return.	2026-10-21 13:40:01.28179+07
147	28	8	Periksa tabel material yang akan diretur.	2026-10-21 13:40:01.28179+07
148	28	9	Klik Buat Return untuk menyimpan data return.	2026-10-21 13:40:01.28179+07
149	28	10	Untuk melihat material yang pernah diretur, isi rentang waktu atau nomor dokumen lalu klik tombol pencarian.	2026-10-21 13:40:01.28179+07
150	28	11	Untuk konfirmasi material yang diretur, cari material yang ingin dikonfirmasi, klik tombol hijau, lalu verifikasi dengan memilih Ya, terima.	2026-10-21 13:40:01.28179+07
151	29	1	Klik Logistik dan buka menu Material Transfer.	2026-10-21 13:42:12.368319+07
152	29	2	Isi data identitas material.	2026-10-21 13:42:12.368319+07
153	29	3	Pilih material.	2026-10-21 13:42:12.368319+07
154	29	4	Klik tombol pencarian untuk menampilkan stok material yang dipilih.	2026-10-21 13:42:12.368319+07
155	29	5	Checklist material yang ingin ditransfer.	2026-10-21 13:42:12.368319+07
156	29	6	Klik Tambah.	2026-10-21 13:42:12.368319+07
157	29	7	Periksa tabel material yang akan ditransfer.	2026-10-21 13:42:12.368319+07
158	29	8	Klik Buat Transfer untuk menyimpan data transfer.	2026-10-21 13:42:12.368319+07
159	29	9	Gunakan rentang waktu atau nomor dokumen untuk mencari data transfer.	2026-10-21 13:42:12.368319+07
160	29	10	Klik tombol pencarian untuk menampilkan data transfer yang ingin dikonfirmasi.	2026-10-21 13:42:12.368319+07
161	30	1	Buka menu.	2026-10-21 13:43:44.57635+07
162	30	2	Navigasi menu, klik Logistik -> Material Collect.	2026-10-21 13:43:44.57635+07
163	30	3	Untuk verifikasi Material Collect, gunakan filter untuk mencari material.	2026-10-21 13:43:44.57635+07
164	30	4	Checklist material yang ingin diverifikasi.	2026-10-21 13:43:44.57635+07
165	30	5	Tekan tombol Verifikasi.	2026-10-21 13:43:44.57635+07
166	31	1	Buka menu.	2026-10-21 13:45:49.247566+07
167	31	2	Navigasi menu, klik Logistik -> Stock.	2026-10-21 13:45:49.247566+07
168	31	3	Untuk melihat material di stok, gunakan filter untuk mencari material.	2026-10-21 13:45:49.247566+07
169	31	4	Klik tombol pencarian untuk menampilkan hasil stok.	2026-10-21 13:45:49.247566+07
170	32	1	Buka menu	2026-10-21 13:49:09.889825+07
171	32	2	Navigasi menu, Klik Sewa Kendaraan -> Motor	2026-10-21 13:49:09.889825+07
172	32	3	Klik tombol +Create	2026-10-21 13:49:09.889825+07
173	32	4	Pilih cabang di mana motor berada	2026-10-21 13:49:09.889825+07
174	32	5	Isi identitas motor (Plat nomor, Status milik, dan Pemilik motor)	2026-10-21 13:49:09.889825+07
175	32	6	Klik tombol +Tambah	2026-10-21 13:49:09.889825+07
192	36	1	Buka menu	2026-10-23 16:01:25.391974+07
193	36	2	Klik export photo -> Photo IKR	2026-10-23 16:01:25.391974+07
194	36	3	Gunakan filter untuk memunculkan photo	2026-10-23 16:01:25.391974+07
195	36	4	Download dalam bentuk XLS atau ZIP	2026-10-23 16:01:25.391974+07
211	37	1	Buka menu	2026-10-23 16:05:36.737905+07
212	37	2	Klik Export Photo -> Photo Backbone	2026-10-23 16:05:36.737905+07
213	37	3	Gunakan filter	2026-10-23 16:05:36.737905+07
214	37	4	Klik tombol 'search'	2026-10-23 16:05:36.737905+07
215	37	5	Download pakai XLS atau ZIP	2026-10-23 16:05:36.737905+07
226	42	1	Buka OSS Mobile	2026-10-26 13:45:37.845808+07
227	42	2	Isi kredensial (username & password)	2026-10-26 13:45:37.845808+07
228	42	3	(opsional) Klik tombol 'Ingat Saya'	2026-10-26 13:45:37.845808+07
229	42	4	Klik tombol 'Masuk'	2026-10-26 13:45:37.845808+07
230	43	1	Klik tombol 'Profil'	2026-10-26 13:49:31.508195+07
231	43	2	Klik opsi 'Keluar' pada bagian akun	2026-10-26 13:49:31.508195+07
235	47	1	Klik tombol 'Kamera'	2026-10-26 14:14:23.461485+07
236	47	2	Klik download milik Timestamp	2026-10-26 14:14:23.461485+07
237	47	3	Pilih akun google	2026-10-26 14:14:23.461485+07
238	47	4	Klik 'Ok'	2026-10-26 14:14:23.461485+07
239	47	5	Klik baris 'base.apk'	2026-10-26 14:14:23.461485+07
240	47	6	Klik install	2026-10-26 14:14:23.461485+07
241	48	1	Klik tombol 'kamera'	2026-10-26 14:17:49.02073+07
242	48	2	Klik tombol 'download' milik Geotag	2026-10-26 14:17:49.02073+07
243	48	3	Klik tombol 'install'	2026-10-26 14:17:49.02073+07
244	48	4	Klik tombol 'buka'	2026-10-26 14:17:49.02073+07
255	5	1	Buka halaman OSS-Web https://oss-replace.quantumnusatama.id	2026-10-27 11:42:51.268222+07
256	5	2	Isi kolom username dan password	2026-10-27 11:42:51.268222+07
257	5	3	Isi CAPTCHA sesuai dengan yang ditampilkan.	2026-10-27 11:42:51.268222+07
258	5	4	Klik tombol Login hingga masuk ke halaman home OSS Web.	2026-10-27 11:42:51.268222+07
259	5	5	Arahkan kursor atau mouse ke bagian kiri halaman untuk menampilkan menu.	2026-10-27 11:42:51.268222+07
267	52	1	Klik tombol 'Absensi'	2026-10-27 14:37:34.624177+07
268	52	2	Klik tombol 'Absen out	2026-10-27 14:37:34.624177+07
269	52	3	Ambil foto wajab	2026-10-27 14:37:34.624177+07
270	52	4	Klik tombol 'Submit'	2026-10-27 14:37:34.624177+07
\.


--
-- Data for Name: parent_slugs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parent_slugs (id, slug, title, created_at, updated_at) FROM stdin;
1	email	Email	2026-11-13 09:47:20.929215+07	2026-11-13 09:47:20.929215+07
2	web	Web	2026-11-13 09:47:20.929215+07	2026-11-13 09:47:20.929215+07
3	mobile	Mobile	2026-11-13 09:47:20.929215+07	2026-11-13 09:47:20.929215+07
\.


--
-- Data for Name: type; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.type (id, title, description, image_url, created_at, updated_at, parent_slug_id) FROM stdin;
12	Email			2026-11-04 17:01:46.816481+07	2026-11-13 09:49:09.497338+07	1
5	Heatmap	Heatmap merupakan dasbor monitoring berbasis peta digital yang berfungsi untuk melacak, memetakan, dan mengelola tiket gangguan (Trouble Ticket) jaringan fiber optik secara real-time di berbagai wilayah operasional Indonesia. Sistem ini mengintegrasikan visualisasi sebaran lokasi gangguan pada peta interaktif dengan panel kontrol status operasional—seperti jumlah tiket yang belum ditangani (Not Yet Handled), sedang diproses (Progress), maupun yang sudah selesai (Done).	/img/heatmap/img_1793783187348.png	2026-10-23 10:57:10.046231+07	2026-11-13 09:49:09.497338+07	2
9	HRIS	HRIS (Human Resources Information System) adalah platform manajemen sumber daya manusia berbasis web terintegrasi yang dirancang khusus untuk mengotomatisasi dan menyederhanakan seluruh administrasi kepegawaian di PT Quantum Nusatama secara terpusat, mulai dari pengelolaan database karyawan, pencatatan absensi digital, hingga sistem pengajuan cuti dan justifikasi kehadiran secara real-time.	/img/hris/img_1793781911446.png	2026-10-26 17:14:03.572264+07	2026-11-13 09:49:09.497338+07	2
6	Mapping			2026-10-23 10:57:21.450651+07	2026-11-13 09:49:09.497338+07	2
4	PM Tracker			2026-10-23 10:57:01.804501+07	2026-11-13 09:49:09.497338+07	2
1	OSS WEB	OSS (Operation Support System) Web adalah aplikasi manajemen operasional berbasis website milik PT Quantum Nusatama yang dirancang untuk mendukung dan mengoptimalkan proses kerja inti perusahaan. Terintegrasi langsung dengan sistem HRIS, platform ini berfungsi sebagai pusat kendali (control center) untuk mencatat, mengelola, melacak, dan menyelesaikan berbagai permintaan pengerjaan (Work Order) dari client secara terstruktur dan real-time.	/img/oss_web/img_1792555546105.png	2026-10-20 16:48:31.387545+07	2026-11-13 09:49:09.497338+07	2
2	OSS MOBILE	OSS Mobile adalah aplikasi pendukung operasional berbasis smartphone milik PT Quantum Nusatama yang memfasilitasi kebutuhan kerja harian dan pengerjaan lapangan para teknisi secara terintegrasi. Aplikasi ini memuat fitur manajemen kehadiran (absensi shift), pengajuan formulir SDM, pengunduhan e-slip gaji, hingga eksekusi Work Order (IKR, Backbone, Project) secara real-time dengan dukungan upload foto geotagging/timestamp serta pencatatan koordinat lokasi. Selain itu, OSS Mobile juga menyederhanakan pengelolaan material lapangan melalui pencatatan penggunaan barang, konfirmasi penerimaan/retur, serta fitur pemindaian QR Code untuk transfer material antarteknisi secara praktis.	/img/oss_mobile/img_1792565970299.jpg	2026-10-20 16:48:31.387545+07	2026-11-13 09:49:09.497338+07	3
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, role, created_at, token_version) FROM stdin;
5	ITAdmin2	scrypt$16384$8$1$Mw/4NT8tk1fUVH1pwDkpLw==$Afkp1HygzMGw9I3LHyGkvMHjMJMYEPCaZK3X/NhhS6u3JXLkDXo1HK/TFd5mXuhs/fLWYjie9HKAd+syDzDjVQ==	ITAdmin	2026-10-23 08:42:44.545619+07	0
7	user2	scrypt$16384$8$1$QWbRZiIOV7ee/d1T0dgS5g==$ESeb5yPxdn+SXr58NeUIWjgFmjle7tUODx2IDiJM+xqm9k453YX57gmrR6vEJZ3YAkUZXz7uphrxZDAbXjGgjA==	user	2026-10-23 08:43:16.052445+07	0
8	user3	scrypt$16384$8$1$/nihto+UuUPJsPEsBxfYpw==$bTu7wjL82YwV217ihWe/fmoA6ydH5jOhznnThuX9QfroIVVl6+VCEG/PO9dH0ucMzuniE6UlprFfp9ELucsVbA==	user	2026-10-23 08:43:20.197014+07	0
6	ITAdmin3	scrypt$16384$8$1$ir5/7HMSpixWnYLHMw1XWg==$jQNg49/w1FcZYq+YyXxBmDMEjfvJMll4f2Onvvj5+5ak2SKLLFThCBTwIq//qEbXUixWgx7sAEiPnuoyahjjqA==	ITAdmin	2026-10-23 08:42:58.020122+07	2
3	ITAdmin	scrypt$16384$8$1$IxGfeDt6ymGZsPIuVi+G5g==$U0JrzPSgNnuWos1AV8ywy8LLlsbcnC8P3L50IPDE+8b93xOVSTHmA/jvoE6ZPdoj00i+EBOYCQdgeeuq1ACM2A==	ITAdmin	2026-10-20 17:01:59.692116+07	51
4	user	scrypt$16384$8$1$hoKqy9wcyR7eJRTgQPu5tA==$LuFWV2Tj0UfZwKLpxEZCs+aeSqS86OKKS6HC7AFKHUEABJx8n2CfoQxZk/W9MPX0QXHVbzPFR06LnmqCz9b0yg==	user	2026-10-21 10:18:08.750786+07	7
\.


--
-- Name: jobid_seq; Type: SEQUENCE SET; Schema: cron; Owner: postgres
--

SELECT pg_catalog.setval('cron.jobid_seq', 1, true);


--
-- Name: runid_seq; Type: SEQUENCE SET; Schema: cron; Owner: postgres
--

SELECT pg_catalog.setval('cron.runid_seq', 1, false);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 129, true);


--
-- Name: guide_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.guide_groups_id_seq', 25, true);


--
-- Name: guide_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.guide_id_seq', 63, true);


--
-- Name: guide_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.guide_steps_id_seq', 286, true);


--
-- Name: parent_slugs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parent_slugs_id_seq', 3, true);


--
-- Name: type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_id_seq', 12, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: guide_groups guide_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide_groups
    ADD CONSTRAINT guide_groups_pkey PRIMARY KEY (id);


--
-- Name: guide guide_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide
    ADD CONSTRAINT guide_pkey PRIMARY KEY (id);


--
-- Name: guide_steps guide_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide_steps
    ADD CONSTRAINT guide_steps_pkey PRIMARY KEY (id);


--
-- Name: parent_slugs parent_slugs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_slugs
    ADD CONSTRAINT parent_slugs_pkey PRIMARY KEY (id);


--
-- Name: parent_slugs parent_slugs_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_slugs
    ADD CONSTRAINT parent_slugs_slug_key UNIQUE (slug);


--
-- Name: type type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type
    ADD CONSTRAINT type_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_guide_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guide_group_id ON public.guide USING btree (group_id);


--
-- Name: idx_guide_groups_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guide_groups_order ON public.guide_groups USING btree (group_order);


--
-- Name: idx_guide_groups_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guide_groups_type_id ON public.guide_groups USING btree (type_id);


--
-- Name: idx_guide_steps_guide_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guide_steps_guide_id ON public.guide_steps USING btree (guide_id);


--
-- Name: idx_guide_steps_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guide_steps_order ON public.guide_steps USING btree (step_order);


--
-- Name: idx_guide_video_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guide_video_url ON public.guide USING btree (video_url) WHERE (video_url IS NOT NULL);


--
-- Name: idx_type_parent_slug_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_type_parent_slug_id ON public.type USING btree (parent_slug_id);


--
-- Name: guide_groups trg_update_guide_groups_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_guide_groups_timestamp BEFORE UPDATE ON public.guide_groups FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: guide trg_update_guide_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_guide_timestamp BEFORE UPDATE ON public.guide FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: parent_slugs trg_update_parent_slugs_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_parent_slugs_timestamp BEFORE UPDATE ON public.parent_slugs FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: type trg_update_type_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_type_timestamp BEFORE UPDATE ON public.type FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: guide guide_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide
    ADD CONSTRAINT guide_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.guide_groups(id) ON DELETE CASCADE;


--
-- Name: guide_groups guide_groups_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide_groups
    ADD CONSTRAINT guide_groups_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.type(id) ON DELETE CASCADE;


--
-- Name: guide_steps guide_steps_guide_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide_steps
    ADD CONSTRAINT guide_steps_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES public.guide(id) ON DELETE CASCADE;


--
-- Name: type type_parent_slug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type
    ADD CONSTRAINT type_parent_slug_id_fkey FOREIGN KEY (parent_slug_id) REFERENCES public.parent_slugs(id) ON DELETE CASCADE;


--
-- Name: TABLE activity_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.activity_logs TO quantum;


--
-- Name: SEQUENCE activity_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.activity_logs_id_seq TO quantum;


--
-- Name: TABLE guide; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.guide TO quantum;


--
-- Name: TABLE guide_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.guide_groups TO quantum;


--
-- Name: SEQUENCE guide_groups_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.guide_groups_id_seq TO quantum;


--
-- Name: SEQUENCE guide_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.guide_id_seq TO quantum;


--
-- Name: TABLE guide_steps; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.guide_steps TO quantum;


--
-- Name: SEQUENCE guide_steps_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.guide_steps_id_seq TO quantum;


--
-- Name: TABLE parent_slugs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.parent_slugs TO quantum;


--
-- Name: SEQUENCE parent_slugs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.parent_slugs_id_seq TO quantum;


--
-- Name: TABLE type; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.type TO quantum;


--
-- Name: SEQUENCE type_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.type_id_seq TO quantum;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO quantum;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO quantum;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO quantum;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO quantum;


--
-- PostgreSQL database dump complete
--

\unrestrict Twn7tA0HlgfHhodKZ5rFP0DJnSC0yfA6QVDBLWlDZnMf8IebEYTGRmqgGYZ1NZl

