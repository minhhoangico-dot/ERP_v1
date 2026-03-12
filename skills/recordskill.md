---
name: Hikvision Attendance Machine Record Skill
description: How to connect to a Hikvision attendance machine (máy chấm công) via ISAPI and query attendance records
---

# Hikvision Attendance Machine — Connect & Query Records

This skill documents how to connect to a **Hikvision attendance/access control device** over the local network (LAN) using its **ISAPI HTTP API**, and how to query attendance (chấm công) records from it.

---

## 1. Prerequisites

### Hardware
- Hikvision attendance device (e.g., DS-K1T331W or similar face recognition terminal)
- Device must be on the **same LAN** as the application server
- Device IP must be reachable (e.g., `192.168.1.11`)

### Software Dependencies
```json
{
  "digest-fetch": "^3.1.1",
  "dayjs": "^1.11.10",
  "xml2js": "^0.6.2"
}
```

### Environment Variables
```env
HIKVISION_HOST=192.168.1.11
HIKVISION_USERNAME=admin
HIKVISION_PASSWORD=your_password_here
HIKVISION_TIMEOUT=30000
TZ=Asia/Ho_Chi_Minh
```

---

## 2. Authentication — Digest Auth (MD5)

Hikvision ISAPI **requires Digest Authentication**. You must use the `digest-fetch` library.

> [!CAUTION]
> Always create a **fresh client per request** to avoid "stale nonce" errors (HTTP 401). Never reuse a single digest session across multiple calls.

```javascript
const DigestFetch = (await import('digest-fetch')).default;

const client = new DigestFetch(
    'admin',          // username
    'your_password',  // password
    { algorithm: 'MD5' }  // MUST explicitly set MD5
);
```

---

## 3. Key API Endpoints

| Purpose | Method | Endpoint |
|---|---|---|
| Check Connection / Device Info | `GET` | `/ISAPI/System/deviceInfo` |
| Search Employees | `POST` | `/ISAPI/AccessControl/UserInfo/Search?format=json` |
| Search Attendance Events | `POST` | `/ISAPI/AccessControl/AcsEvent?format=json` |
| Get Event Capabilities | `GET` | `/ISAPI/AccessControl/AcsEvent/capabilities?format=json` |
| Get Total Event Count | `POST` | `/ISAPI/AccessControl/AcsEventTotalNum?format=json` |

---

## 4. Connecting to the Device

### Step 1: Test Connection
Send a `GET` request to `/ISAPI/System/deviceInfo` to verify the device is reachable.

```javascript
async function checkConnection() {
    const client = new DigestFetch(username, password, { algorithm: 'MD5' });
    const url = `http://${HIKVISION_HOST}/ISAPI/System/deviceInfo`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await client.fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const xml = await response.text();
            // Parse XML for device info (deviceName, model, serialNumber, etc.)
            return { online: true, message: 'Connected successfully' };
        }
        throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        clearTimeout(timeoutId);
        return { online: false, message: error.message };
    }
}
```

### Step 2: HTTP Request Wrapper with Retry
The device hardware is weak. Always implement **retry logic** (max 3 attempts, 2s delay) and **hard timeout** via `AbortController`.

```javascript
async function request(endpoint, options = {}, retries = 3) {
    const client = new DigestFetch(username, password, { algorithm: 'MD5' });
    const url = `http://${HIKVISION_HOST}${endpoint}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await client.fetch(url, {
                ...options,
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json', ...options.headers }
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (attempt === retries) throw error;
            console.warn(`Attempt ${attempt} failed. Retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}
