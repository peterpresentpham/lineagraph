import { useParams } from "react-router-dom";
import { PagePlaceholder } from "../components/page-placeholder";

// A generic UI for every registry table (relation_type, office_type, name_kind...),
// used instead of ENUM — new values are added with INSERT (design doc section 5.1.3).
export function Registries() {
  const { table } = useParams();
  return <PagePlaceholder title={`Danh mục: ${table}`} />;
}
