import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('fdc_inventory_snapshots')
        .select('name, his_medicineid, current_stock, unit_price, snapshot_date')
        .is('his_medicineid', null)
        .eq('snapshot_date', new Date().toISOString().split('T')[0])
        .limit(10);
    console.log(data);
}
main();
