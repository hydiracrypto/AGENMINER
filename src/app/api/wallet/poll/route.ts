// ALIAS ROUTE — /api/wallet/poll (bebas kata "agentic" untuk WAF gateway)
// Handler diimpor 1:1 dari /api/agentic/poll.
import { GET as _GET } from "@/app/api/agentic/poll/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = _GET;
