// ALIAS ROUTE — /api/wallet/signout (bebas kata "agentic" untuk WAF gateway)
// Handler diimpor 1:1 dari /api/agentic/signout.
import { POST as _POST, GET as _GET } from "@/app/api/agentic/signout/route";

export const dynamic = "force-dynamic";

export const POST = _POST;
export const GET = _GET;
