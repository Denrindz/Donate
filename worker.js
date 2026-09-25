export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================
    // KIỂM TRA TRẠNG THÁI THANH TOÁN
    // GET /payment?code=DXM-123456
    // =========================
    if (request.method === "GET" && url.pathname === "/payment") {
      const code = url.searchParams.get("code");

      if (!code) {
        return Response.json(
          { error: "missing code" },
          { status: 400 }
        );
      }

      const payment = await env.PAYMENTS.get(code);

      if (!payment) {
        return Response.json({
          status: "pending"
        });
      }

      return Response.json(JSON.parse(payment));
    }

    // =========================
    // NHẬN WEBHOOK TỪ SEPAY
    // POST /webhook
    // =========================
    if (
      request.method === "POST" &&
      url.pathname === "/webhook"
    ) {
      const body = await request.text();

      const signature =
        request.headers.get("X-SePay-Signature");

      if (!signature) {
        return new Response("Missing signature", {
          status: 401
        });
      }

      const valid = await verifyHMAC(
        body,
        signature,
        env.SEPAY_SECRET
      );

      if (!valid) {
        return new Response("Invalid signature", {
          status: 401
        });
      }

      let data;

      try {
        data = JSON.parse(body);
      } catch {
        return new Response("Invalid JSON", {
          status: 400
        });
      }

      // Nội dung chuyển khoản
      const content = String(
        data.transaction_content || ""
      );

      // Tìm mã DXM-123456
      const match = content.match(/DXM-\d{6}/i);

      // Không có mã của website thì bỏ qua
      if (!match) {
        return Response.json({
          success: true,
          matched: false
        });
      }

      const code = match[0].toUpperCase();

      const amount = Number(
        data.transfer_amount || 0
      );

      // Lưu giao dịch vào KV
      await env.PAYMENTS.put(
        code,
        JSON.stringify({
          status: "paid",
          amount: amount,
          code: code,
          paidAt: Date.now()
        }),
        {
          expirationTtl: 86400
        }
      );

      return Response.json({
        success: true,
        matched: true
      });
    }

    return new Response("OK");
  }
};


// =========================
// KIỂM TRA HMAC-SHA256
// =========================
async function verifyHMAC(body, signature, secret) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );

  const expected = [...new Uint8Array(mac)]
    .map(b =>
      b.toString(16).padStart(2, "0")
    )
    .join("");

  return timingSafeEqual(
    expected.toLowerCase(),
    signature.toLowerCase()
  );
}


// =========================
// SO SÁNH CHỮ KÝ AN TOÀN
// =========================
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);
  }

  return result === 0;
}