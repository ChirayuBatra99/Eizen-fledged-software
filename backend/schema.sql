DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('doctor', 'receptionist');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'upi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_kind AS ENUM ('sale', 'restock');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gender AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS clinics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  city          TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinics (id),
  role          user_role NOT NULL,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, username)
);

CREATE TABLE IF NOT EXISTS patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinics (id),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  age           SMALLINT,
  gender        gender,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, phone)
);

CREATE TABLE IF NOT EXISTS medicines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinics (id),
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'unit',
  price         NUMERIC(12, 2) NOT NULL,
  stock_qty     INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, name),
  CHECK (price >= 0),
  CHECK (stock_qty >= 0)
);

CREATE TABLE IF NOT EXISTS visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinics (id),
  patient_id      UUID NOT NULL REFERENCES patients (id),
  created_by_id   UUID NOT NULL REFERENCES users (id),
  condition       TEXT,
  payment_method  payment_method NOT NULL,
  grand_total     NUMERIC(12, 2) NOT NULL,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (grand_total >= 0)
);

CREATE TABLE IF NOT EXISTS visit_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinics (id),
  visit_id      UUID NOT NULL REFERENCES visits (id) ON DELETE CASCADE,
  medicine_id   UUID REFERENCES medicines (id),
  name_snapshot TEXT NOT NULL,
  unit_price    NUMERIC(12, 2) NOT NULL,
  qty           INTEGER NOT NULL,
  line_total    NUMERIC(12, 2) NOT NULL,
  CHECK (qty > 0),
  CHECK (unit_price >= 0),
  CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinics (id),
  medicine_id   UUID NOT NULL REFERENCES medicines (id),
  kind          stock_movement_kind NOT NULL,
  qty_delta     INTEGER NOT NULL,
  visit_id      UUID REFERENCES visits (id),
  note          TEXT,
  created_by_id UUID REFERENCES users (id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS visit_edits;
