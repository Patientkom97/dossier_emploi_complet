// Edge Function « verifier-paiement » : vérifie un paiement IntaSend et active Premium.
// Secret à créer : INTASEND_SECRET_KEY (clé secrète ISSecretKey_...). Optionnel : INTASEND_LIVE=true en production.
// PREMIUM_AMOUNT (défaut 5) et PREMIUM_DAYS (défaut 30) sont modifiables dans les secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const rep = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    // 1) qui est l'utilisateur ?
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return rep({ ok: false, error: "Non connecté" }, 401);

    const { invoice_id } = await req.json();
    if (!invoice_id) return rep({ ok: false, error: "invoice_id manquant" }, 400);

    // 2) état réel du paiement chez IntaSend (avec la clé secrète)
    const live = Deno.env.get("INTASEND_LIVE") === "true";
    const base = live ? "https://payment.intasend.com" : "https://sandbox.intasend.com";
    const r = await fetch(`${base}/api/v1/payment/status/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("INTASEND_SECRET_KEY")}` },
      body: JSON.stringify({ invoice_id }),
    });
    const j = await r.json();
    const inv = j.invoice ?? {};
    if (!r.ok) return rep({ ok: false, error: "IntaSend a refusé la vérification", detail: j }, 502);
    if (inv.state !== "COMPLETE") return rep({ ok: false, state: inv.state, error: "Paiement non terminé" });
    if (inv.api_ref !== user.id) return rep({ ok: false, error: "Ce paiement appartient à un autre compte" }, 403);
    const min = Number(Deno.env.get("PREMIUM_AMOUNT") ?? "5");
    if (Number(inv.value) < min) return rep({ ok: false, error: "Montant insuffisant" }, 402);

    // 3) activation (clé de service : seule la fonction peut écrire dans abonnements)
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const note = `IntaSend ${invoice_id}`;
    const { data: cur } = await admin.from("abonnements").select("premium_until,note").eq("user_id", user.id).maybeSingle();
    if (cur?.note && cur.note.includes(invoice_id)) return rep({ ok: true, deja: true, premium_until: cur.premium_until });
    const days = Number(Deno.env.get("PREMIUM_DAYS") ?? "30");
    const from = cur?.premium_until && new Date(cur.premium_until) > new Date() ? new Date(cur.premium_until) : new Date();
    const until = new Date(from.getTime() + days * 864e5).toISOString();
    const { error } = await admin.from("abonnements").upsert({ user_id: user.id, premium_until: until, note, updated_at: new Date().toISOString() });
    if (error) return rep({ ok: false, error: error.message }, 500);
    return rep({ ok: true, premium_until: until });
  } catch (x) {
    return rep({ ok: false, error: String(x) }, 500);
  }
});
