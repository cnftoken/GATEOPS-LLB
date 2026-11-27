// GET /health (PRD 24.5.4). Cek koneksi DB -> {status:"ok"}.
import { handle } from "../_shared/handler.ts";
import { success } from "../_shared/response.ts";
import { ApiError } from "../_shared/errors.ts";
import { serviceClient } from "../_shared/db.ts";

Deno.serve((req) =>
  handle(req, {
    endpoint: "health",
    auth: false,
    public: true,
    run: async () => {
      const { error } = await serviceClient().from("accounts").select("id").limit(1);
      if (error) throw new ApiError("INTERNAL_ERROR");
      return success({ status: "ok" });
    },
  }),
);
