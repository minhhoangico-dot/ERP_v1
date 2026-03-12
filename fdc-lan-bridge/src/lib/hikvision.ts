import { logger } from "./logger";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { parseStringPromise } from "xml2js";

// @ts-ignore
import DigestFetch from "digest-fetch";

dayjs.extend(utc);
dayjs.extend(timezone);

const HIKVISION_HOST = process.env.HIKVISION_HOST || "";
const HIKVISION_USERNAME = process.env.HIKVISION_USERNAME || "admin";
const HIKVISION_PASSWORD = process.env.HIKVISION_PASSWORD || "";

export function toHikvisionFormat(date: Date | string): string {
    return dayjs(date).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ssZ");
}

async function request(endpoint: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    const url = `http://${HIKVISION_HOST}${endpoint}`;

    if (!HIKVISION_HOST || !HIKVISION_PASSWORD) {
        throw new Error("Hikvision credentials not configured in environment variables.");
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        // Must create a fresh client per request to avoid stale nonce HTTP 401s
        const client = new DigestFetch(HIKVISION_USERNAME, HIKVISION_PASSWORD, { algorithm: "MD5" });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const response = await client.fetch(url, {
                ...options,
                signal: controller.signal,
                headers: { "Content-Type": "application/json", ...options.headers }
            }) as Response;

            clearTimeout(timeoutId);

            if (!response.ok) {
                const text = await response.text().catch(() => "");
                throw new Error(`HTTP ${response.status} ${response.statusText} - ${text}`);
            }

            return response;
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (attempt === retries) {
                logger.error(`Hikvision request failed after ${retries} attempts: ${url}`, error);
                throw error;
            }
            logger.warn(`Hikvision request attempt ${attempt} failed. Retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    throw new Error("Impossible execution path");
}

export async function checkConnection() {
    try {
        const response = await request("/ISAPI/System/deviceInfo", { method: "GET" });
        const xml = await response.text();
        const result = (await parseStringPromise(xml)) as any;
        const deviceInfo = result.DeviceInfo;

        return {
            online: true,
            model: deviceInfo?.model?.[0] || "Unknown",
            deviceName: deviceInfo?.deviceName?.[0] || "Unknown",
            serialNumber: deviceInfo?.serialNumber?.[0] || "Unknown"
        };
    } catch (error: any) {
        return { online: false, error: error.message };
    }
}

async function searchAttendanceEvents(startTime: string, endTime: string, position = 0, maxResults = 30) {
    const body = {
        AcsEventCond: {
            searchID: String(Date.now()),
            searchResultPosition: position,
            maxResults: maxResults,
            major: 5,
            minor: 0,
            startTime,
            endTime
        }
    };

    const response = await request("/ISAPI/AccessControl/AcsEvent?format=json", {
        method: "POST",
        body: JSON.stringify(body)
    });

    return response.json();
}

export interface AttendanceEvent {
    eventId: string;
    employeeNo: string;
    name: string;
    cardNo: string;
    eventTime: string; // ISO 8601 Database format
    doorName: string;
    eventType: number;
    attendanceStatus: string;
}

export async function getAllEvents(startDate: Date, endDate: Date): Promise<AttendanceEvent[]> {
    const startTimeStr = toHikvisionFormat(startDate);
    const endTimeStr = toHikvisionFormat(endDate);

    const events: AttendanceEvent[] = [];
    let position = 0;
    const batchSize = 30; // Max batch size before device chokes
    let hasMore = true;

    logger.info(`Fetching Hikvision events from ${startTimeStr} to ${endTimeStr}`);

    while (hasMore) {
        const result = (await searchAttendanceEvents(startTimeStr, endTimeStr, position, batchSize)) as any;
        const acsEvent = result.AcsEvent || {};

        if (acsEvent.InfoList && Array.isArray(acsEvent.InfoList)) {
            for (const event of acsEvent.InfoList) {
                const eventTime = dayjs(event.time).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ssZ");

                events.push({
                    eventId: `${event.employeeNoString}_${event.time}`,
                    employeeNo: event.employeeNoString || "",
                    name: event.name || "",
                    cardNo: event.cardNo || "",
                    eventTime: eventTime,
                    doorName: event.doorName || "",
                    eventType: event.eventType || 0,
                    attendanceStatus: event.attendanceStatus || ""
                });
            }
        }

        const total = acsEvent.totalMatches || 0;
        const numReceived = acsEvent.numOfMatches || 0;

        position += batchSize;

        // Stop conditions specified in recordskill.md
        if (position >= total && total > 0) hasMore = false;
        else if (numReceived === 0) hasMore = false;
    }

    return events;
}
