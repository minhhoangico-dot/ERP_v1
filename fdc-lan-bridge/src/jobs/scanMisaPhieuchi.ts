import { misaPool } from "../db/misa";
import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

export async function scanMisaPhieuchiJob() {
    const startTime = Date.now();
    let recordsSynced = 0;

    try {
        logger.info("Starting scanMisaPhieuchiJob...");

        // 1. Fetch search keywords from Supabase
        const { data: keywords, error: kwErr } = await supabase
            .from("fdc_misa_scan_keywords")
            .select("keyword, category, alert_on_match")
            .eq("is_active", true);

        if (kwErr) throw kwErr;
        if (!keywords || keywords.length === 0) {
            logger.info("No active scan keywords found. Skipping.");
            await logSync("scanMisaPhieuchi", "completed", "MISA", 0, null, Date.now() - startTime);
            return;
        }

        // 2. Query recent General Ledger rows for Phiếu Chi
        // We only want the last 1-2 days to avoid full table scans continuously
        const query = `
      SELECT TOP 500
        RefNo, 
        PostedDate, 
        JournalMemo, 
        CreditAmount, 
        DebitAmount,
        AccountNumber
      FROM GeneralLedger 
      WHERE (RefNo LIKE 'PC%' OR RefNo LIKE 'UNC%')
      AND PostedDate >= DATEADD(day, -3, GETDATE())
      ORDER BY PostedDate DESC
    `;

        const result = await misaPool.request().query(query);
        const ledgerEntries = result.recordset;

        // 3. Scan for matches
        const matchesToInsert: any[] = [];
        const scannedRefNos = new Set<string>();

        for (const entry of ledgerEntries) {
            if (!entry.JournalMemo) continue;

            const memo = entry.JournalMemo.toUpperCase();
            let matchedKwObj = null;

            for (const kw of keywords) {
                if (memo.includes(kw.keyword.toUpperCase())) {
                    matchedKwObj = kw;
                    break; // just take the first matched keyword for now
                }
            }

            // If matched and we haven't already processed this RefNo in this batch
            if (matchedKwObj && !scannedRefNos.has(entry.RefNo)) {
                scannedRefNos.add(entry.RefNo);

                matchesToInsert.push({
                    misa_doc_number: entry.RefNo,
                    misa_doc_date: entry.PostedDate,
                    description: entry.JournalMemo,
                    amount: entry.DebitAmount || entry.CreditAmount || 0,
                    matched_keywords: [matchedKwObj.keyword],
                    category: matchedKwObj.category,
                    raw_data: { account: entry.AccountNumber },
                    synced_at: new Date().toISOString()
                });
            }
        }

        if (matchesToInsert.length > 0) {
            // Upsert findings to prevent duplicates on Doc Number
            const { error: insertErr } = await supabase
                .from("fdc_misa_phieuchi_scan")
                .upsert(matchesToInsert, { onConflict: "misa_doc_number" });

            if (insertErr) throw insertErr;
            recordsSynced = matchesToInsert.length;
            logger.info(`Inserted ${recordsSynced} suspicious MISA matches.`);
        }

        await logSync("scanMisaPhieuchi", "completed", "MISA", recordsSynced, null, Date.now() - startTime);
    } catch (error: any) {
        logger.error("scanMisaPhieuchiJob failed", error);
        await logSync("scanMisaPhieuchi", "failed", "MISA", recordsSynced, error.message, Date.now() - startTime);
    }
}
