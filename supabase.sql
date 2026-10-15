-- Run this entire script in Supabase Dashboard > SQL Editor > New query.
-- It creates per-user inventory tables, row-level security, and a safe stock movement function.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sku text not null check (length(trim(sku)) > 0),
  category text,
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  reorder_level integer not null default 5 check (reorder_level >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sku)
);

create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in','out')),
  quantity integer not null check (quantity > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists stock_transactions_user_created_idx on public.stock_transactions(user_id, created_at desc);
create index if not exists stock_transactions_product_id_idx on public.stock_transactions(product_id);

alter table public.products enable row level security;
alter table public.stock_transactions enable row level security;

-- A signed-in user can only view and manage their own rows.
drop policy if exists "Users manage own products" on public.products;
create policy "Users manage own products" on public.products
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users view own stock transactions" on public.stock_transactions;
create policy "Users view own stock transactions" on public.stock_transactions
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users insert own stock transactions" on public.stock_transactions;
create policy "Users insert own stock transactions" on public.stock_transactions
for insert to authenticated
with check (auth.uid() = user_id);

-- Stock quantity and transaction history are updated together in one database transaction.
-- The function runs with the caller's permissions, so row-level security still applies.
create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_quantity integer;
  v_new_quantity integer;
begin
  if v_user_id is null then
    raise exception 'You must sign in first.';
  end if;
  if p_movement_type not in ('in','out') then
    raise exception 'Movement type must be in or out.';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be a positive whole number.';
  end if;

  select quantity into v_current_quantity
  from public.products
  where id = p_product_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Product not found or access denied.';
  end if;

  if p_movement_type = 'out' and v_current_quantity < p_quantity then
    raise exception 'Not enough stock for this stock-out movement.';
  end if;

  if p_movement_type = 'in' then
    v_new_quantity := v_current_quantity + p_quantity;
  else
    v_new_quantity := v_current_quantity - p_quantity;
  end if;

  update public.products
  set quantity = v_new_quantity, updated_at = now()
  where id = p_product_id and user_id = v_user_id;

  insert into public.stock_transactions (user_id, product_id, movement_type, quantity, note)
  values (v_user_id, p_product_id, p_movement_type, p_quantity, nullif(trim(coalesce(p_note,'')), ''));
end;
$$;

revoke all on function public.record_stock_movement(uuid, text, integer, text) from public;
grant execute on function public.record_stock_movement(uuid, text, integer, text) to authenticated;

-- Supabase normally grants table access to authenticated users by default in new projects.
-- These grants make the intended client permissions explicit.
grant select, insert, update, delete on public.products to authenticated;
grant select, insert on public.stock_transactions to authenticated;
