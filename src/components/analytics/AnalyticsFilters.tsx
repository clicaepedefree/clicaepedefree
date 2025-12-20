import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface AnalyticsFiltersProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

const presetOptions = [
  { label: "Hoje", value: "today" },
  { label: "Últimos 7 dias", value: "7days" },
  { label: "Esta semana", value: "thisWeek" },
  { label: "Este mês", value: "thisMonth" },
  { label: "Mês passado", value: "lastMonth" },
  { label: "Últimos 30 dias", value: "30days" },
  { label: "Personalizado", value: "custom" },
];

export function AnalyticsFilters({ dateRange, onDateRangeChange }: AnalyticsFiltersProps) {
  const [preset, setPreset] = useState("30days");

  const handlePresetChange = (value: string) => {
    setPreset(value);
    const today = new Date();
    
    switch (value) {
      case "today":
        onDateRangeChange({ from: today, to: today });
        break;
      case "7days":
        onDateRangeChange({ from: subDays(today, 6), to: today });
        break;
      case "thisWeek":
        onDateRangeChange({ 
          from: startOfWeek(today, { weekStartsOn: 0 }), 
          to: endOfWeek(today, { weekStartsOn: 0 }) 
        });
        break;
      case "thisMonth":
        onDateRangeChange({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        onDateRangeChange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
      case "30days":
        onDateRangeChange({ from: subDays(today, 29), to: today });
        break;
      case "custom":
        // Keep current selection or set default
        break;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent>
          {presetOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                "Selecione as datas"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      )}

      {dateRange?.from && dateRange?.to && (
        <div className="flex items-center text-sm text-muted-foreground">
          Período: {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} a{" "}
          {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
        </div>
      )}
    </div>
  );
}
