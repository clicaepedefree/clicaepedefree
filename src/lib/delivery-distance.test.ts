// @ts-expect-error bun test runtime module
import { describe, expect, test } from 'bun:test';
import { canCalculateDelivery, isCurrentDeliveryQuote } from './delivery-distance';
import { savedCustomerForPhone } from './customers';
import { destinationHashInput, routeMeters } from '../../supabase/functions/delivery-distance/rules';

describe('distance delivery checkout rules', () => {
  const address = { street: 'Rua Martim Afonso de Souza', number: '345', neighborhood: 'Centro', city: 'Praia Grande', state: 'SP' };
  test('an address without CEP can be quoted when street, number, neighborhood, city and state are complete', () => {
    expect(canCalculateDelivery(address)).toBe(true);
    expect(canCalculateDelivery({ ...address, city: '' })).toBe(false);
    expect(canCalculateDelivery({ ...address, number: '' })).toBe(false);
    expect(canCalculateDelivery({ ...address, cep: '123' })).toBe(false);
  });
  test('expired quotes cannot authorize checkout', () => {
    const quote = { id: 'quote', address: 'Rua 1', expiresAt: '2026-11-25T02:00:00Z', meters: 2000, fee: 3, details: { street: 'Rua 1', number: '1', complement: '', neighborhood: 'Centro', cep: '' } };
    expect(isCurrentDeliveryQuote(quote, Date.parse('2026-11-25T01:59:59Z'))).toBe(true);
    expect(isCurrentDeliveryQuote(quote, Date.parse('2026-11-25T02:00:00Z'))).toBe(false);
  });
  test('saved details are returned only for the same normalized phone on the device', () => {
    const saved = { name: 'Ana', phone: '+5511999991234', address: 'Rua 1', number: '1', complement: '', neighborhood: 'Centro' };
    expect(savedCustomerForPhone(saved, '(11) 99999-1234')).toEqual(saved);
    expect(savedCustomerForPhone(saved, '(11) 99999-5678')).toBeNull();
    expect(savedCustomerForPhone(null, '(11) 99999-1234')).toBeNull();
  });
  test('unavailable routes are distinct from a valid zero-meter route', () => {
    expect(routeMeters({ routes: [] })).toBeNull();
    expect(routeMeters({ routes: [{}] })).toBe(0);
    expect(routeMeters({ routes: [{ distanceMeters: -1 }] })).toBeNull();
    expect(routeMeters({ routes: [{ distanceMeters: 3450 }] })).toBe(3450);
  });
  test('quote binding includes number and complement and supports no CEP', () => {
    const details = { street: 'Rua 1', number: '345', complement: '', neighborhood: 'Centro', cep: '' };
    expect(destinationHashInput('Rua 1, 345, Centro', details)).toBe(['Rua 1, 345, Centro', 'Rua 1', '345', '', 'Centro', ''].join(String.fromCharCode(31)));
    expect(destinationHashInput('Rua 1, 345, Centro', { ...details, number: '346' })).not.toBe(destinationHashInput('Rua 1, 345, Centro', details));
  });
});