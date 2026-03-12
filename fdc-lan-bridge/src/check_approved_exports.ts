import { supabase } from "./db/supabase";

async function run() {
    try {
        const { data, error } = await supabase
            .from('fdc_inventory_snapshots')
            .select('name, approved_export')
            .gt('approved_export', 0);

        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.table(data);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
