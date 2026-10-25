-- PHONISTIC DATABASE
-- Smart shopping. Simple choice.

create extension if not exists pgcrypto;

-- 1. PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Accessories',
  description text,
  price numeric(12,2) not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. CUSTOMER ORDERS
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text unique,
  customer_name text not null,
  phone text not null,
  email text,
  address text not null,
  state text not null,
  city text not null,
  note text,
  total numeric(12,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- 3. ORDER ITEMS
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id)
    on delete cascade,
  product_id uuid references public.products(id)
    on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Remove existing policies with these names before recreating them
drop policy if exists "Public can view active products"
on public.products;

drop policy if exists "Public can create orders"
on public.orders;

drop policy if exists "Public can add order items"
on public.order_items;

-- Visitors can view active products only
create policy "Public can view active products"
on public.products
for select
to anon, authenticated
using (is_active = true);

-- Visitors can submit an order
create policy "Public can create orders"
on public.orders
for insert
to anon, authenticated
with check (status = 'pending');

-- Visitors can submit order items
create policy "Public can add order items"
on public.order_items
for insert
to anon, authenticated
with check (quantity > 0);

-- Do not grant public visitors permission to read customer orders
grant select on public.products to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant insert on public.order_items to anon, authenticated;
