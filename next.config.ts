import type { NextConfig } from "next";
import { config } from "dotenv";

config();

const localIp = process.env.LOCAL_IP;

const nextConfig: NextConfig = {
  allowedDevOrigins: localIp ? [localIp] : [],
};

export default nextConfig;
