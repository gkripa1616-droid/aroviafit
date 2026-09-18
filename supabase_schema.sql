-- ============================================================================
-- AROVIA FIT - SUPABASE REALTIME BACKEND, PAYMENTS & ADMIN DATABASE SCHEMA
-- Execute this script in your Supabase SQL Editor to set up DB & Realtime!
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
    colors TEXT[] DEFAULT '{}',
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    stock INTEGER DEFAULT 100,
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
    shipping_address TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
-- INITIAL SEED DATA
-- ============================================================================

INSERT INTO public.products (id, name, price, mrp, rating, reviews, badge, img_id, colors, category, description, stock)
VALUES
  (1, 'Ultimate Flare Pants', 999, 1999, 4.8, 608, 'BESTSELLER', 'photo-1600696491085-19dbbeb4f8c1', ARRAY['#111', '#6b7280', '#7c3aed'], 'Bottoms', 'Our best-selling flare pants crafted from ultra-soft 4-way stretch fabric. Flattering high-rise waist, wide leg opening, and moisture-wicking finish.', 150),
  (2, 'Ultimate Straight Pants', 999, 1999, 4.8, 842, 'BESTSELLER', 'photo-1617372591382-4ecd2bf8bbc3', ARRAY['#111', '#9ca3af', '#b45309'], 'Bottoms', 'Effortlessly versatile straight-leg pants that transition from the studio to the streets. Buttery smooth fabric with 4-way stretch.', 120),
  (3, 'Work-To-Wine Wide Dart Pants', 1699, 1899, 4.8, 312, 'NEW', 'photo-1597586309225-a5db6dd03b3c', ARRAY['#111', '#d97706'], 'Bottoms', 'Designed for the woman who does it all. Wide-leg silhouette with dart detailing for a structured yet comfortable fit.', 80),
  (4, 'Cloud Korean Pants', 1999, 2499, 4.8, 203, 'NEW', 'photo-1597586309204-ab40c927296d', ARRAY['#111', '#6b7280', '#0ea5e9'], 'Bottoms', 'Inspired by Korean street style. Relaxed silhouette, ultra-light fabric, elastic waist with drawstring for the perfect fit every time.', 95),
  (5, 'Ultimate Leggings', 1199, 2299, 4.9, 1205, 'BESTSELLER', 'photo-1565118520546-8f6a088d6894', ARRAY['#111', '#374151', '#7c3aed', '#0ea5e9'], 'Bottoms', 'The legging that started it all. Squat-proof, non-see-through, buttery soft fabric that moves with you all day.', 300),
  (6, 'Power Up Sports Bra', 799, 1299, 4.7, 445, 'RESTOCKED', 'photo-1597586740347-a5a9d9a93e85', ARRAY['#c53030', '#111', '#6b7280'], 'Innerwear', 'Medium-to-high support sports bra with removable cups, cross-back design, and wide underband for all-day comfort.', 200),
  (7, 'Built-In Bra Crop Top', 899, 1499, 4.8, 367, 'NEW', 'photo-1579473755852-abe535c52ff0', ARRAY['#f5f5f4', '#111'], 'Tops', 'Two-in-one crop top with built-in shelf bra. Light support, relaxed fit, and breathable fabric perfect for low-intensity workouts.', 110),
  (8, 'V-Neck Racerback Top', 699, 1199, 4.7, 289, 'NEW COLOURS', 'photo-1552196527-90dc99d938bc', ARRAY['#111', '#b45309', '#0ea5e9', '#7c3aed'], 'Tops', 'Classic racerback design with V-neckline. Quick-dry, odor-resistant, and available in an expanded colour palette.', 140),
  (9, 'AirMelt Flare Pants', 1599, 2199, 4.9, 534, 'BESTSELLER', 'photo-1597586740716-27ca9e73029a', ARRAY['#111', '#3b82f6'], 'Travel', 'Lightweight, packable flare pants perfect for travel. Wrinkle-resistant, quick-dry, and surprisingly comfortable on long flights.', 175),
  (10, 'BareButter Straight Pants', 1799, 2499, 4.8, 412, 'NEW', 'photo-1597460927195-a6c823cc0d0e', ARRAY['#111', '#3b82f6', '#6b7280'], 'Travel', 'Butter-soft straight pants designed for the modern traveller. Adjustable waistband and hidden pockets for your essentials.', 130),
  (11, 'Absolute Invisible Bra', 699, 1199, 4.9, 892, 'BESTSELLER', 'photo-1579473755852-abe535c52ff0', ARRAY['#f5f5f4', '#111', '#fcd34d'], 'Innerwear', 'Seamless, invisible bra with no-show construction under any outfit. Gentle support with full coverage moulded cups.', 210),
  (12, 'Ultimate Comfort Sports Bra', 799, 1399, 4.8, 623, 'BESTSELLER', 'photo-1597586309225-a5db6dd03b3c', ARRAY['#111', '#c53030', '#0ea5e9'], 'Innerwear', 'Our most popular sports bra. Light to medium support, padded cups, and wide straps that won\'t dig in.', 190),
  (13, 'Cloud Baby Tee', 599, 999, 4.6, 156, 'NEW', 'photo-1597586740347-a5a9d9a93e85', ARRAY['#f5f5f4', '#fcd34d', '#c53030'], 'Tops', 'Relaxed baby tee cut from cloud-soft jersey. Cropped silhouette, raw hem, and effortless fit for everyday wear.', 85),
  (14, 'Swim Dress Racerback', 1999, 2799, 4.8, 178, 'NEW', 'photo-1617372591382-4ecd2bf8bbc3', ARRAY['#111', '#0ea5e9', '#7c3aed'], 'Swimwear', 'Flattering racerback swim dress with built-in UPF 50+ protection. Chlorine-resistant fabric for long-lasting colour.', 65),
  (15, 'One-Piece Swimsuit', 2199, 2999, 4.7, 89, 'NEW', 'photo-1597586309204-ab40c927296d', ARRAY['#111', '#c53030'], 'Swimwear', 'Sculpting one-piece with tummy control panel, adjustable straps, and a sophisticated minimalist design.', 50),
  (16, 'Full Sleeve Swim Dress', 2499, 3299, 4.9, 67, 'NEW', 'photo-1565118520546-8f6a088d6894', ARRAY['#111', '#6b7280'], 'Swimwear', 'Elegant full-sleeve swim dress with UPF 50+ protection. Perfect for conservative swimmers and beach walks alike.', 45),
  (17, 'BareButter Pullover', 1299, 1999, 4.8, 234, 'NEW', 'photo-1552196527-90dc99d938bc', ARRAY['#f5f5f4', '#111', '#d97706'], 'Travel', 'Ultra-soft pullover perfect for layering on travels. Lightweight, packable, and wrinkle-free for the modern nomad.', 90),
  (18, 'RibSupreme Flare Pants', 1499, 2199, 4.7, 189, 'RESTOCKED', 'photo-1600696491085-19dbbeb4f8c1', ARRAY['#111', '#6b7280', '#7c3aed'], 'Travel', 'Ribbed flare pants with a premium hand-feel. 4-way stretch, high-waist, and side pockets for practicality.', 115)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  mrp = EXCLUDED.mrp,
  rating = EXCLUDED.rating,
  reviews = EXCLUDED.reviews,
  badge = EXCLUDED.badge,
  img_id = EXCLUDED.img_id,
  colors = EXCLUDED.colors,
  category = EXCLUDED.category,
  description = EXCLUDED.description;

INSERT INTO public.reviews (product_id, product_name, name, text, rating)
VALUES
  (5, 'Ultimate Leggings', 'Priya S.', 'Absolutely love the fit and comfort. These leggings are worth every rupee! Have ordered 3 pairs already.', 5),
  (9, 'AirMelt Flare Pants', 'Ananya M.', 'The quality is outstanding. I wear these to the gym and for everyday errands. Perfect versatility.', 5),
  (6, 'Power Up Sports Bra', 'Rhea K.', 'Best sports bra I have ever owned. No bounce, great support, ultra soft. Highly recommend!', 5),
  (1, 'Ultimate Flare Pants', 'Kavitha R.', 'The flare pants are so flattering! I got so many compliments at work. Love the fabric.', 5),
  (2, 'Ultimate Straight Pants', 'Sneha T.', 'Ordered 3 pairs of Ultimate Straight Pants. They wash so beautifully and stay in shape!', 5),
  (4, 'Cloud Korean Pants', 'Meera V.', 'Arovia Fit is my go-to for workwear. The fabric feels premium and lasts forever. Worth every rupee.', 5);
