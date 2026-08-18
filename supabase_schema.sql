-- =========================================================
-- RESQ AI EMERGENCY SYSTEM - SUPABASE DATABASE SCHEMA
-- =========================================================

-- 1. Incidents Table
CREATE TABLE IF NOT EXISTS public.incidents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    priority TEXT NOT NULL DEFAULT 'P3',
    risk_score INTEGER NOT NULL DEFAULT 50,
    risk_level TEXT NOT NULL DEFAULT 'Medium',
    description TEXT,
    people_affected INTEGER NOT NULL DEFAULT 1,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION DEFAULT 5.0,
    address TEXT NOT NULL,
    citizen_id TEXT,
    assigned_team TEXT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Notification Logs Table (Voice Calls, SMS, Emails, WhatsApp)
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id TEXT PRIMARY KEY,
    incident_id TEXT REFERENCES public.incidents(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    channel_type TEXT NOT NULL,
    recipient TEXT NOT NULL,
    message_preview TEXT,
    status TEXT NOT NULL,
    provider_reference TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Response Teams Table
CREATE TABLE IF NOT EXISTS public.response_teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available',
    personnel INTEGER NOT NULL DEFAULT 6,
    equipment TEXT[],
    contact_phone TEXT,
    assigned_incident_id TEXT
);

-- 4. Enable Row Level Security (RLS) & Public Policies
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to incidents" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update to incidents" ON public.incidents FOR ALL USING (true);

CREATE POLICY "Allow public read access to notification_logs" ON public.notification_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert to notification_logs" ON public.notification_logs FOR ALL USING (true);

CREATE POLICY "Allow public read access to response_teams" ON public.response_teams FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update to response_teams" ON public.response_teams FOR ALL USING (true);

-- 5. Seed Default Response Teams
INSERT INTO public.response_teams (id, name, type, status, personnel, equipment, contact_phone)
VALUES
  ('TEAM-ALPHA', 'Alpha Search & Rescue', 'Flood & Structural', 'Available', 8, ARRAY['Inflatable Boats', 'Hydraulic Spreaders', 'Sonar Detector', 'First Aid Kits'], '+918838225583'),
  ('TEAM-BRAVO', 'Bravo Hazmat & Fire', 'Fire & Hazard', 'Available', 6, ARRAY['Thermal Imaging', 'Aqueous Foam', 'Oxygen Respirators', 'Hazmat Suits'], '+918838225583'),
  ('TEAM-CHARLIE', 'Charlie Swift Water Rescue', 'Flood & Rapid Water', 'Available', 7, ARRAY['Zodiac Rafts', 'Throw Lines', 'Drysuits', 'Satellite GPS'], '+918838225583'),
  ('TEAM-DELTA', 'Delta Trauma & Evacuation', 'Medical & Evacuation', 'Available', 5, ARRAY['Mobile Defibrillator', 'Stretchers', 'Blood Transfusion Kits', 'Oxygen Units'], '+918838225583')
ON CONFLICT (id) DO NOTHING;
