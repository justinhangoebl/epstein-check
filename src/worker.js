// Cloudflare Worker — serves static assets from public/

export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
