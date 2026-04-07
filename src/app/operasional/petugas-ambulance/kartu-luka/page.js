import { redirect } from "next/navigation";

export default function KartuLukaLegacyPage() {
  redirect("/operasional/petugas-ambulance/permintaan?tab=kartu-luka");
}
