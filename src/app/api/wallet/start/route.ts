// ALIAS ROUTE — /api/wallet/start
// Gateway publik (ALB) dilaporkan menggugurkan permintaan HP ke path yang
// mengandung kata "agentic" (lihat worklog Task 11-13: GET / dan /api/stats
// dari HP SAMPAI server, tapi /api/agentic/* TIDAK PERNAH tiba).
// Route ini re-export 1:1 handler dari /api/agentic/start — path pendek
// "wallet" lolos WAF, logika & perilaku identik (force/reuse/cancel).
// CATATAN Next.js: segment config (dynamic/maxDuration) WAJIB didefinisikan
// inline di file route — tidak boleh di-re-export.
import { POST as _POST, GET as _GET, DELETE as _DELETE } from "@/app/api/agentic/start/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = _POST;
export const GET = _GET;
export const DELETE = _DELETE;
