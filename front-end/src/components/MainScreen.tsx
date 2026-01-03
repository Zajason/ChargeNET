"use client";
import { Menu, User } from "lucide-react";
import { MapView } from "./MapView";

export function MainScreen() {
  const handleMenu = () => console.log("Open menu");
  const handleProfile = () => console.log("Go to profile page");

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MapView />

      <button
        onClick={handleMenu}
        className="absolute top-4 left-4 z-[1000] bg-white rounded-full p-3 shadow-md hover:bg-gray-100 transition"
        aria-label="Menu"
      >
        <Menu className="w-6 h-6 text-gray-800" />
      </button>

      <button
        onClick={handleProfile}
        className="absolute top-4 right-4 z-[1000] bg-white rounded-full p-3 shadow-md hover:bg-gray-100 transition"
        aria-label="Profile"
      >
        <User className="w-6 h-6 text-gray-800" />
      </button>
    </div>
  );
}