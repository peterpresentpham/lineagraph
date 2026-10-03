import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Persons } from "./pages/Persons";
import { Polities } from "./pages/Polities";
import { Tenures } from "./pages/Tenures";
import { Parentage } from "./pages/Parentage";
import { Unions } from "./pages/Unions";
import { RelationsAdmin } from "./pages/RelationsAdmin";
import { ReviewQueue } from "./pages/ReviewQueue";
import { Sources } from "./pages/Sources";
import { Citations } from "./pages/Citations";
import { Registries } from "./pages/Registries";
import { ConsistencyReport } from "./pages/ConsistencyReport";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/persons" element={<Persons />} />
        <Route path="/polities" element={<Polities />} />
        <Route path="/tenures" element={<Tenures />} />
        <Route path="/parentage" element={<Parentage />} />
        <Route path="/unions" element={<Unions />} />
        <Route path="/relations-admin" element={<RelationsAdmin />} />
        <Route path="/review-queue" element={<ReviewQueue />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="/citations" element={<Citations />} />
        <Route path="/registries/:table" element={<Registries />} />
        <Route path="/consistency-report" element={<ConsistencyReport />} />
      </Routes>
    </BrowserRouter>
  );
}