```

---

## 5. Querying Attendance Records

### Payload Structure (AcsEventCond)

> [!IMPORTANT]
> The device is **very sensitive** to JSON structure. Use the exact `AcsEventCond` format below. Incorrect structures will return empty results or errors.

```json
{
    "AcsEventCond": {
        "searchID": "search_1703456789",
        "searchResultPosition": 0,
        "maxResults": 30,
        "major": 5,
        "minor": 0,
        "startTime": "2024-01-15T00:00:00+07:00",
        "endTime": "2024-01-15T23:59:59+07:00"
    }
}
```

| Field | Value | Description |
|---|---|---|
| `searchID` | `String(Date.now())` | Unique per request — avoids device-side caching |
| `searchResultPosition` | `0, 30, 60, ...` | Offset for pagination |
| `maxResults` | **30** (max 50) | Batch size — keep small, device will hang on large values |
| `major` | `5` | Event category: **5 = Access Control** (face/card verification) |
| `minor` | `0` | Sub-type: **0 = all** sub-types |
| `startTime` / `endTime` | ISO 8601 with timezone | **Must include timezone offset** (e.g., `+07:00`) |
| `employeeNoString` | `"123"` (optional) | Filter by specific employee number |

### Sending the Query

```javascript
async function searchAttendanceEvents(startTime, endTime, employeeNo = null) {
    const body = {
        AcsEventCond: {
            searchID: String(Date.now()),
            searchResultPosition: 0,
            maxResults: 30,
            major: 5,
            minor: 0,
            startTime,  // e.g., "2024-01-15T00:00:00+07:00"
            endTime     // e.g., "2024-01-15T23:59:59+07:00"
        }
    };

    if (employeeNo) {
        body.AcsEventCond.employeeNoString = String(employeeNo);
    }

    const response = await request(
        '/ISAPI/AccessControl/AcsEvent?format=json',
        { method: 'POST', body: JSON.stringify(body) }
    );
    return response.json();
}
```

### Response Structure

```json
{
    "AcsEvent": {
        "searchID": "...",
        "totalMatches": 150,
        "numOfMatches": 30,
        "responseStatusStrg": "MORE",
        "InfoList": [
            {
                "employeeNoString": "101",
                "name": "Nguyễn Văn A",
                "time": "2024-01-15T07:45:30+07:00",
                "cardNo": "",
                "doorName": "Door 1",
                "eventType": 196893,
                "attendanceStatus": "checkIn"
            }
        ]
    }
}
```

---

## 6. Pagination — MANDATORY

> [!WARNING]
> **Never** try to fetch all records in a single request. The device hardware is weak and will crash/timeout with large queries.

### Rules
- Batch size: **30** records per request (max 50)
- Use a `while(hasMore)` loop incrementing `searchResultPosition` by `batchSize`

### Stop Conditions
1. `searchResultPosition >= totalMatches` (when `totalMatches > 0`)
2. `numOfMatches === 0` (fallback for firmware that doesn't return `totalMatches`)
3. `numOfMatches < batchSize` AND `totalMatches === 0` (partial batch fallback)

### Implementation

```javascript
async function getAllEvents(startTime, endTime, employeeNo = null) {
    const events = [];
    let position = 0;
    const batchSize = 30;
    let hasMore = true;

    while (hasMore) {
        const result = await searchAttendanceEvents(
            startTime, endTime, employeeNo, position, batchSize
        );

        const acsEvent = result.AcsEvent || {};

        if (acsEvent.InfoList && Array.isArray(acsEvent.InfoList)) {
            events.push(...acsEvent.InfoList);
        }

        const total = acsEvent.totalMatches || 0;
        const numReceived = acsEvent.numOfMatches || 0;

        position += batchSize;

        // Stop conditions
        if (position >= total && total > 0) hasMore = false;
        else if (numReceived === 0) hasMore = false;
    }

    return events;
}
```

---

## 7. Querying Employees

### Payload

```json
{
    "UserInfoSearchCond": {
        "searchID": "search_1703456789",
        "searchResultPosition": 0,
        "maxResults": 30
    }
}
```

### Response Fields per Employee

| Field | Description |
|---|---|
| `employeeNo` | Employee ID number |
| `name` | Employee display name |
| `numOfCard` | Number of registered cards |
| `userType` | `"normal"` or `"admin"` |
| `Valid` | Object containing `cardNo` if card is registered |

Use the same **pagination pattern** as attendance events (batch size 30, `while(hasMore)` loop).

---

## 8. Time Format — Hikvision ISAPI

> [!IMPORTANT]
> Always include the **timezone offset** in time strings. The device silently ignores requests with incorrect time formats.

```javascript
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// Correct format: "2024-01-15T00:00:00+07:00"
function toHikvisionFormat(date) {
    return dayjs(date).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ssZ');
}

