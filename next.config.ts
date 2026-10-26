import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        // HTML root JANGAN di-cache — setelah Deploy/Publish, browser yang masih
        // memegang HTML lama memuat chunk JS lama yang memanggil path API lama
        // (mati/WAF) → modal merah "Couldn't reach the Binance network".
        source: "/",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
