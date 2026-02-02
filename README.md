# rdap-drop-watcher

Modular Node.js watcher untuk memantau domain .id via RDAP PANDI dan mengirim notifikasi ke Discord saat domain drop (RDAP HTTP 404).

## Install

```bash
npm install
```

## Setup env

```bash
copy .env.example .env
```

Setel `DISCORD_WEBHOOK_URL` dan `DOMAIN`.
Jika mau mention saat drop, set `DISCORD_MENTION_ID`.

## Run

```bash
node index.js
```

## Mode jam perang

Set `DEFAULT_INTERVAL=45`, `DEFAULT_JITTER=10`, `NOTIFY_ON=both`, `LOUD=true` di `.env`, lalu jalankan:

```bash
node index.js
```

## Catatan

- RDAP 404 = sinyal kuat domain sudah drop
- Segera beli di registrar
- Jangan polling terlalu agresif (30–180 detik)
- Status Discord akan di-update tiap `STATUS_UPDATE_INTERVAL_MS`