function startOfDay(date) {
    return dayjs(date).tz('Asia/Ho_Chi_Minh').startOf('day');
}

function endOfDay(date) {
    return dayjs(date).tz('Asia/Ho_Chi_Minh').endOf('day');
}
```

---

## 9. Parsing Event Records

When receiving records from the device, normalize them into a clean format:

```javascript
function parseAttendanceEvent(event) {
    const eventTime = dayjs(event.time)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD HH:mm:ss');

    return {
        eventId: `${event.employeeNoString}_${event.time}`,  // Unique ID
        employeeNo: event.employeeNoString || '',
        name: event.name || '',
        cardNo: event.cardNo || '',
        eventTime,
        doorName: event.doorName || '',
        eventType: event.eventType || 0,
        attendanceStatus: event.attendanceStatus || ''
    };
}
```

> [!NOTE]
> The device does **not** provide a unique event ID. Generate one by combining `employeeNo` + `time`. This ID is used for database UPSERT deduplication.

---

## 10. Syncing to Local Database (SQLite)

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS attendance_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE,
    employee_no TEXT NOT NULL,
    name TEXT,
    card_no TEXT,
    event_time TEXT NOT NULL,
    door_name TEXT,
    event_type INTEGER,
    attendance_status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_employee ON attendance_events(employee_no);
CREATE INDEX IF NOT EXISTS idx_events_time ON attendance_events(event_time);
```

### UPSERT Pattern (Deduplication)

```sql
INSERT INTO attendance_events
    (event_id, employee_no, name, card_no, event_time, door_name, event_type, attendance_status)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(event_id) DO UPDATE SET
    name = excluded.name,
    card_no = excluded.card_no,
    door_name = excluded.door_name,
    event_type = excluded.event_type,
    attendance_status = excluded.attendance_status
```

### Sync Strategy

1. **Daily Sync**: Query device for one day at a time. Add 500ms delay between days.
2. **Catch-up Sync**: Find `MAX(event_time)` from DB → subtract 1 hour → query from that point to now. UPSERT handles overlap.
3. **Auto Sync**: Use `node-cron` to sync every 5 minutes during work hours.

---

## 11. Common Pitfalls & Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| HTTP 401 on every request | Stale digest nonce | Create fresh `DigestFetch` client per request |
| Empty `InfoList` / 0 events | Wrong `major` value or bad time format | Use `major: 5`, ensure timezone in time string |
| Device hangs / timeout | `maxResults` too large | Keep `maxResults` ≤ 30 |
| Infinite pagination loop | Unreliable `totalMatches` | Also check `numOfMatches === 0` as stop condition |
| Duplicate records in DB | Re-syncing same period | Use UPSERT with unique `event_id` |
| Time mismatch | Device timezone vs app timezone | Always use `dayjs.tz()` with explicit timezone |

---

## 12. Quick Start Checklist

1. [ ] Install dependencies: `npm install digest-fetch dayjs xml2js`
2. [ ] Set environment variables (`HIKVISION_HOST`, `USERNAME`, `PASSWORD`)
3. [ ] Test connection with `GET /ISAPI/System/deviceInfo`
4. [ ] Query employees with `POST /ISAPI/AccessControl/UserInfo/Search?format=json`
5. [ ] Query events with `POST /ISAPI/AccessControl/AcsEvent?format=json`
6. [ ] Implement pagination (batch size 30)
7. [ ] Parse and normalize event records
8. [ ] Set up local SQLite database with UPSERT sync

---

*Reference implementation: [client.js](file:///g:/cursor-anti/chamcong-v1/src/hikvision/client.js), [parser.js](file:///g:/cursor-anti/chamcong-v1/src/hikvision/parser.js), [attendance.js](file:///g:/cursor-anti/chamcong-v1/src/services/attendance.js)*
