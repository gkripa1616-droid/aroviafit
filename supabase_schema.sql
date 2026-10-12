-- ============================================================================
-- AROVIA FIT - SUPABASE REALTIME BACKEND, PAYMENTS & ADMIN DATABASE SCHEMA
-- Production-Ready Schema with Full Realtime Replica Identity & RLS
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    mrp NUMERIC NOT NULL,
    rating NUMERIC DEFAULT 4.8,
    reviews INTEGER DEFAULT 0,
    badge TEXT DEFAULT '',
    img_id TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    colors TEXT[] DEFAULT '{}',
    category TEXT NOT NULL,
    sub_category TEXT DEFAULT '',
    description TEXT DEFAULT '',
    stock INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Idempotent column migrations for existing instances
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 100;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT '';

-- 2b. Dynamic Categories & Subcategories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    sub_categories TEXT[] DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT DEFAULT '',
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    qty INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Wishlist Table
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, product_id)
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC NOT NULL,
    discount NUMERIC DEFAULT 0,
    shipping NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    status TEXT DEFAULT 'Processing',
    payment_status TEXT DEFAULT 'Unpaid',
    payment_id TEXT DEFAULT '',
    tracking_number TEXT DEFAULT '',
    customer_name TEXT DEFAULT 'Guest Customer',
    customer_email TEXT DEFAULT '',
    customer_phone TEXT DEFAULT '',
    shipping_address TEXT DEFAULT '',
    postal_code TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Idempotent column migrations for orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS postal_code TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';

-- 7. Payments Table (Razorpay Realtime Integration)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL UNIQUE,
    payment_method TEXT NOT NULL, -- 'upi', 'card', 'netbanking', 'cod'
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'captured', -- 'pending', 'captured', 'failed', 'refunded'
    raw_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- REPLICA IDENTITY FULL FOR REALTIME DELETE / UPDATE PAYLOAD COMPLETENESS
-- ============================================================================

ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.reviews REPLICA IDENTITY FULL;
ALTER TABLE public.cart_items REPLICA IDENTITY FULL;
ALTER TABLE public.wishlist REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update to products" ON public.products;
CREATE POLICY "Allow public insert/update to products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to reviews" ON public.reviews;
CREATE POLICY "Allow public read access to reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to reviews" ON public.reviews;
CREATE POLICY "Allow public insert to reviews" ON public.reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to cart_items" ON public.cart_items;
CREATE POLICY "Allow public access to cart_items" ON public.cart_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to wishlist" ON public.wishlist;
CREATE POLICY "Allow public access to wishlist" ON public.wishlist FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to orders" ON public.orders;
CREATE POLICY "Allow public access to orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to payments" ON public.payments;
CREATE POLICY "Allow public access to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 8. STORAGE BUCKET FOR REALTIME PRODUCT MEDIA & BULK UPLOADS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Public can upload product images" ON storage.objects;
CREATE POLICY "Public can upload product images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

DROP POLICY IF EXISTS "Public can update product images" ON storage.objects;
CREATE POLICY "Public can update product images" ON storage.objects
FOR UPDATE USING (bucket_id = 'products') WITH CHECK (bucket_id = 'products');

DROP POLICY IF EXISTS "Public can delete product images" ON storage.objects;
CREATE POLICY "Public can delete product images" ON storage.objects
FOR DELETE USING (bucket_id = 'products');

-- ============================================================================
-- ATOMIC STOCK DECREMENT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id BIGINT, p_qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock - p_qty)
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SUPABASE REALTIME PUBLICATION ENABLEMENT
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products, public.reviews, public.cart_items, public.wishlist, public.orders, public.payments;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- ============================================================================
-- SCHEMA INITIALIZATION COMPLETE
-- Products and dynamic categories are created and managed in realtime via Admin Panel
-- ============================================================================
