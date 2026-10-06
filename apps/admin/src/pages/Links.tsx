import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@lineagraph/ui";
import { Relationships } from "./Relationships";
import { Tenures } from "./Tenures";

// Relationships and offices in one place: both link people and polities to each other.
export function Links() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "tenures" ? "tenures" : "relations";
  return (
    <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
      <TabsList className="mb-6">
        <TabsTrigger value="relations">Quan hệ</TabsTrigger>
        <TabsTrigger value="tenures">Chức vụ</TabsTrigger>
      </TabsList>
      <TabsContent value="relations">
        <Relationships />
      </TabsContent>
      <TabsContent value="tenures">
        <Tenures />
      </TabsContent>
    </Tabs>
  );
}
