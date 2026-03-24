-- EJECUTAR EN EL SQL EDITOR DE SUPABASE
-- Este script asegura que la tabla 'orders' tenga todas las columnas necesarias 
-- para que el sistema de pedidos y compras funcione correctamente.

alter table orders add column if not exists order_number bigint;
alter table orders add column if not exists notes text;
alter table orders add column if not exists is_bought boolean default false;
alter table orders add column if not exists is_modified boolean default false;
alter table orders add column if not exists arrival_date text;
