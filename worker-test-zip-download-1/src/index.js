/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// import { Buffer } from "node:buffer";
// import {
//   createCipheriv,
//   createDecipheriv
// } from("node:crypto");

const encoder = new TextEncoder();

export default {
  /**
   * 處理傳入的 HTTP 請求並生成簽名的 URL。
   *
   * @param {Request} request - 傳入的 HTTP 請求。
   * @param {{ SECRET_KEY: string }} env - 包含環境變數的對象，其中包含 SECRET_KEY。
   * @returns {Promise<Response>} - 返回一個包含簽名 URL 的響應。
   */
  async fetch(request, env) {
    // 從環境變數中獲取秘密密鑰
    const secretKey = env.SECRET_KEY;
    const originUrlHost = env.ORIGIN_URL_HOST;

    // 解析請求 URL
    const url = new URL(request.url);

    // 從 URL 參數中獲取 t k
    const t = url.searchParams.get("t");
    if (!t) {
      return new Response("Missing 't' parameter", { status: 400 });
    }

    const k = url.searchParams.get("k");
    if (!k) {
      return new Response("Missing 'k' parameter", { status: 400 });
    }

    // 獲取當前時間
    const now_t = Math.floor(Date.now() / 1000);

    if (t + 86400 > now_t) {
      return new Response("The timestamp is not valid", {status: 403});
    }

    // 構建 URI 並生成要哈希的數據
    const dataToHash = `${t}${secretKey}${url.pathname}${t}`;

    // 生成 SHA-1 哈希
    // const hashBuffer = await crypto.subtle.digest(
    //   "SHA-1",
    //   encoder.encode(dataToHash)
    // );
    // const hash = Buffer.from(hashBuffer).toString("hex");
    const hash = crypto.createHash('sha1').update(dataToHash).digest('hex');

    if (k !== hash) {
      return new Response("Authentication failed", {status: 403});
    }

    // // 構建包含簽名參數的 URL
    // const signedUrl = new URL(uri, zipHost);
    // signedUrl.searchParams.set("k", hash);

    // // 返回包含簽名 URL 的響應
    // return new Response(signedUrl.toString());

    // 原始伺服器的 URL
    const originUrl = originUrlHost + new URL(request.url).pathname

    // 設定回源的選項
    const fetchOptions = {
      method: request.method,
      headers: request.headers,
      body: request.method === 'POST' ? request.body : null
    }

    // 將請求發送回原始伺服器
    const response = await fetch(originUrl, fetchOptions)

    // 返回原始伺服器的響應
    return response
  },
};
