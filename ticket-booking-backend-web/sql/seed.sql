-- ============================================
-- TK-AWS - Seed Data for Event Ticket Booking
-- Run this after init.sql
-- ============================================

-- Insert sample matches/events with images
INSERT INTO matches (team_a, team_b, match_date, venue, total_tickets, ticket_price, zone_multipliers, zone_capacities, image_url, status)
VALUES
  -- Football Events
  (
    'Vietnam', 'Japan',
    '2026-07-10 19:00:00',
    'Mỹ Đình National Stadium, Hanoi',
    40000,
    1000000.00,
    '{"VIP":3.0,"A":2.0,"B":1.5,"C":1.0,"D":0.8}'::jsonb,
    '{"VIP":2000,"A":8000,"B":10000,"C":12000,"D":8000}'::jsonb,
    'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&q=80&auto=format',
    'upcoming'
  ),
  (
    'Vietnam', 'Thailand',
    '2026-12-20 19:00:00',
    'Mỹ Đình National Stadium, Hanoi',
    40000,
    600000.00,
    '{"VIP":3.0,"A":2.0,"B":1.5,"C":1.0,"D":0.8}'::jsonb,
    '{"VIP":2000,"A":8000,"B":10000,"C":12000,"D":8000}'::jsonb,
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80&auto=format',
    'upcoming'
  ),
  (
    'Vietnam', 'South Korea',
    '2027-01-15 19:00:00',
    'Thống Nhất Stadium, Ho Chi Minh City',
    25000,
    800000.00,
    '{"VIP":3.0,"A":2.0,"B":1.5,"C":1.0,"D":0.8}'::jsonb,
    '{"VIP":1000,"A":5000,"B":7000,"C":8000,"D":4000}'::jsonb,
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80&auto=format',
    'upcoming'
  ),
  (
    'Vietnam', 'Indonesia',
    '2027-03-20 19:30:00',
    'Mỹ Đình National Stadium, Hanoi',
    40000,
    500000.00,
    '{"VIP":3.0,"A":2.0,"B":1.5,"C":1.0,"D":0.8}'::jsonb,
    '{"VIP":2000,"A":8000,"B":10000,"C":12000,"D":8000}'::jsonb,
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80&auto=format',
    'upcoming'
  ),

  -- Concert Events
  (
    'Saigon Sound Festival 2026', NULL,
    '2026-08-22 18:00:00',
    'Phú Thọ Indoor Stadium, Ho Chi Minh City',
    15000,
    800000.00,
    '{"VIP":3.0,"A":2.0,"B":1.5,"C":1.0,"D":0.8}'::jsonb,
    '{"VIP":500,"A":3000,"B":4000,"C":5000,"D":2500}'::jsonb,
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80&auto=format',
    'upcoming'
  ),
  (
    'K-Pop Super Live in Vietnam', NULL,
    '2026-11-28 18:30:00',
    'Mỹ Đình National Stadium, Hanoi',
    45000,
    2500000.00,
    '{"VIP":4.0,"A":2.5,"B":1.8,"C":1.2,"D":1.0}'::jsonb,
    '{"VIP":3000,"A":10000,"B":12000,"C":12000,"D":8000}'::jsonb,
    'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80&auto=format',
    'upcoming'
  ),
  (
    'Mỹ Tâm — Tri Âm Live Concert', NULL,
    '2026-11-14 19:00:00',
    'Phú Thọ Indoor Stadium, Ho Chi Minh City',
    12000,
    1200000.00,
    '{"VIP":3.0,"A":2.0,"B":1.5,"C":1.0,"D":0.8}'::jsonb,
    '{"VIP":500,"A":2500,"B":3500,"C":3500,"D":2000}'::jsonb,
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80&auto=format',
    'upcoming'
  ),
  (
    'Sơn Tùng M-TP — Sky Tour 2026', NULL,
    '2026-09-20 19:30:00',
    'Mỹ Đình National Stadium, Hanoi',
    40000,
    1500000.00,
    '{"VIP":4.0,"A":2.5,"B":1.8,"C":1.2,"D":1.0}'::jsonb,
    '{"VIP":2000,"A":8000,"B":10000,"C":12000,"D":8000}'::jsonb,
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80&auto=format',
    'upcoming'
  ),

  -- Sports Events
  (
    'VBA Finals 2026 — Game 5', NULL,
    '2026-09-15 20:00:00',
    'Nguyễn Du Arena, Ho Chi Minh City',
    5000,
    500000.00,
    '{"VIP":3.0,"A":2.0,"B":1.5,"C":1.0,"D":0.8}'::jsonb,
    '{"VIP":200,"A":1000,"B":1500,"C":1500,"D":800}'::jsonb,
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80&auto=format',
    'upcoming'
  ),

  -- Theatre Events
  (
    'Swan Lake — Hanoi Opera House', NULL,
    '2026-10-05 19:30:00',
    'Hanoi Opera House',
    800,
    1500000.00,
    '{"VIP":3.0,"A":2.0,"B":1.5,"C":1.0}'::jsonb,
    '{"VIP":50,"A":200,"B":300,"C":250}'::jsonb,
    'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80&auto=format',
    'upcoming'
  ),

  -- Comedy Events
  (
    'Saigon Stand-Up Comedy Night', NULL,
    '2026-08-12 20:00:00',
    'Soul Live Project, Ho Chi Minh City',
    300,
    300000.00,
    '{"VIP":2.0,"A":1.5,"B":1.0}'::jsonb,
    '{"VIP":30,"A":120,"B":150}'::jsonb,
    'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80&auto=format',
    'upcoming'
  ),
  (
    'Hanoi Comedy Fest 2026', NULL,
    '2026-10-18 20:00:00',
    'Hanoi Creative City',
    500,
    350000.00,
    '{"VIP":2.0,"A":1.5,"B":1.0}'::jsonb,
    '{"VIP":50,"A":200,"B":250}'::jsonb,
    'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80&auto=format',
    'upcoming'
  )
ON CONFLICT (team_a, (COALESCE(team_b, '')), match_date) DO NOTHING;

-- Verify inserted data
SELECT id, team_a, team_b, match_date, venue, ticket_price, status, image_url
FROM matches
WHERE status = 'upcoming'
ORDER BY match_date ASC;
