# Publish Personal Brain lên Internet bằng Cloudflared

Tài liệu này hướng dẫn cách chạy app để truy cập từ internet bằng `cloudflared` thông qua Docker Compose.

## 1) Điều kiện cần

- Đã cài Docker Desktop và Docker đang chạy.
- Có file `.env` ở thư mục gốc project.

Nếu chưa có `.env`:

```powershell
Copy-Item .env.example .env
```

## 2) Start app + Cloudflared (Quick Tunnel)

Quick Tunnel không cần tài khoản Cloudflare, nhưng URL sẽ thay đổi sau mỗi lần restart.

```powershell
docker compose --profile tunnel up -d --build
```

Kiểm tra container:

```powershell
docker compose ps
```

Lấy URL public từ log của `cloudflared`:

```powershell
docker compose logs -f cloudflared
```

Tìm dòng có domain dạng:

- `https://<random-subdomain>.trycloudflare.com`

Mở URL đó trên trình duyệt để truy cập app từ internet.

## 3) Stop app

```powershell
docker compose down
```

## 4) Dùng tunnel cố định (tuỳ chọn)

Nếu bạn muốn domain ổn định (không đổi), tạo Tunnel Token từ Cloudflare Zero Trust rồi thêm vào `.env`:

```env
CLOUDFLARE_TUNNEL_TOKEN=your_token_here
```

Sau đó start lại:

```powershell
docker compose --profile tunnel up -d
```

Khi có token, service `cloudflared` sẽ chạy chế độ tunnel cố định thay vì quick tunnel.

## 5) Troubleshooting nhanh

- Không thấy URL tunnel: chạy `docker compose logs cloudflared --tail=200`.
- Frontend không lên: kiểm tra `docker compose logs frontend --tail=200`.
- Backend lỗi: kiểm tra `docker compose logs backend --tail=200`.
- DB chưa sẵn sàng: chờ thêm vài giây rồi xem lại `docker compose ps`.
