/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Buffer } from "node:buffer";
const encoder = new TextEncoder();

export default {
  /**
   * 處理傳入的 HTTP 請求並生成簽名的 URL。
   *
   * @param {Request} request - 傳入的 HTTP 請求。
   * @param {{ SECRET_KEY: string }} env - 包含環境變數的對象，其中包含 SECRET_KEY。
   * @param {{ ZIP_HOST: string }} env - 包含環境變數的對象。
   * @returns {Promise<Response>} - 返回一個包含簽名 URL 的響應。
   */
  async fetch(request, env) {
    // 從環境變數中獲取秘密密鑰
    const secretKey = env.SECRET_KEY;
    const zipHost = env.ZIP_HOST;

    // 解析請求 URL
    const url = new URL(request.url);

    // 從 URL 參數中獲取 sid
    const sid = url.searchParams.get("sid");
    if (!sid) {
      return new Response("Missing 'sid' parameter", { status: 400 });
    }

    // 獲取當前時間
    const t = Math.floor(Date.now() / 1000);

    // 構建 URI 並生成要哈希的數據
    const uri = `awtb/${sid}/AWTB-${sid}.zip`;
    const dataToHash = `${t}${secretKey}${uri}${t}`;

    // 生成 SHA-1 哈希
    const hashBuffer = await crypto.subtle.digest(
      "SHA-1",
      encoder.encode(dataToHash)
    );
    const hash = Buffer.from(hashBuffer).toString("hex");

    // 構建包含簽名參數的 URL
    const signedUrl = new URL(uri, zipHost);
    signedUrl.searchParams.set("k", hash);

    // 返回包含簽名 URL 的響應
    return new Response(signedUrl.toString());
  },
};
