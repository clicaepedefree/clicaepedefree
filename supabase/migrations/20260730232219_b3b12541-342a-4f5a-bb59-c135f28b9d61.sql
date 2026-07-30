
CREATE OR REPLACE FUNCTION public.admin_list_pix_transactions(
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _payer text DEFAULT NULL,
  _document text DEFAULT NULL,
  _restaurant_id uuid DEFAULT NULL,
  _status text DEFAULT NULL,
  _min_amount numeric DEFAULT NULL,
  _max_amount numeric DEFAULT NULL,
  _sort text DEFAULT 'date',
  _dir text DEFAULT 'desc',
  _limit int DEFAULT 25,
  _offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  paid_at timestamptz,
  customer_name text,
  customer_document text,
  restaurant_id uuid,
  restaurant_name text,
  amount numeric,
  payment_status text,
  pix_txid text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Super admin privileges required'; END IF;

  RETURN QUERY
  WITH base AS (
    SELECT o.id, o.created_at, o.pix_paid_at AS paid_at, o.customer_name,
           NULL::text AS customer_document, o.restaurant_id, r.name AS restaurant_name,
           o.total AS amount, o.payment_status, o.pix_txid
    FROM public.orders o
    JOIN public.restaurants r ON r.id = o.restaurant_id
    WHERE o.payment_method = 'pix_online'
      AND (_from IS NULL OR o.created_at >= _from)
      AND (_to IS NULL OR o.created_at < _to)
      AND (_payer IS NULL OR _payer = '' OR o.customer_name ILIKE '%' || _payer || '%')
      AND (_document IS NULL OR _document = '' OR COALESCE(r.tax_id,'') ILIKE '%' || _document || '%')
      AND (_restaurant_id IS NULL OR o.restaurant_id = _restaurant_id)
      AND (_status IS NULL OR _status = '' OR o.payment_status = _status)
      AND (_min_amount IS NULL OR o.total >= _min_amount)
      AND (_max_amount IS NULL OR o.total <= _max_amount)
  ), counted AS (
    SELECT b.*, COUNT(*) OVER() AS total_count FROM base b
  )
  SELECT c.id, c.created_at, c.paid_at, c.customer_name, c.customer_document,
         c.restaurant_id, c.restaurant_name, c.amount, c.payment_status, c.pix_txid, c.total_count
  FROM counted c
  ORDER BY
    CASE WHEN _sort='date' AND _dir='asc' THEN c.created_at END ASC,
    CASE WHEN _sort='date' AND _dir<>'asc' THEN c.created_at END DESC,
    CASE WHEN _sort='amount' AND _dir='asc' THEN c.amount END ASC,
    CASE WHEN _sort='amount' AND _dir<>'asc' THEN c.amount END DESC,
    CASE WHEN _sort='name' AND _dir='asc' THEN c.customer_name END ASC,
    CASE WHEN _sort='name' AND _dir<>'asc' THEN c.customer_name END DESC,
    CASE WHEN _sort='restaurant' AND _dir='asc' THEN c.restaurant_name END ASC,
    CASE WHEN _sort='restaurant' AND _dir<>'asc' THEN c.restaurant_name END DESC,
    CASE WHEN _sort='status' AND _dir='asc' THEN c.payment_status END ASC,
    CASE WHEN _sort='status' AND _dir<>'asc' THEN c.payment_status END DESC
  LIMIT GREATEST(_limit, 1) OFFSET GREATEST(_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_pix_transactions(timestamptz,timestamptz,text,text,uuid,text,numeric,numeric,text,text,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_pix_transactions(timestamptz,timestamptz,text,text,uuid,text,numeric,numeric,text,text,int,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_pix_financial_summary(
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _restaurant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  res jsonb;
  daily jsonb;
  by_rest jsonb;
  w_count bigint := 0;
  w_total numeric := 0;
  tx_count bigint := 0;
  paid_count bigint := 0;
  volume numeric := 0;
  paid_volume numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Super admin privileges required'; END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE o.payment_status='pago'),
         COALESCE(SUM(o.total),0), COALESCE(SUM(o.total) FILTER (WHERE o.payment_status='pago'),0)
  INTO tx_count, paid_count, volume, paid_volume
  FROM public.orders o
  WHERE o.payment_method='pix_online'
    AND (_from IS NULL OR o.created_at >= _from)
    AND (_to IS NULL OR o.created_at < _to)
    AND (_restaurant_id IS NULL OR o.restaurant_id = _restaurant_id);

  SELECT COUNT(*), COALESCE(SUM(w.gross_amount),0) INTO w_count, w_total
  FROM public.withdrawal_requests w
  WHERE w.status = 'completed'
    AND (_from IS NULL OR w.created_at >= _from)
    AND (_to IS NULL OR w.created_at < _to)
    AND (_restaurant_id IS NULL OR w.restaurant_id = _restaurant_id);

  SELECT COALESCE(jsonb_agg(d ORDER BY d->>'day'), '[]'::jsonb) INTO daily
  FROM (
    SELECT jsonb_build_object(
      'day', to_char((o.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'count', COUNT(*) FILTER (WHERE o.payment_status='pago'),
      'volume', COALESCE(SUM(o.total) FILTER (WHERE o.payment_status='pago'),0),
      'fees', COUNT(*) FILTER (WHERE o.payment_status='pago') * 1.0,
      'bank_cost', COUNT(*) FILTER (WHERE o.payment_status='pago') * 0.47,
      'profit', COUNT(*) FILTER (WHERE o.payment_status='pago') * 0.53
    ) AS d
    FROM public.orders o
    WHERE o.payment_method='pix_online'
      AND (_from IS NULL OR o.created_at >= _from)
      AND (_to IS NULL OR o.created_at < _to)
      AND (_restaurant_id IS NULL OR o.restaurant_id = _restaurant_id)
    GROUP BY (o.created_at AT TIME ZONE 'America/Sao_Paulo')::date
  ) s;

  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'volume')::numeric DESC), '[]'::jsonb) INTO by_rest
  FROM (
    SELECT jsonb_build_object(
      'restaurant_id', o.restaurant_id,
      'name', r.name,
      'count', COUNT(*) FILTER (WHERE o.payment_status='pago'),
      'volume', COALESCE(SUM(o.total) FILTER (WHERE o.payment_status='pago'),0),
      'revenue', COUNT(*) FILTER (WHERE o.payment_status='pago') * 1.0
    ) AS x
    FROM public.orders o
    JOIN public.restaurants r ON r.id = o.restaurant_id
    WHERE o.payment_method='pix_online'
      AND (_from IS NULL OR o.created_at >= _from)
      AND (_to IS NULL OR o.created_at < _to)
      AND (_restaurant_id IS NULL OR o.restaurant_id = _restaurant_id)
    GROUP BY o.restaurant_id, r.name
  ) t;

  res := jsonb_build_object(
    'tx_count', tx_count,
    'paid_count', paid_count,
    'volume', volume,
    'paid_volume', paid_volume,
    'pix_fee_revenue', paid_count * 1.0,
    'bank_cost', paid_count * 0.47,
    'pix_net_profit', paid_count * 0.53,
    'withdrawal_count', w_count,
    'withdrawal_volume', w_total,
    'withdrawal_fee_revenue', w_count * 5.0,
    'total_platform_revenue', (paid_count * 0.53) + (w_count * 5.0),
    'average_ticket', CASE WHEN paid_count > 0 THEN paid_volume / paid_count ELSE 0 END,
    'daily', daily,
    'by_restaurant', by_rest
  );
  RETURN res;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_pix_financial_summary(timestamptz,timestamptz,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_pix_financial_summary(timestamptz,timestamptz,uuid) TO authenticated;
