import { listVendorScenarios } from "@/lib/vendorScenarios";
import SimulatorClient from "@/components/SimulatorClient";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const scenarios = await listVendorScenarios();
  return <SimulatorClient scenarios={scenarios} />;
}
