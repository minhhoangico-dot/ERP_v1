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

interface DailyRow {
  report_date: string;
  account: string;
  consumption_amount: number;
  consumption_qty: number;
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
  const [timeRange, setTimeRange] = useState<SupplyTimeRange>("1Y");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMonthlyStats = useCallback(async () => {
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
  }, []);

  const fetchDailySummary = useCallback(async () => {
    try {
      const today = new Date();
      const past = new Date();
      past.setDate(today.getDate() - 95);
      const cutoff = past.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("fdc_supply_daily_summary")
        .select("*")
        .gte("report_date", cutoff)
        .order("report_date", { ascending: true });

      if (error) {
        console.error("[useSupplyChart] daily fetch error:", error);
        setDailyData([]);
        return;
      }

      setDailyData(data || []);
    } catch (err) {
      console.error("[useSupplyChart] daily fetch unexpected error:", err);
      setDailyData([]);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchMonthlyStats(), fetchDailySummary()]).finally(() =>
      setIsLoading(false)
    );

    const channel = supabase
      .channel("supply-chart-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fdc_supply_monthly_stats" },
        () => {
          fetchMonthlyStats();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fdc_supply_daily_summary" },
        () => {
          fetchDailySummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMonthlyStats, fetchDailySummary]);

  const chartData: SupplyChartPoint[] = useMemo(() => {
    const useDaily = timeRange === "1M" || timeRange === "3M";
    if (useDaily) {
      const days = timeRange === "1M" ? 31 : 93;
      const today = new Date();
      const past = new Date();
      past.setDate(today.getDate() - days);
      const cutoff = past.toISOString().split("T")[0];

      const byDate = new Map<
        string,
        { amount: number; qty: number; patients: number }
      >();

      dailyData.forEach((row) => {
        if (row.report_date < cutoff) return;
        if (accountFilter !== "all" && row.account !== accountFilter) return;
        if (accountFilter === "all" && row.account === "all") return;

        const existing = byDate.get(row.report_date) || {
          amount: 0,
          qty: 0,
          patients: 0,
        };
        byDate.set(row.report_date, {
          amount: existing.amount + Number(row.consumption_amount || 0),
          qty: existing.qty + Number(row.consumption_qty || 0),
          patients:
            existing.patients || Number.isFinite(row.patient_volume)
              ? Number(row.patient_volume || 0)
              : existing.patients,
        });
      });

      const monthlyTotalsByMonth = new Map<string, number>();
      monthlyData.forEach((r) => {
        if (accountFilter === "all" && r.account !== "all") return;
        if (accountFilter !== "all" && r.account !== accountFilter) return;
        monthlyTotalsByMonth.set(r.report_month, Number(r.consumption_amount) || 0);
      });

      const entries = Array.from(byDate.entries()).sort((a, b) =>
        a[0].localeCompare(b[0])
      );

      return entries.map(([date, v]) => {
        const perVisit =
          v.patients && v.patients > 0 ? v.amount / v.patients : 0;
        const [y, m] = date.split("-");
        const lyMonth = `${parseInt(y, 10) - 1}-${m}`;
        const consumptionLY = timeRange === "3M" ? (monthlyTotalsByMonth.get(lyMonth) || 0) : 0;
        return {
          period: date,
          consumption: v.amount,
          consumptionLY,
          patientVolume: v.patients,
          consumptionQty: v.qty,
          consumptionPerVisit: perVisit,
        };
      });
    }

    const months = rangeToMonths(timeRange);
    const cutoff = monthsAgo(months);

    const filtered = monthlyData.filter((r) => r.report_month >= cutoff);

    const byMonth = new Map<
      string,
      {
        amount: number;
        amountLY: number;
        qty: number;
        patients: number;
      }
    >();

    filtered.forEach((r) => {
      if (accountFilter === "all" && r.account === "all") {
        const existing = byMonth.get(r.report_month) || {
          amount: 0,
          amountLY: 0,
          qty: 0,
          patients: 0,
        };
        byMonth.set(r.report_month, {
          amount: Number(r.consumption_amount || 0),
          amountLY: Number(r.consumption_amount_ly || 0),
          qty: Number(r.consumption_qty || 0),
          patients: Number(r.patient_volume || 0),
        });
      } else if (accountFilter !== "all" && r.account === accountFilter) {
        const existing = byMonth.get(r.report_month) || {
          amount: 0,
          amountLY: 0,
          qty: 0,
          patients: 0,
        };
        byMonth.set(r.report_month, {
          amount: existing.amount + Number(r.consumption_amount || 0),
          amountLY: existing.amountLY + Number(r.consumption_amount_ly || 0),
          qty: existing.qty + Number(r.consumption_qty || 0),
          patients: Number(r.patient_volume || 0),
        });
      }
    });

    const entries = Array.from(byMonth.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    return entries.map(([month, v]) => {
      const perVisit =
        v.patients && v.patients > 0 ? v.amount / v.patients : 0;
      return {
        period: month,
        consumption: v.amount,
        consumptionLY: v.amountLY,
        patientVolume: v.patients,
        consumptionQty: v.qty,
        consumptionPerVisit: perVisit,
      };
    });
  }, [dailyData, monthlyData, timeRange, accountFilter]);

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
