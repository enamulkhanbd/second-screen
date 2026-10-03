/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Legacy invitation links used /?invite=<token>.
    return [
      {
        source: "/",
        has: [{ type: "query", key: "invite", value: "(?<token>.+)" }],
        destination: "/invite/:token",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
