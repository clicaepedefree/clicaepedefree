
DROP VIEW IF EXISTS public.secure_orders_view;

CREATE VIEW public.secure_orders_view AS
SELECT id,
    restaurant_id,
    order_number,
    items,
    subtotal,
    delivery_fee,
    total,
    created_at,
    updated_at,
    status,
    payment_method,
    (mask_customer_data(customer_name, customer_phone, true) ->> 'customer_name'::text) AS customer_name,
    (mask_customer_data(customer_name, customer_phone, true) ->> 'customer_phone'::text) AS customer_phone,
    CASE
        WHEN user_owns_order_restaurant(id) THEN address
        ELSE 'PROTECTED'::text
    END AS address
FROM orders o
WHERE user_owns_order_restaurant(id);
