---
name: HIS EHC Database
description: Connect to and query the HIS (Hospital Information System) PostgreSQL database for patient billing, services, medicines, and KSK data
---

# HIS EHC — Hospital Information System Database

## Connection Details

| Parameter | Value |
|---|---|
| **Host** | `192.168.1.253` |
| **Port** | `5642` |
| **Database** | `pkgd` |
| **User** | `n8n` |
| **Password** | `bsgd2022@EHC` |
| **Engine** | PostgreSQL |

## How to Query (Python + psycopg2)

```python
import psycopg2
import sys, io
# Fix Windows UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

conn = psycopg2.connect(
    host="192.168.1.253", port=5642, dbname="pkgd",
    user="n8n", password="bsgd2022@EHC", connect_timeout=10
)
cur = conn.cursor()
cur.execute("SELECT * FROM tb_invoice LIMIT 5")
rows = cur.fetchall()
cols = [d[0] for d in cur.description]
print(cols)
for row in rows:
    print(row)
cur.close()
conn.close()
```

> [!IMPORTANT]
> Always run with `python -X utf8 script.py` on Windows to prevent `UnicodeEncodeError` on Vietnamese text.

> [!NOTE]
> There are NO `dm_` lookup tables populated (e.g. `tb_dm_serviceobject` exists but is empty). Use the raw integer IDs and the mapping tables below.

## Core Tables Overview

HIS splits billing into **two separate invoice streams**:

| Table | Contents | 2025 Volume | 2025 Revenue |
|---|---|---|---|
| `tb_invoice` | Services & Vaccines (phiếu dịch vụ) | 62,615 phiếu | 15.6 tỷ |
| `tb_invoicemedicine` | Medicines only (phiếu thuốc) | 28,263 phiếu | 10.9 tỷ |
| **Combined HIS Total** | | **90,878** | **26.5 tỷ** |

### `tb_invoice` — Service & Vaccine Invoices

Main invoice table for all non-medicine billing.

| Column | Type | Description |
|---|---|---|
| `invoiceid` | int | PK |
| `invoicedate` | timestamp | Ngày xuất phiếu |
| `sotienphieu` | double | Tổng tiền phiếu |
| `dm_invoice_typeid` | int | Loại phiếu (1 = standard) |
| `dm_invoice_hinhthucid` | int | Hình thức thanh toán (see below) |
| `huyphieu_status` | int | 0 = active, 1 = cancelled |
| `hinhthucthutien` | text | Mô tả hình thức (usually blank) |
| `sotienmiengiam` | double | Số tiền miễn giảm |
| `sotienhoanung` | double | Số tiền hoàn ứng |
| `patientrecordid` | int | FK to patient record |

**`dm_invoice_hinhthucid` values:**
| ID | Meaning | 2023+ Volume | 2023+ Revenue |
|---|---|---|---|
| `0` | Standard (unclassified) | 205,138 | 51.4 tỷ |
| `7001` | Special (possibly KSK/corporate) | 8,805 | 1.86 tỷ |
| `1` | Cash | 6 | 5.4 triệu |
| `2` | Bank transfer | 18 | 18.6 triệu |
| `3` | Card | 2 | 255K |

### `tb_invoicemedicine` — Medicine Invoices

Separate billing table for all medicine dispensing.

| Column | Type | Description |
|---|---|---|
| `invoicemedicineid` | int | PK |
| `invoicemedicinedate` | timestamp | Ngày xuất phiếu thuốc |
| `sotienphieu` | double | Tổng tiền thuốc |
| `dm_invoice_typeid` | int | Loại phiếu |
| `huyphieu_status` | int | 0 = active |
| `medicinebillid` | int | FK to medicine bill |
| `patientrecordid` | int | FK to patient record |
| `sotienthucnhan` | double | Tiền thực nhận |
| `sotiennhaptra` | double | Tiền nhập trả |

### `tb_serviceinvoice` — Service Invoice Detail Lines

Detail lines for `tb_invoice`. Multiple lines per invoice.

| Column | Type | Description |
|---|---|---|
| `serviceinvoiceid` | int | PK |
| `invoiceid` | int | FK to tb_invoice |
| `invoicedate` | timestamp | Ngày phiếu |
| `serviceid` | int | FK to tb_service |
| `dm_serviceobjectid` | int | Đối tượng thanh toán (see below) |
| `dm_patientobjectid` | int | Đối tượng bệnh nhân |
| `sotiendathu` | double | Số tiền đã thu |
| `sotiencanthu` | double | Số tiền cần thu |
| `tongdathu` | double | Tổng đã thu |
| `tongchiphi` | double | Tổng chi phí |
| `huyphieu_status` | int | 0 = active |

