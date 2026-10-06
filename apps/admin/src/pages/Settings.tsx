import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@lineagraph/ui";
import { Registries } from "./Registries";
import { RelationTypes } from "./RelationTypes";

// The vocabularies the forms draw their choices from; rarely touched, so they live apart from
// the content.
export function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "registries" ? "registries" : "relation-types";
  return (
    <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
      <TabsList className="mb-6">
        <TabsTrigger value="relation-types">Loại quan hệ</TabsTrigger>
        <TabsTrigger value="registries">Danh mục</TabsTrigger>
      </TabsList>
      <TabsContent value="relation-types">
        <RelationTypes />
      </TabsContent>
      <TabsContent value="registries">
        <Registries />
      </TabsContent>
    </Tabs>
  );
}
