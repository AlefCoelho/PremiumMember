import { requireAffiliate } from "@/lib/auth";
import { redirect } from "next/navigation";

// A casa do membro e a comunidade. O painel de indicacoes, comissoes e saques
// virou uma secao propria em /socio/ganhos. Este redirect mantem de pe os links
// de /socio que ja foram divulgados.
export default async function MemberHomePage() {
  await requireAffiliate();
  redirect("/socio/comunidade");
}
