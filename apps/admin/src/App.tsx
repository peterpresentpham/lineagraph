import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { NotFound } from "./components/NotFound";
import { Login } from "./pages/Login";
import { PersonDetail } from "./pages/PersonDetail";
import { Persons } from "./pages/Persons";
import { PolityDetail } from "./pages/PolityDetail";
import { Polities } from "./pages/Polities";
import { Registries } from "./pages/Registries";
import { RelationTypes } from "./pages/RelationTypes";
import { Relationships } from "./pages/Relationships";
import { Sources } from "./pages/Sources";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/persons" element={<Persons />} />
          <Route path="/persons/:id" element={<PersonDetail />} />
          <Route path="/polities" element={<Polities />} />
          <Route path="/polities/:id" element={<PolityDetail />} />
          <Route path="/relationships" element={<Relationships />} />
          <Route path="/relation-types" element={<RelationTypes />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/registries" element={<Registries />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
