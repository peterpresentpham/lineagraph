import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { Layout } from "./components/Layout";
import { Consistency } from "./pages/Consistency";
import { Dashboard } from "./pages/Dashboard";
import { NotFound } from "./components/NotFound";
import { Login } from "./pages/Login";
import { PersonDetail } from "./pages/PersonDetail";
import { Persons } from "./pages/Persons";
import { Places } from "./pages/Places";
import { PolityDetail } from "./pages/PolityDetail";
import { Polities } from "./pages/Polities";
import { Registries } from "./pages/Registries";
import { RelationTypes } from "./pages/RelationTypes";
import { Relationships } from "./pages/Relationships";
import { Sources } from "./pages/Sources";

// A data router (not <BrowserRouter>) so forms can block navigation while they hold unsaved edits.
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/persons" element={<Persons />} />
        <Route path="/persons/:id" element={<PersonDetail />} />
        <Route path="/polities" element={<Polities />} />
        <Route path="/polities/:id" element={<PolityDetail />} />
        <Route path="/places" element={<Places />} />
        <Route path="/relationships" element={<Relationships />} />
        <Route path="/relation-types" element={<RelationTypes />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="/registries" element={<Registries />} />
        <Route path="/consistency" element={<Consistency />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </>,
  ),
);

export default function App() {
  return <RouterProvider router={router} />;
}
