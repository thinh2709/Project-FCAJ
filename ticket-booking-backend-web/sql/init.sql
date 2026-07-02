-- Ticket Booking System - Database Schema
-- PostgreSQL

-- Users (synced from Cognito)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_a VARCHAR(100) NOT NULL,
    team_b VARCHAR(100),
    match_date TIMESTAMP NOT NULL,
    venue VARCHAR(255) NOT NULL,
    total_tickets INTEGER NOT NULL,
    ticket_price DECIMAL(10,2) NOT NULL,
    zone_multipliers JSONB DEFAULT '{"VIP":2.0,"A":1.5,"B":1.2,"C":1.0,"D":0.8}'::jsonb,
    zone_capacities JSONB DEFAULT '{"VIP":0,"A":0,"B":0,"C":0,"D":0}'::jsonb,
    image_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, ongoing, completed, cancelled
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tickets (inventory per match)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id),
    seat_zone VARCHAR(10) NOT NULL, -- A, B, C, D, VIP
    seat_number VARCHAR(20) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available', -- available, reserved, sold
    reserved_until TIMESTAMP,
    reserved_by UUID REFERENCES users(id),
    UNIQUE(match_id, seat_zone, seat_number)
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    match_id UUID REFERENCES matches(id),
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, refunded
    payment_method VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, refunded
    transaction_id VARCHAR(255),
    ticket_pdf_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Booking Items (tickets in a booking)
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    ticket_id UUID REFERENCES tickets(id),
    price DECIMAL(10,2) NOT NULL
);

-- Payment Logs
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    provider VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    raw_request JSONB,
    raw_response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_match_status ON tickets(match_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, payment_status);
CREATE INDEX IF NOT EXISTS idx_tickets_reserved_until ON tickets(reserved_until) WHERE status = 'reserved';

-- Migrations
ALTER TABLE matches ADD COLUMN IF NOT EXISTS zone_multipliers JSONB DEFAULT '{"VIP":2.0,"A":1.5,"B":1.2,"C":1.0,"D":0.8}'::jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS zone_capacities JSONB DEFAULT '{"VIP":0,"A":0,"B":0,"C":0,"D":0}'::jsonb;
ALTER TABLE matches ALTER COLUMN team_b DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_pdf_url VARCHAR(255);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);

-- Migration: Add queue_token column to bookings table
-- Purpose: Link each booking to the queueToken for post-payment cleanup
-- Run this on your production database before deploying the new code

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS queue_token VARCHAR(32);

-- Clean up duplicate queue_tokens before creating the unique index
UPDATE bookings 
SET queue_token = NULL 
WHERE id NOT IN (
  SELECT MIN(id::text)::uuid 
  FROM bookings 
  WHERE queue_token IS NOT NULL 
  GROUP BY queue_token
) AND queue_token IS NOT NULL;

-- Drop old index if exists
DROP INDEX IF EXISTS idx_bookings_queue_token;

-- Unique Index to prevent double-booking with the same queue token
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_queue_token_unique ON bookings(queue_token) WHERE queue_token IS NOT NULL;

-- High-performance indexes for high-concurrency ticket booking
CREATE INDEX IF NOT EXISTS idx_tickets_match_zone_status ON tickets(match_id, seat_zone, status);
CREATE INDEX IF NOT EXISTS idx_tickets_reserved_until ON tickets(reserved_until) WHERE reserved_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status_created_at ON bookings(status, created_at) WHERE status = 'pending';
