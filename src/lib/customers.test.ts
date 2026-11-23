// @ts-expect-error bun test runtime module
import { describe, expect, test } from 'bun:test';
import { customerSchema, normalizeCustomerPhone, purchaseMetrics } from './customers';

describe('customer registry rules', () => {
  test('formatting and country code do not create different customer identifiers', () => {
    expect(normalizeCustomerPhone('(11) 99999-1234')).toBe('+5511999991234');
    expect(normalizeCustomerPhone('+55 11 99999-1234')).toBe('+5511999991234');
    expect(normalizeCustomerPhone('5511999991234')).toBe('+5511999991234');
  });
  test('name, phone, address and number are required for manual registration', () => {
    const valid = { name: 'Ana Silva', phone: '(11) 99999-1234', address: 'Rua Central', number: '10', complement: '', neighborhood: '' };
    expect(customerSchema.safeParse(valid).success).toBe(true);
    for (const field of ['name', 'phone', 'address', 'number']) expect(customerSchema.safeParse({ ...valid, [field]: '' }).success).toBe(false);
  });
  test('cancelled orders never count toward purchases or spending', () => {
    expect(purchaseMetrics([{ id: 'cancelled', total: 99.9, status: 'cancelled', payment_status: 'pago' }])).toEqual({ count: 0, total: 0, average: 0 });
  });
  test('refused and incomplete orders never count as effective purchases', () => {
    expect(purchaseMetrics(['refused', 'new', 'preparing', 'delivered', 'pending_payment'].map(status => ({ id: status, total: 18, status, payment_status: 'pago' })))).toEqual({ count: 0, total: 0, average: 0 });
  });
  test('the same completed order is counted once and unpaid orders are excluded', () => {
    const paid = { id: 'paid', total: 18, status: 'completed', payment_status: 'pago' };
    expect(purchaseMetrics([paid, paid, { ...paid, id: 'unpaid', payment_status: 'aguardando_pagamento' }])).toEqual({ count: 1, total: 18, average: 18 });
  });
});