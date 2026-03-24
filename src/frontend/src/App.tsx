import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { ResourceType } from "./backend";
import AdminPage from "./pages/AdminPage";
import BookingPage from "./pages/BookingPage";
import HomePage from "./pages/HomePage";
import MyBookingsPage from "./pages/MyBookingsPage";

export type Page = "home" | "booking" | "myBookings" | "admin";

function pathToPage(pathname: string): Page {
  switch (pathname) {
    case "/admin":
      return "admin";
    case "/my-bookings":
      return "myBookings";
    case "/booking":
      return "booking";
    default:
      return "home";
  }
}

function pageToPath(page: Page): string {
  switch (page) {
    case "admin":
      return "/admin";
    case "myBookings":
      return "/my-bookings";
    case "booking":
      return "/booking";
    default:
      return "/";
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() =>
    pathToPage(window.location.pathname),
  );
  const [selectedGameType, setSelectedGameType] = useState<ResourceType>(
    ResourceType.ps5Console,
  );

  const navigateTo = (page: Page, gameType?: ResourceType) => {
    if (gameType) setSelectedGameType(gameType);
    setCurrentPage(page);
    window.history.pushState(null, "", pageToPath(page));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background font-poppins">
      {currentPage === "home" && <HomePage onNavigate={navigateTo} />}
      {currentPage === "booking" && (
        <BookingPage
          selectedGameType={selectedGameType}
          onNavigate={navigateTo}
        />
      )}
      {currentPage === "myBookings" && (
        <MyBookingsPage onNavigate={navigateTo} />
      )}
      {currentPage === "admin" && <AdminPage onNavigate={navigateTo} />}
      <Toaster />
    </div>
  );
}
