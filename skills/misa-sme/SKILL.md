---
name: MISA SME Database
description: Connect to and query the MISA SME 2017 accounting database (SQL Server 2008 R2)
---

# MISA SME 2017 — Accounting Database

## Connection Details

| Parameter | Value |
|---|---|
| **Server** | `192.168.1.2,50114` |
| **Database** | `FDC` |
| **User** | `fdc_readonly` |
| **Password** | `StrongPassword123!` |
| **Engine** | SQL Server 2008 R2 |

## How to Query (PowerShell)

Use `System.Data.SqlClient.SqlConnection` — no extra modules needed.

```powershell
$connectionString = "Server=192.168.1.2,50114;Database=FDC;User Id=fdc_readonly;Password=StrongPassword123!;TrustServerCertificate=True"
$conn = New-Object System.Data.SqlClient.SqlConnection($connectionString)
$conn.Open()

$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TOP 5 * FROM GeneralLedger"
$reader = $cmd.ExecuteReader()

# read columns
for ($i = 0; $i -lt $reader.FieldCount; $i++) { Write-Host $reader.GetName($i) }

# read rows
while ($reader.Read()) {
    # access: $reader["ColumnName"]
}

$reader.Close()
$conn.Close()
```

> [!IMPORTANT]
> This is a **read-only** account. All queries are SELECT only.

## Key Tables

### `GeneralLedger` — Sổ cái tổng hợp
The main source for all accounting entries. One row per GL line.

| Column | Type | Description |
|---|---|---|
| `PostedDate` | datetime | Ngày hạch toán |
| `RefNo` | nvarchar | Số chứng từ (e.g. PT18087, BH0003788, UNC08771) |
| `AccountNumber` | nvarchar | Mã tài khoản (e.g. 1111, 51111, 5112) |
| `CreditAmount` | money | Số tiền bên Có |
| `DebitAmount` | money | Số tiền bên Nợ |
| `JournalMemo` | nvarchar | Diễn giải bút toán |
| `AccountObjectCode` | nvarchar | Mã đối tượng (khách hàng/NCC) |

### `GLVoucherDetail` — Chi tiết phiếu GL
Detail lines per voucher. Linked to `GLVoucherList` via `RefID`.

| Column | Type | Description |
|---|---|---|
| `RefID` | uniqueidentifier | FK to GLVoucherList |
| `DebitAccount` | nvarchar | TK Nợ |
| `CreditAccount` | nvarchar | TK Có |
| `Amount` | money | Số tiền |
| `Description` | nvarchar | Diễn giải dòng |
| `AccountObjectID` | uniqueidentifier | Đối tượng công nợ |

### `GLVoucherList` — Danh sách chứng từ GL
Master voucher list.

| Column | Type | Description |
|---|---|---|
| `RefID` | uniqueidentifier | PK |
| `RefDate` | datetime | Ngày chứng từ |
| `PostedDate` | datetime | Ngày hạch toán |
| `RefNo` | nvarchar | Số chứng từ |
| `JournalMemo` | nvarchar | Diễn giải |
| `RefType` | int | Mã loại chứng từ |

## Account Chart (Hệ thống Tài khoản)

### Revenue (Doanh thu)
| Account | Name | Description |
|---|---|---|
| `51111` | Thu dịch vụ y tế | Doanh thu khám bệnh, xét nghiệm, CĐHA... (retail) |
| `51112` | Thu chi BHYT | Theo dõi khoản thu BHYT (ghi thẳng cổng BHYT) |
| `51114` | Thu DVYT tại nhà | Dịch vụ y tế tại nhà |
| `5112` | Thu thuốc | Doanh thu bán thuốc |
| `5113` | Thu vắc xin | Doanh thu tiêm chủng |
| `5115` | Thu KSK | Doanh thu khám sức khỏe doanh nghiệp (B2B) |
| `5116` | Cho thuê | Doanh thu cho thuê (phòng, thiết bị) |
| `5117` | Thu phí card | Phí thẻ thành viên |
| `5118` | Thu khác | Doanh thu khác |

### Key Liability / Asset
| Account | Name | Description |
|---|---|---|
| `1111` | Tiền mặt | Cash — trục chính của hệ thống, mọi giao dịch chạy qua |
| `1121` | Tiền gửi NH | Bank account |
| `128` | Tiền gửi tiết kiệm | Savings deposits |
| `131` | Phải thu khách hàng | AR — chủ yếu dùng cho công nợ B2B (KSK) |
| `331` | Phải trả NCC | AP — nhà cung cấp thuốc, vắc xin |
| `3387` | Doanh thu chưa thực hiện | Prepaid vaccine packages (ceased ~2023) |

### Key Expense
| Account | Name | Description |
|---|---|---|
| `6321` | Nguyên liệu trực tiếp | Giá vốn thuốc/vắc xin |
| `6328` | Chi phí KSK | Chi phí khám sức khỏe doanh nghiệp |
| `6421` | Lương | Salary expense |
| `6429` | Chi phí quản lý khác | General admin |
| `635` | Chi phí tài chính | Phí chuyển khoản ngân hàng (~22K/lần) |

## Voucher Prefix Conventions

| Prefix | Meaning |
|---|---|
| `PT` | Phiếu Thu (Cash Receipt) — gộp doanh thu HIS hàng ngày |
| `PC` | Phiếu Chi (Cash Payment) |
| `UNC` | Ủy nhiệm chi (Bank Transfer) |
| `BH` | Hóa đơn bán hàng (Sales Invoice) — xuất thủ công cho B2B |
| `NK` | Nhập kho (Goods Receipt) |
| `XK` | Xuất kho (Goods Issue) |

## Data Flow: HIS → MISA

1. **Daily retail**: HIS ghi nhận từng phiếu thu bệnh nhân → Cuối ngày kế toán Dung gộp thành **1 Phiếu Thu (PT)** trên MISA cho mỗi loại doanh thu (51111, 5112, 5113).
2. **B2B contracts**: Hợp đồng KSK, vắc xin doanh nghiệp → Xuất **Hóa Đơn Bán Hàng (BH)** thủ công trên MISA → Ghi nhận 5115 hoặc 5113, đối ứng 131.
3. **B2B payments**: Thanh toán từ doanh nghiệp qua ngân hàng → Nợ 1121 / Có 131.
