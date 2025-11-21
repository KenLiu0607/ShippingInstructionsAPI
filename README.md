# Shipping Instruction API（Evergreen / ShipmentLink）– 精華版 README

本系統透過 Evergreen ShipmentLink 提供的 **Shipping Instruction API v3.0.0**  
依 **DCSA Bill of Lading（SI + TD）標準**，建立與更新出口提單的 Shipping Instructions（SI）。

---

## 1. API 角色與目的
- **Carrier：Evergreen** → 提供 DCSA SI API  
- **Shipper（我方系統）** → 將 ERP / CHPIS 出口資料整理成 DCSA SI JSON  
- **核心用途：**
  - 建立 SI  
  - 查詢 SI 狀態  
  - 更新 SI  
  - 生成 Transport Document（提單）

---

## 2. API 基本資訊

### 2.1 Header
- `Authorization: Bearer {token}`
- `Content-Type: application/json`
- `Accept: application/json`
- `API-Version: 3`

### 2.2 Endpoint（簡化）
| 用途 | Method | Path |
|------|--------|------|
| 建立 SI | POST | `/v3/shipping-instructions` |
| 查詢 SI | GET | `/v3/shipping-instructions/{siRef}` |
| 更新 SI | PUT/PATCH | `/v3/shipping-instructions/{siRef}` |

> Base URL 與 Token API 請依 ShipmentLink 實際資料補充。

---

## 3. Request / Response 重點

### 3.1 建立（POST）
**Request 主要欄位：**
- `shippingInstructionsReference`
- `carrierBookingReference`
- `documentParties`
- `consignmentItems`
- `utilizedTransportEquipments`
- 各種 DCSA v3.0 常用欄位（如 place、paymentTerms、hsCodes…）

**Response：**
- `shippingInstructionsReference`
- SI 狀態（`DRFT`, `PENA`, `APPR`, `ISSU`…）
- 錯誤或 feedback（欄位被忽略、需補件等）

### 3.2 查詢（GET）
回傳該 SI 的最新內容與狀態，用於後續更新或追蹤。

### 3.3 更新（PUT/PATCH）
- 結構與 POST 類似  
- 某些欄位可能不可修改  
- Carrier 回傳 feedback 指示需修正欄位  

---

## 4. 回傳狀態碼（重點）
| 狀態碼 | 說明 |
|--------|------|
| `200` | 成功 |
| `202` | 已接受（Carrier 後端處理中） |
| `400` | 結構錯誤 / 欄位缺失 |
| `401/403` | 認證錯誤 |
| `404` | 指定 SI 不存在 |
| `500/503` | Carrier 系統錯誤 |

---

## 5. 系統整合重點
1. **維護 SI Reference 與 Booking Reference 對應**  
   追蹤 SI 狀態：DRFT → PENA → APPR → ISSU。

2. **使用統一的 camelCase DCSA JSON 模板**  
   包含 documentParties、consignmentItems、cargoItems、equipment 等。

3. **處理錯誤與 Feedback**  
   Evergreen 可能回傳 feedback，需要記錄與讓使用者修正。

4. **銜接 Transport Document 流程**  
   SI 狀態 APPR / ISSU 後，即可進入提單生成流程。

---

## 6. 備註
- ShipmentLink 的 API 文件看起來像 Swagger，但其實是自家客製的 API Document Viewer。  
- Response / Schema 詳細內容需由您展開後補入本文件。  

