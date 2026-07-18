# HomeWatch

Private four-camera dashboard for a Dahua DVR. The website displays browser-compatible HLS feeds while the DVR remains responsible for local recording.

## Local preview

```bash
npm install
npm run dev
```

The interface stays in safe preview mode until `NEXT_PUBLIC_STREAM_BASE_URL` is configured. DVR credentials belong only in `streaming/.env` on the trusted home-side computer.

## Stream relay

See `streaming/README.md`. The included MediaMTX service pulls the four DVR channels on demand and exposes HLS on localhost for an authenticated HTTPS tunnel or reverse proxy.

Never expose the DVR management, RTSP, or device-service ports directly to the internet.
