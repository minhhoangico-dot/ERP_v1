import { misaPool } from "../db/misa";
import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

export async function syncMisaPaymentsJob() {
    const startTime = Date.now();
    let recordsSynced = 0;

    try {
        logger.info("Starting syncMisaPaymentsJob...");

        // 1. Get all pending completion approval requests from Supabase
        // that have a misa reference waiting for payment
        const { data: requests, error: fetchErr } = await supabase
            .from("fdc_approval_requests")
            .select("id, request_number, request_type, title")
            .eq("status", "approved")
            .in("request_type", ["payment", "advance", "purchase"]);

        if (fetchErr) throw fetchErr;
        if (!requests || requests.length === 0) {
            logger.info("No approved financial requests waiting for MISA sync.");
            await logSync("syncMisaPayments", "completed", "MISA", 0, null, Date.now() - startTime);
            return;
        }

        // Prepare keywords to search
        const requestNumbers = requests.map(r => r.request_number);
        logger.info(`Checking MISA for ${requestNumbers.length} pending requests: ${requestNumbers.join(', ')}`);

        let matchedIds: string[] = [];

        // 2. Query MISA for Phiếu Chi (PC) vouchers 
        // Usually RefType = 11 (Phiếu Chi tiền mặt) or 16 (Ủy nhiệm chi UNC)
        // We'll search JournalMemo for the request numbers
        const query = `
      SELECT TOP 100 RefID, RefNo, JournalMemo, PostedDate 
      FROM GLVoucherList 
      WHERE RefNo LIKE 'PC%' OR RefNo LIKE 'UNC%'
      ORDER BY PostedDate DESC
    `;

        const result = await misaPool.request().query(query);
        const vouchers = result.recordset;

        // 3. Match vouchers against request numbers
        for (const voucher of vouchers) {
            if (!voucher.JournalMemo) continue;

            const memo = voucher.JournalMemo.toUpperCase();

            for (const req of requests) {
                if (!matchedIds.includes(req.id) && memo.includes(req.request_number.toUpperCase())) {
                    logger.info(`Matched Request ${req.request_number} with MISA Voucher ${voucher.RefNo}`);

                    // Update Supabase request status to completed
                    const { error: updateErr } = await supabase
                        .from("fdc_approval_requests")
                        .update({
                            status: "completed",
                            misa_reference: voucher.RefNo,
                            completed_at: new Date().toISOString()
                        })
                        .eq("id", req.id);

                    if (updateErr) {
                        logger.error(`Failed to update request ${req.request_number}`, updateErr);
                    } else {
                        matchedIds.push(req.id);
                        recordsSynced++;
                    }
                }
            }
        }

        await logSync("syncMisaPayments", "completed", "MISA", recordsSynced, null, Date.now() - startTime);
    } catch (error: any) {
        logger.error("syncMisaPaymentsJob failed", error);
        await logSync("syncMisaPayments", "failed", "MISA", recordsSynced, error.message, Date.now() - startTime);
    }
}
