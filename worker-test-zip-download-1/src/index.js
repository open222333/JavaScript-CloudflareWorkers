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
const expiry = 86400;

export default {
	/**
	 * 處理傳入的 HTTP 請求並生成簽名的 URL。
	 *
	 * @param {Request} request - 傳入的 HTTP 請求。
	 * @param {{ SECRET_KEY: string }} env - 包含環境變數的對象，其中包含 SECRET_KEY。
	 * @returns {Promise<Response>} - 返回一個包含簽名 URL 的響應。
	 */

  async toHexString(byteArray) {
    // 使用 Array.from 將 byteArray 轉換為一個新的數組
    return Array.from(byteArray, function (byte) {
      // 將每個 byte 與 0xff 進行位運算，確保 byte 是一個 8 位的數字
      // 將 byte 轉換為 16 進制字符串，並使用 (0 + 字符串) 的方式保證每個字節都至少是兩位數
      return ('0' + (byte & 0xff).toString(16)).slice(-2);
    }).join(''); // 將所有的 16 進制字符串連接成一個整體字符串
  },

	async fetch(request, env) {
		// 從環境變數中獲取秘密密鑰
		const secretKey = env.SECRET_KEY;
		const originUrlHost = env.ORIGIN_URL_HOST;

		// 解析請求 URL
		const url = new URL(request.url);

		// 從 URL 參數中獲取 t, k
		const t = Number(url.searchParams.get('t'));
		if (!t) {
			return new Response("Missing 't' parameter", { status: 400 });
		}

		const k = url.searchParams.get('k');
		if (!k) {
			return new Response("Missing 'k' parameter", { status: 400 });
		}

		// 獲取當前時間
		const now_t = Math.floor(Date.now() / 1000);

		if (t + expiry < now_t) {
			return new Response('The timestamp is not valid', { status: 403 });
		}

		// 構建 URI 並生成要哈希的數據
		const dataToHashBateArray = encoder.encode(`${t}${secretKey}${url.pathname}${t}`);

		const kByteArray = await crypto.subtle.digest(
			{
				name: 'SHA-1',
			},
			dataToHashBateArray // The data you want to hash as an ArrayBuffer
		);
		const now_k = await this.toHexString(new Uint8Array(kByteArray));

		if (k !== now_k) {
			return new Response('Authentication failed', { status: 403 });
		}

		// 見一個新 headers 參照原 headers
		const headers = new Headers();
		for (const [name, value] of request.headers.entries()) {
			if (name === 'host') {
				headers.append(name, new URL(originUrlHost).hostname);
			} else {
				headers.append(name, value);
			}
		}

		// 設定回源的選項
		const fetchOptions = {
			headers: headers,
		};

		// console.log(fetchOptions);

		// 將請求發送回原始伺服器
		try {
			return fetch(new URL(url.pathname, originUrlHost), fetchOptions);
		} catch (e) {
			return new Response(JSON.stringify({ error: e.message }), {
				status: 500,
			});
		}

    // 測試用
		// return new Response('Pass', { status: 200 });
	},
};
