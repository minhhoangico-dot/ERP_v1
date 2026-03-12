import { hisPool } from "../db/his";
import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

export async function syncStaffJob() {
    const startTime = Date.now();
    let recordsSynced = 0;

    try {
        logger.info("Starting syncStaffJob...");

        // Fetch from HIS
        // Fetch from HIS
        const result = await hisPool.query(`
      SELECT nhanvienid, nhanvienname, nhanvienphone, nhanvienemail, dm_nhanvientypeid 
      FROM tb_nhanvien 
      WHERE nhanviendisable = 0 OR nhanviendisable IS NULL
    `);

        const staff = result.rows;
        logger.info(`Found ${staff.length} staff records in HIS`);

        // Fetch existing mapping from Supabase to preserve role and supabase_uid
        const { data: existingUsers } = await supabase.from("fdc_user_mapping").select("his_nhanvienid, role, supabase_uid, department_id, department_name");
        const existingMap = new Map(existingUsers?.map(u => [u.his_nhanvienid, u]) || []);

        // Prepare upsert payload
        const upsertData = staff.map(emp => {
            const existing = existingMap.get(emp.nhanvienid);

            // Infer role for doctors based on name prefix or dm_nhanvientypeid = 4
            let defaultRole = "employee";
            const nameUpper = (emp.nhanvienname || "").toUpperCase();
            if (
                nameUpper.startsWith("BS") ||
                nameUpper.startsWith("THS. BS") ||
                nameUpper.startsWith("THS.BS") ||
                emp.dm_nhanvientypeid === 4
            ) {
                defaultRole = "doctor";
            }

            return {
                his_nhanvienid: emp.nhanvienid,
                full_name: emp.nhanvienname,
                display_name: emp.nhanvienname,
                phone: emp.nhanvienphone || null,
                email: emp.nhanvienemail || null,
                is_active: true,
                // Override with inferred 'doctor' if the existing role was just 'employee'
                role: (existing?.role && existing.role !== "employee") ? existing.role : defaultRole,
                supabase_uid: existing?.supabase_uid || null,
                department_id: existing?.department_id || null,
                department_name: existing?.department_name || null,
                updated_at: new Date().toISOString()
            };
        });

        if (upsertData.length > 0) {
            // Upsert to Supabase
            const { error } = await supabase.from("fdc_user_mapping").upsert(
                upsertData,
                { onConflict: "his_nhanvienid" }
            );

            if (error) throw error;
            recordsSynced = upsertData.length;
        }

        await logSync("syncStaff", "completed", "HIS", recordsSynced, null, Date.now() - startTime);
    } catch (error: any) {
        logger.error("syncStaffJob failed", error);
        await logSync("syncStaff", "failed", "HIS", recordsSynced, error.message, Date.now() - startTime);
    }
}
