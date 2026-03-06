import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok tunnels to access the local server
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'fogless-unsapiently-jeanmarie.ngrok-free.dev'
      ]
    }
  }
};

export default nextConfig;