**`dm_serviceobjectid` values (2025):**
| ID | Estimated Meaning | Invoice Lines | Revenue |
|---|---|---|---|
| `1` | Bệnh nhân tự trả (Self-pay) | 122,091 | 15.3 tỷ |
| `2` | Vắc xin | 22,146 | 274 triệu |
| `3` | Unknown (low value) | 769 | 5.3 triệu |
| `4` | Unknown (low value) | 508 | 5.5 triệu |
| `9` | Miễn phí / BHYT | 548 | 0 |
| `11` | Miễn phí | 152 | 0 |
| `16` | Unknown | 274 | 0 |

### `tb_service` — Service Master

| Column | Type | Description |
|---|---|---|
| `serviceid` | int | PK |
| `servicename` | text | Tên dịch vụ |
| `servicecode` | text | Mã dịch vụ |
| `servicecodebhyt` | text | Mã BHYT |
| `hospitalunitid` | int | Khoa/phòng |

### `tb_patient` — Patient Master

| Column | Type | Description |
|---|---|---|
| `patientid` | int | PK |
| `patientname` | text | Họ tên |
| `patientcode` | text | Mã bệnh nhân |

### `tb_treatment` — Treatment Records

| Column | Type | Description |
|---|---|---|
| `treatmentid` | int | PK |
| `patientrecordid` | int | FK |
| `treatmentdate` | timestamp | Ngày khám |

## KSK (Corporate Health Check) Tables

### `tb_ksk_nhanvien` — KSK Employee Records
Tracks individual employees in corporate health check programs.

| Column | Type | Description |
|---|---|---|
| `ksk_nhanvienid` | int | PK |
| `ksk_hosodangkyid` | int | FK to registration file (contract) |
| `ksk_goikhamid` | int | FK to health check package |
| `patientrecordid` | int | FK to patient record |
| `patientname` | text | Tên nhân viên |
| `ngaydenkham` | timestamp | Ngày đến khám |
| `suckhoe_ketluan` | text | Kết luận sức khỏe |
| `suckhoe_xeploai` | int | Xếp loại sức khỏe |

**Volume by year:**
| Year | Patients |
|---|---|
| 2022 | 1,829 |
| 2023 | 13,328 |
| 2024 | 11,140 |
| 2025 | 14,630 |

> [!NOTE]
> KSK billing data is **NOT** in HIS. KSK contracts are billed via MISA directly using `BH` vouchers → account `5115`. HIS only tracks the medical examination data.

## Other Notable Tables

### `tb_invoice_misahsm` — E-Invoice (HĐDT) Log
Log of electronic invoice submissions. **Not** a MISA accounting integration.

| Column | Type | Description |
|---|---|---|
| `invoiceid` | int | FK to tb_invoice |
| `invoicemedicineid` | int | FK to tb_invoicemedicine |
| `ngayphathanh` | timestamp | Ngày phát hành HĐDT |
| `input` | text | JSON request to e-invoice provider |
| `output` | text | JSON response |

### `tb_invoice_date_stt` — Daily Invoice Counter
Sequential invoice numbering per day. Over 233,000 entries as of March 2026.

### `tb_medicinebill` — Medicine Prescription
Prescription/dispensing records (clinical side). Contains diagnosis, doctor, department, and export status but **no financial totals** (those are in `tb_invoicemedicine`).

### `tb_servicedata` — Service Data (Clinical)
Individual service performed per patient. Links clinical data to billing.

| Column | Type | Description |
|---|---|---|
| `servicedataid` | int | PK |
| `serviceid` | int | FK to tb_service |
| `patientrecordid` | int | FK |
| `invoiceid` | int | FK to tb_invoice |
| `ksk_hosodangkyid` | int | FK (links to KSK contract if applicable) |
| `isthutien` | int | Đã thu tiền? |

### `tb_tonghopsolieu` — Aggregated Statistics
JSON-based summary data used by HIS dashboards. Categorized by `dm_loaisolieuid`:

| ID | Content |
|---|---|
| `1001-1005` | Facility-wide statistics (daily/cumulative) |
| `1008` | Room-level examination breakdown |

### `tb_mediboxlogsql_YYYY_MM` — SQL Audit Log
Monthly partitioned tables containing **full SQL audit logs** of all HIS operations. Each table is 1+ GB. Available for forensic investigation if needed.

## HIS → MISA Revenue Mapping (Verified 2025)

| HIS Source | MISA Account | Match Quality |
|---|---|---|
| `tb_invoicemedicine.sotienphieu` | `5112` (Thu thuốc) | ✅ **100% exact** per month |
| `tb_invoice.sotienphieu` (daily PT) | `51111` + `5113` | ✅ **100% exact** for retail |
| KSK contracts (not in HIS) | `5115` (Thu KSK) | ⚠️ MISA only (BH vouchers) |
| B2B vaccine contracts (not in HIS) | `5113` (Thu vắc xin) | ⚠️ MISA only (BH vouchers) |

> [!IMPORTANT]
> The daily Phiếu Thu (`PT`) entries in MISA are compiled by accountant "Dung" from HIS data.
> Corporate B2B invoices (`BH`) are entered manually in MISA and do NOT appear in HIS `tb_invoice`.
