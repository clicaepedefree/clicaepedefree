UPDATE public.withdrawal_requests
SET status = 'failed',
    error_message = COALESCE(error_message, '') || ' [Auto-liberado: saque pendente sem processamento na ValidaPay bloqueava o saldo do lojista]',
    updated_at = now()
WHERE status IN ('pending', 'processing')
  AND validapay_withdrawal_id IS NULL
  AND created_at < now() - interval '5 minutes';