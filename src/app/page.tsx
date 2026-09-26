"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const last = localStorage.getItem("last_page");
    router.replace(last && last !== "/" ? last : "/location");
  }, [router]);

  return null;
}
