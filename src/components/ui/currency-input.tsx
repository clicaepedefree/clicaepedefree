import { Input } from "@/components/ui/input";
import { forwardRef } from "react";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const formatCurrency = (val: string) => {
      // Remove tudo que não é dígito
      const digits = val.replace(/\D/g, '');
      
      // Se não há dígitos, retorna string vazia
      if (!digits) return '';
      
      // Converte para número e formata como moeda
      const number = parseInt(digits) / 100;
      return number.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCurrency(e.target.value);
      onChange(formatted);
    };

    const getNumericValue = () => {
      if (!value) return '';
      // Remove formatação e retorna apenas números com ponto decimal
      const numbers = value.replace(/\./g, '').replace(',', '.');
      return numbers;
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
          R$
        </span>
        <Input
          ref={ref}
          {...props}
          value={value}
          onChange={handleChange}
          className="pl-10"
          placeholder="0,00"
        />
        <input
          type="hidden"
          name={props.name ? `${props.name}_numeric` : undefined}
          value={getNumericValue()}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

// Utility function to convert formatted currency to numeric value
export const currencyToNumber = (currency: string): number => {
  if (!currency) return 0;
  const numbers = currency.replace(/\./g, '').replace(',', '.');
  return parseFloat(numbers) || 0;
};

// Utility function to convert numeric value to formatted currency
export const numberToCurrency = (number: number): string => {
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};