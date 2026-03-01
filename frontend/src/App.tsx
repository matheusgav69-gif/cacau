import { useState, useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { OffersPage } from "./pages/OffersPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { Footer } from "./components/Footer";

function getViewFromPath(path: string): "home" | "offers" | "checkout" {
  if (path === "/offers") return "offers";
  if (path === "/checkout") return "checkout";
  return "home";
}

export function App() {
  const [view, setViewState] = useState<"home" | "offers" | "checkout">(
    () => getViewFromPath(window.location.pathname)
  );

  useEffect(() => {
    const onPop = () => setViewState(getViewFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function setView(v: "home" | "offers" | "checkout") {
    setViewState(v);
    let newPath = "/";
    if (v === "offers") newPath = "/offers";
    if (v === "checkout") newPath = "/checkout";
    window.history.pushState(null, "", newPath);
  }

  return (
    <div className="app-shell">
      {view === "home" ? (
        <HomePage onRedeem={() => setView("offers")} />
      ) : view === "offers" ? (
        <OffersPage
          onBack={() => setView("home")}
          onCheckout={() => setView("checkout")}
        />
      ) : (
        <CheckoutPage
          onBack={() => setView("offers")}
          onSuccess={() => {
            setView("home");
            try {
              localStorage.removeItem("cs_cart");
            } catch {}
          }}
        />
      )}
      <Footer />
    </div>
  );
}



