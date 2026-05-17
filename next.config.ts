import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  htmlLimitedBots:
    /WhatsApp|facebookexternalhit|Facebot|TelegramBot|Twitterbot|Slackbot|Bingbot|LinkedInBot|Discordbot|Googlebot/i,
};

export default nextConfig;