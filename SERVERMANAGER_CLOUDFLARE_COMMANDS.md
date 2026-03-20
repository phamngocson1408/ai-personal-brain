# Commands cho ServerManager (Cloudflare + domain pnson.uk)

Mục tiêu: chạy app và publish ra internet bằng Cloudflare Tunnel với domain riêng.

## 0) Command thuần cực ngắn (copy nhanh)

```powershell
Set-Location D:\Workspace\Personal_Brain; docker compose --profile tunnel up -d
```

Lần đầu cần build:

```powershell
Set-Location D:\Workspace\Personal_Brain; docker compose --profile tunnel up -d --build
```

Dừng:

```powershell
Set-Location D:\Workspace\Personal_Brain; docker compose down
```

## A) Chuẩn bị 1 lần trong Cloudflare Dashboard

1. Vào **Zero Trust** → **Networks** → **Tunnels** → tạo tunnel mới.
2. Trong tunnel đó, tạo **Public Hostname** (ví dụ `brain.pnson.uk`).
3. Service type: `HTTP`.
4. URL: `http://frontend:80`.
5. Lấy **Tunnel Token**.

> Gợi ý: chỉ cần 1 hostname trỏ vào frontend, vì frontend nginx đã proxy `/api` sang backend nội bộ.

## B) Command khởi động (copy vào ServerManager)

### 1) Khởi động lần đầu / build lại image

```powershell
Set-Location D:\Workspace\Personal_Brain
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# Sửa file .env và điền đủ key trước khi chạy:
# - ANTHROPIC_API_KEY
# - OPENAI_API_KEY
# - DB_PASSWORD (nếu muốn đổi)
# - CLOUDFLARE_TUNNEL_TOKEN

docker compose --profile tunnel up -d --build
```

### 2) Khởi động nhanh (không build lại)

```powershell
Set-Location D:\Workspace\Personal_Brain
docker compose --profile tunnel up -d
```

### 3) Kiểm tra trạng thái

```powershell
Set-Location D:\Workspace\Personal_Brain
docker compose ps
docker compose logs --tail=150 cloudflared
```

### 4) Xem log realtime

```powershell
Set-Location D:\Workspace\Personal_Brain
docker compose logs -f cloudflared
```

### 5) Restart toàn bộ

```powershell
Set-Location D:\Workspace\Personal_Brain
docker compose --profile tunnel restart
```

### 6) Dừng toàn bộ

```powershell
Set-Location D:\Workspace\Personal_Brain
docker compose down
```

## C) Biến môi trường bắt buộc trong `.env`

Thêm/đảm bảo các biến sau có giá trị đúng:

```env
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
DB_PASSWORD=postgres
CLOUDFLARE_TUNNEL_TOKEN=...
```

## D) URL truy cập

- Nếu bạn cấu hình hostname là `brain.pnson.uk` thì truy cập: `https://brain.pnson.uk`
- Nếu muốn dùng root domain, cấu hình hostname tương ứng trong Cloudflare Tunnel rồi truy cập domain đó.
