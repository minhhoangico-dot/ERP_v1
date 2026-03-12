import dotenv from "dotenv";

dotenv.config();

export const config = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3333,

    supabase: {
        url: process.env.VITE_SUPABASE_URL || "",
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    },

    his: {
        host: process.env.HIS_DB_HOST || "",
        port: process.env.HIS_DB_PORT ? parseInt(process.env.HIS_DB_PORT, 10) : 0,
        database: process.env.HIS_DB_NAME || "",
        user: process.env.HIS_DB_USER || "",
        password: process.env.HIS_DB_PASSWORD || "",
    },

    misa: {
        server: process.env.MISA_DB_SERVER || "",
        port: process.env.MISA_DB_PORT ? parseInt(process.env.MISA_DB_PORT, 10) : 0,
        database: process.env.MISA_DB_NAME || "",
        user: process.env.MISA_DB_USER || "",
        password: process.env.MISA_DB_PASSWORD || "",
    }
};
