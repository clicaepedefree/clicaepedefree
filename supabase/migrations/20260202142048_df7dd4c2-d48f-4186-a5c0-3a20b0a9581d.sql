-- Drop the existing check constraint and add new one with all payment types
ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_method_type_check;

ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_method_type_check 
CHECK (method_type IN ('cash', 'card', 'pix', 'debit_card', 'credit_card', 'food_voucher', 'meal_voucher'));