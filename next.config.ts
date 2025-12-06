import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    USE_MOCK_DATA: process.env.USE_MOCK_DATA || "false",
  },
};

export default withNextIntl(nextConfig);
