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

// HMAC token 應該有效的時間（以秒為單位）
const EXPIRY = 60;

export default {
  /**
   *
   * @param {Request} request
   * @param {{SECRET_DATA: string}} env
   * @returns
   */
  async fetch(request, env) {
    // 你將需要一些用作對稱密鑰的秘密數據。這應該附加到你的 Worker 作為加密秘密。
    // 參考 https://developers.cloudflare.com/workers/configuration/secrets/
    const secretKeyData = encoder.encode(
      env.SECRET_DATA ?? "my secret symmetric key"
    );

    // 將你的秘密作為 CryptoKey 導入，用於 'sign' 和 'verify' 操作
    const key = await crypto.subtle.importKey(
      "raw",
      secretKeyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const url = new URL(request.url);

    // 這是一個允許未經認證訪問 /generate 的示範 Worker
    // 在真實應用中，你應該確保只有經過認證的用戶才能生成已簽名的 URL
    if (url.pathname.startsWith("/generate/")) {
      url.pathname = url.pathname.replace("/generate/", "/");

      const timestamp = Math.floor(Date.now() / 1000);

      // 這包含了你希望能夠驗證的所有請求數據
      // 這裡我們只簽署時間戳和路徑名，但通常你會希望包括更多數據（例如 URL 主機名或查詢參數）
      const dataToAuthenticate = `${url.pathname}${timestamp}`;

      const mac = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(dataToAuthenticate)
      );

      // 參考 https://developers.cloudflare.com/workers/runtime-apis/nodejs/
      // 獲取有關在 Workers 中使用 Node.js API 的更多詳細信息
      const base64Mac = Buffer.from(mac).toString("base64");

      url.searchParams.set("verify", `${timestamp}-${base64Mac}`);

      return new Response(`${url.pathname}${url.search}`);
      // 驗證所有非 /generate 的請求
    } else {
      // 確保你有最少必要的查詢參數。
      if (!url.searchParams.has("verify")) {
        return new Response("缺少查詢參數", { status: 403 });
      }

      const [timestamp, hmac] = url.searchParams.get("verify").split("-");

      const assertedTimestamp = Number(timestamp);

      const dataToAuthenticate = `${url.pathname}${assertedTimestamp}`;

      const receivedMac = Buffer.from(hmac, "base64");

      // 使用 crypto.subtle.verify() 來防範時間攻擊。
      // 由於 HMAC 使用對稱密鑰，你可以通過調用 crypto.subtle.sign() 然後進行字符串比較來實現這一點——這是不安全的，因為字符串比較在第一次不匹配時就退出，這會洩露信息給潛在的攻擊者。
      const verified = await crypto.subtle.verify(
        "HMAC",
        key,
        receivedMac,
        encoder.encode(dataToAuthenticate)
      );

      if (!verified) {
        return new Response("無效的 MAC", { status: 403 });
      }

      // 已簽名的請求在一分鐘後過期。注意，這個值應根據你的具體使用情況來設定
      if (Date.now() / 1000 > assertedTimestamp + EXPIRY) {
        return new Response(
          `URL 在 ${new Date((assertedTimestamp + EXPIRY) * 1000)} 過期`,
          { status: 403 }
        );
      }
    }

    return fetch(new URL(url.pathname, "https://example.com"), request);
  },
};

