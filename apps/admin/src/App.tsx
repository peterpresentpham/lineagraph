import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
} from "react-router-dom";
import { Layout } from "./components/Layout";
import { Consistency } from "./pages/Consistency";
import { Dashboard } from "./pages/Dashboard";
import { NotFound } from "./components/NotFound";
import { Links } from "./pages/Links";
import { Login } from "./pages/Login";
import { PersonDetail } from "./pages/PersonDetail";
import { Persons } from "./pages/Persons";
import { Places } from "./pages/Places";
import { EventDetail } from "./pages/EventDetail";
import { Events } from "./pages/Events";
import { PolityDetail } from "./pages/PolityDetail";
import { Polities } from "./pages/Polities";
import { Settings } from "./pages/Settings";
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
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/polities" element={<Polities />} />
        <Route path="/polities/:id" element={<PolityDetail />} />
        <Route path="/places" element={<Places />} />
        <Route path="/links" element={<Links />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/relationships" element={<Navigate to="/links?tab=relations" replace />} />
        <Route path="/tenures" element={<Navigate to="/links?tab=tenures" replace />} />
        <Route
          path="/relation-types"
          element={<Navigate to="/settings?tab=relation-types" replace />}
        />
        <Route path="/sources" element={<Sources />} />
        <Route path="/registries" element={<Navigate to="/settings?tab=registries" replace />} />
        <Route path="/quality" element={<Consistency />} />
        <Route path="/consistency" element={<Navigate to="/quality" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </>,
  ),
);

export default function App() {
  return <RouterProvider router={router} />;
}
