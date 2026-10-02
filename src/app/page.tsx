import { SkillTreeApp } from "@/components/SkillTreeApp";
import { BuildProvider } from "@/state/BuildProvider";

export default function Home() {
  return (
    <BuildProvider>
      <SkillTreeApp />
    </BuildProvider>
  );
}
