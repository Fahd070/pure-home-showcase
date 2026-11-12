import { BrowserRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../i18n";
import { DemoStoreProvider } from "../data/store";
import { ToastProvider } from "../ui/Toast";
import { Shell } from "./Shell";
import { Overview } from "../pages/Overview";
import { Customers } from "../pages/Customers";
import { CustomerProfile } from "../pages/CustomerProfile";
import { Schedule } from "../pages/Schedule";
import { Workforce } from "../pages/Workforce";
import { Reports } from "../pages/Reports";
import { About } from "../pages/About";
import { NotFound } from "../pages/NotFound";

export function App() {
  return (
    <I18nProvider>
      <DemoStoreProvider>
        <ToastProvider>
          <BrowserRouter>
            <Shell>
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerProfile />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/workforce" element={<Workforce />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Shell>
          </BrowserRouter>
        </ToastProvider>
      </DemoStoreProvider>
    </I18nProvider>
  );
}
