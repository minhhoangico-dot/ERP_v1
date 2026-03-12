import { supabase } from "./db/supabase";

async function run() {
    // Step 1: Total row count
    const { count } = await supabase
        .from("fdc_inventory_snapshots")
        .select("*", { count: "exact", head: true });
    console.log("Total rows in fdc_inventory_snapshots:", count);

    // Step 2: Distinct snapshot_dates
    const { data: allRows } = await supabase
        .from("fdc_inventory_snapshots")
        .select("snapshot_date, his_medicineid, current_stock, unit_price, name, warehouse")
        .order("snapshot_date", { ascending: true })
        .range(0, 999);

    const { data: allRows2 } = await supabase
        .from("fdc_inventory_snapshots")
        .select("snapshot_date, his_medicineid, current_stock, unit_price, name, warehouse")
        .order("snapshot_date", { ascending: true })
        .range(1000, 1999);

    const combined = [...(allRows || []), ...(allRows2 || [])];
    console.log("Fetched total rows:", combined.length);

    // Distinct dates
    const dates = [...new Set(combined.map((r) => r.snapshot_date))].sort();
    console.log("Distinct snapshot_dates:", dates);

    // Per date breakdown: pharmacy (has his_medicineid) vs inventory
    for (const d of dates) {
        const dayRows = combined.filter((r) => r.snapshot_date === d);
        const pharmacyRows = dayRows.filter((r) => r.his_medicineid != null);
        const inventoryRows = dayRows.filter((r) => r.his_medicineid == null);

        const pharmacyValue = pharmacyRows.reduce(
            (s, r) => s + (r.current_stock || 0) * (r.unit_price || 0),
            0
        );
        const inventoryValue = inventoryRows.reduce(
            (s, r) => s + (r.current_stock || 0) * (r.unit_price || 0),
            0
        );
        const pharmacyStock = pharmacyRows.reduce(
            (s, r) => s + (r.current_stock || 0),
            0
        );

        console.log(`\n--- ${d} ---`);
        console.log(`  Pharmacy items: ${pharmacyRows.length}, Stock: ${pharmacyStock}, Value: ${(pharmacyValue / 1e6).toFixed(1)}M`);
        console.log(`  Inventory items: ${inventoryRows.length}, Value: ${(inventoryValue / 1e6).toFixed(1)}M`);
    }

    // Step 3: Check for duplicates - same item appearing multiple times on same date
    for (const d of dates) {
        const dayRows = combined.filter(
            (r) => r.snapshot_date === d && r.his_medicineid != null
        );
        const seen = new Map<string, number>();
        for (const r of dayRows) {
            const key = `${r.his_medicineid}_${r.warehouse}`;
            seen.set(key, (seen.get(key) || 0) + 1);
        }
        const dupes = [...seen.entries()].filter(([_, c]) => c > 1);
        if (dupes.length > 0) {
            console.log(`\n  ⚠️  Duplicates on ${d}:`, dupes.length, "items have >1 row");
            dupes.slice(0, 5).forEach(([key, c]) => console.log(`    ${key}: ${c} rows`));
        } else {
            console.log(`\n  ✅ No duplicates on ${d}`);
        }
    }

    // Step 4: Top 10 items by value on most recent date
    const latestDate = dates[dates.length - 1];
    const latestPharmacy = combined
        .filter((r) => r.snapshot_date === latestDate && r.his_medicineid != null)
        .map((r) => ({
            name: r.name,
            stock: r.current_stock || 0,
            price: r.unit_price || 0,
            value: (r.current_stock || 0) * (r.unit_price || 0),
        }))
        .sort((a, b) => b.value - a.value);

    console.log(`\n--- Top 10 pharmacy items by value (${latestDate}) ---`);
    latestPharmacy.slice(0, 10).forEach((r, i) => {
        console.log(
            `  ${i + 1}. ${r.name}: stock=${r.stock}, price=${r.price}, value=${(r.value / 1e6).toFixed(1)}M`
        );
    });

    // Step 5: Check if value difference between days is explained
    if (dates.length >= 2) {
        const d1 = dates[0];
        const d2 = dates[1];
        const d1Pharmacy = combined.filter(
            (r) => r.snapshot_date === d1 && r.his_medicineid != null
        );
        const d2Pharmacy = combined.filter(
            (r) => r.snapshot_date === d2 && r.his_medicineid != null
        );

        // Find items that exist in d1 but not d2 and vice versa
        const d1Names = new Set(d1Pharmacy.map((r) => `${r.name}|${r.warehouse}`));
        const d2Names = new Set(d2Pharmacy.map((r) => `${r.name}|${r.warehouse}`));

        const onlyInD1 = d1Pharmacy.filter(
            (r) => !d2Names.has(`${r.name}|${r.warehouse}`)
        );
        const onlyInD2 = d2Pharmacy.filter(
            (r) => !d1Names.has(`${r.name}|${r.warehouse}`)
        );

        console.log(`\n--- Diff between ${d1} and ${d2} ---`);
        console.log(`  Items only in ${d1}: ${onlyInD1.length}`);
        console.log(`  Items only in ${d2}: ${onlyInD2.length}`);

        // Items with biggest value change
        const changes: { name: string; d1Val: number; d2Val: number; diff: number }[] = [];
        for (const r1 of d1Pharmacy) {
            const r2 = d2Pharmacy.find(
                (r) => r.name === r1.name && r.warehouse === r1.warehouse
            );
            if (r2) {
                const v1 = (r1.current_stock || 0) * (r1.unit_price || 0);
                const v2 = (r2.current_stock || 0) * (r2.unit_price || 0);
                changes.push({
                    name: r1.name,
                    d1Val: v1,
                    d2Val: v2,
                    diff: v2 - v1,
                });
            }
        }
        changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
        console.log(`\n  Top 10 biggest value changes:`);
        changes.slice(0, 10).forEach((c) => {
            console.log(
                `    ${c.name}: ${(c.d1Val / 1e6).toFixed(1)}M → ${(c.d2Val / 1e6).toFixed(1)}M (${c.diff > 0 ? "+" : ""}${(c.diff / 1e6).toFixed(1)}M)`
            );
        });
    }
}

run();
