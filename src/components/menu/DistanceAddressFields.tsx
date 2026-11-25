import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { queryDelivery } from '@/lib/delivery-api';
import type { DeliveryAddressCandidate } from '@/lib/delivery-distance';

export interface DistanceAddressValue {
  street: string; number: string; complement: string; neighborhood: string;
  city?: string; state?: string; cep?: string;
}

export function DistanceAddressFields({ restaurantId, value, onChange, disabled }: {
  restaurantId: string; value: DistanceAddressValue;
  onChange: (patch: Partial<DistanceAddressValue>) => void; disabled?: boolean;
}) {
  const [mode, setMode] = useState('cep');
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<DeliveryAddressCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState('');
  const current = useRef({ value, onChange });
  current.current = { value, onChange };

  useEffect(() => {
    let active = true;
    const cep = value.cep?.replace(/\D/g, '') ?? '';
    const ready = mode === 'cep' ? cep.length === 8 : query.trim().length >= 3;
    setLoading(false);
    setError('');
    setCandidates([]);
    if (!ready) return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await queryDelivery<{ candidates: DeliveryAddressCandidate[] }>(restaurantId,
          mode === 'cep' ? { action: 'cep', cep } : { action: 'search', query: query.trim() });
        if (!active) return;
        if (!result.candidates.length) {
          setError(mode === 'cep' ? 'CEP não encontrado. Confira ou busque pela rua.' : 'Nenhuma rua encontrada. Informe a cidade na busca.');
        } else if (mode === 'cep' && result.candidates.length === 1) {
          const candidate = result.candidates[0];
          current.current.onChange({ street: candidate.street, neighborhood: candidate.neighborhood,
            city: candidate.city, state: candidate.state });
          setConfirmed(candidate.label);
        } else setCandidates(result.candidates);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Não foi possível consultar o endereço.');
      } finally { if (active) setLoading(false); }
    }, 600);
    return () => { active = false; window.clearTimeout(timer); };
  }, [restaurantId, mode, value.cep, query]);

  function select(candidate: DeliveryAddressCandidate) {
    onChange({ street: candidate.street, number: candidate.number || value.number,
      neighborhood: candidate.neighborhood, city: candidate.city, state: candidate.state,
      cep: mode === 'cep' ? value.cep : candidate.cep });
    setCandidates([]);
    setConfirmed(candidate.label);
  }

  return <fieldset disabled={disabled} className="space-y-4 min-w-0">
    <RadioGroup value={mode} onValueChange={mode => { setMode(mode); setConfirmed(''); }} className="flex flex-wrap gap-4">
      <div className="flex items-center gap-2"><RadioGroupItem value="cep" id="lookup-cep" /><Label htmlFor="lookup-cep">Tenho o CEP</Label></div>
      <div className="flex items-center gap-2"><RadioGroupItem value="street" id="lookup-street" /><Label htmlFor="lookup-street">Não sei o CEP</Label></div>
    </RadioGroup>
    {mode === 'cep' ? <div className="space-y-2">
      <Label htmlFor="checkout-cep">CEP</Label>
      <Input id="checkout-cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" maxLength={9}
        value={value.cep ?? ''} onChange={event => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
          setConfirmed('');
          onChange({ cep: digits.replace(/^(\d{5})(\d)/, '$1-$2'), street: '', neighborhood: '', city: '', state: '' });
        }} />
    </div> : <div className="space-y-2">
      <Label htmlFor="checkout-search">Rua e número</Label>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input id="checkout-search" className="pl-9" placeholder="Rua e número, cidade" maxLength={120}
          value={query} onChange={event => { setQuery(event.target.value); setConfirmed(''); }} /></div>
    </div>}
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Buscando endereço...</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {candidates.length > 0 && <ul aria-label="Endereços encontrados" className="divide-y border rounded-md">
      {candidates.map((candidate, index) => <li key={`${candidate.label}-${index}`}>
        <Button variant="ghost" className="w-full h-auto justify-start whitespace-normal text-left gap-2 py-3" onClick={() => select(candidate)}>
          <MapPin className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{candidate.label}</span>
        </Button>
      </li>)}
    </ul>}
    {confirmed && <p role="status" className="text-sm text-muted-foreground break-words">{confirmed}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2 space-y-2"><Label htmlFor="checkout-street">Rua *</Label>
        <Input id="checkout-street" autoComplete="address-line1" maxLength={180} value={value.street} onChange={e => onChange({ street: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="checkout-number">Número *</Label><Input id="checkout-number" maxLength={30} value={value.number} onChange={e => onChange({ number: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="checkout-complement">Complemento</Label><Input id="checkout-complement" maxLength={100} value={value.complement} onChange={e => onChange({ complement: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="checkout-neighborhood">Bairro *</Label><Input id="checkout-neighborhood" maxLength={80} value={value.neighborhood} onChange={e => onChange({ neighborhood: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="checkout-city">Cidade *</Label><Input id="checkout-city" autoComplete="address-level2" maxLength={80} value={value.city ?? ''} onChange={e => onChange({ city: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="checkout-state">Estado (UF) *</Label><Input id="checkout-state" autoComplete="address-level1" maxLength={2} value={value.state ?? ''} onChange={e => onChange({ state: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} /></div>
    </div>
  </fieldset>;
}