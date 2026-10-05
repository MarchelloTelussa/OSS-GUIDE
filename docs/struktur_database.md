content
id : key int
title : string
important_note : text
function_desc : text
videourl : var(255)
createad_at : timestamp
viewcount : int

     Column     |            Type             | Collation | Nullable |               Default
----------------+-----------------------------+-----------+----------+-------------------------------------
 id             | integer                     |           | not null | nextval('content_id_seq'::regclass)
 title          | character varying(255)      |           | not null |
 important_note | text                        |           | not null |
 function_desc  | text                        |           | not null |
 video_url      | character varying(255)      |           | not null |
 created_at     | timestamp without time zone |           |          | CURRENT_TIMESTAMP
 viewcount      | integer                     |           |          | 0
Indexes:
    "content_pkey" PRIMARY KEY, btree (id)
Referenced by:
    TABLE "guide_steps" CONSTRAINT "guide_steps_guide_id_fkey" FOREIGN KEY (guide_id) REFERENCES content(id) ON DELETE CASCADE




 guide_steps
id : key int
guide_id : foreign key int
step_order : int
step_description : text

       Column      |  Type   | Collation | Nullable |                 Default
------------------+---------+-----------+----------+-----------------------------------------
 id               | integer |           | not null | nextval('guide_steps_id_seq'::regclass)
 guide_id         | integer |           |          |
 step_order       | integer |           | not null |
 step_description | text    |           | not null |
Indexes:
    "guide_steps_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "guide_steps_guide_id_fkey" FOREIGN KEY (guide_id) REFERENCES content(id) ON DELETE CASCADE