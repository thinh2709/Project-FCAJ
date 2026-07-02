import { Metadata } from "next";
import { MyTicketsClient } from "./MyTicketsClient";

export const metadata: Metadata = {
  title: "Vé của tôi | Ticketing Platform",
  description: "Quản lý vé bạn đã đặt",
};

export default function MyTicketsPage() {
  return <MyTicketsClient />;
}
