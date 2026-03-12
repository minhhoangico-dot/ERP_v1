import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { SupplyChartPoint, SupplyTimeRange } from "@/types/inventory";

type AccountFilter = "all" | "1521" | "1522" | "1523";

interface MonthlyRow {
  report_month: string;
  account: string;
  consumption_amount: number;
  consumption_qty: number;
  consumption_amount_ly: number;
  consumption_qty_ly: number;
  patient_volume: number;
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function rangeToMonths(range: SupplyTimeRange): number {
  switch (range) {
    case "1M":
      return 1;
    case "3M":
      return 3;
    case "6M":
      return 6;
    case "1Y":
      return 12;
  }
}

const RANGE_LABELS: Record<SupplyTimeRange, string> = {
  "1M": "1 tháng",
  "3M": "3 tháng",
  "6M": "6 tháng",
  "1Y": "1 năm",
};

export function useSupplyChart() {
  const [timeRange, setTimeRange] = useState<SupplyTimeRange>("3M");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMonthlyStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const cutoff = monthsAgo(12);

      const { data, error } = await supabase
        .from("fdc_supply_monthly_stats")
        .select("*")
        .gte("report_month", cutoff)
        .order("report_month", { ascending: true });

      if (error) {
        console.error("[useSupplyChart] fetch error:", error);
        setMonthlyData([]);
        return;
      }

      setMonthlyData(data || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthlyStats();

    const channel = supabase
      .channel("supply-chart-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fdc_supply_monthly_stats" },
        () => {
          fetchMonthlyStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMonthlyStats]);

  const chartData: SupplyChartPoint[] = useMemo(() => {
    const months = rangeToMonths(timeRange);
    const cutoff = monthsAgo(months);

    const filtered = monthlyData.filter(
      (r) => r.account === accountFilter && r.report_month >= cutoff
    );

    return filtered.map((r) => ({
      period: r.report_month,
      consumption: Number(r.consumption_amount) || 0,
      consumptionLY: Number(r.consumption_amount_ly) || 0,
      patientVolume: Number(r.patient_volume) || 0,
    }));
  }, [monthlyData, timeRange, accountFilter]);

  return {
    timeRange,
    setTimeRange,
    accountFilter,
    setAccountFilter,
    chartData,
    isLoading,
    RANGE_LABELS,
  };
}
