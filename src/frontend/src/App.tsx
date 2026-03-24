import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { ResourceType } from "./backend";
import AdminPage from "./pages/AdminPage";
import BookingPage from "./pages/BookingPage";
import HomePage from "./pages/HomePage";
import MyBookingsPage from "./pages/MyBookingsPage";

export type Page = "home" | "booking" | "myBookings" | "admin";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedGameType, setSelectedGameType] = useState<ResourceType>(
    ResourceType.ps5Console,
  );

  const navigateTo = (page: Page, gameType?: ResourceType) => {
    if (gameType) setSelectedGameType(gameType);
    setCurrentPage(page);
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
