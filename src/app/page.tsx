import Builder from "@/components/Builder";
import { publicOrigin } from "@/lib/site";

export default function Home() {
  return <Builder publicOrigin={publicOrigin()} />;
}
