# HomeWatch stream relay

This relay runs on an always-on computer connected to the same private network as the Dahua DVR. It converts the DVR's RTSP feeds into browser-compatible HLS without storing another copy of the recordings.

1. Install Docker on the trusted computer.
2. Copy `.env.example` to `.env` and replace the host and dedicated read-only DVR credentials locally.
3. Run `docker compose up -d` in this directory.
4. Confirm each local feed at `http://127.0.0.1:8888/cam1` through `cam4`.
5. Publish port 8888 only through an authenticated HTTPS tunnel or reverse proxy. Never forward the DVR's RTSP or management ports to the internet.
6. Set the website's `NEXT_PUBLIC_STREAM_BASE_URL` to that protected HTTPS relay origin.

The relay pulls a camera only while someone is watching. The DVR remains responsible for local recording and playback.
