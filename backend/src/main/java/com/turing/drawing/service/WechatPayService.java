package com.turing.drawing.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.turing.drawing.entity.VipSubscription;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.cert.X509Certificate;
import java.security.cert.CertificateFactory;
import java.time.Instant;
import java.util.*;

/**
 * 微信支付 V3 API 封装
 * 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml
 *
 * 依赖配置（backend/.env）：
 *   WECHAT_MINI_PROGRAM_APP_ID    = 微信小程序 AppID
 *   WECHAT_MINI_PROGRAM_APP_SECRET = 微信小程序 AppSecret
 *   WECHAT_PAY_MCH_ID             = 商户号
 *   WECHAT_PAY_API_V3_KEY         = APIv3 密钥（商户平台 → API安全 设置）
 *   WECHAT_PAY_SERIAL_NO          = 商户证书序列号
 *   WECHAT_PAY_PRIVATE_KEY        = 商户私钥内容（PEM 格式，去头尾和换行，或读文件）
 *   WECHAT_PAY_NOTIFY_URL         = 支付回调地址，如 https://api.image-zero.art/api/payment/callback
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WechatPayService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── 微信支付 V3 配置 ───────────────────────────────────────
    @Value("${wechat.pay.mch-id:}")
    private String mchId;

    @Value("${wechat.pay.api-v3-key:}")
    private String apiV3Key;

    @Value("${wechat.pay.serial-no:}")
    private String serialNo;

    @Value("${wechat.pay.private-key:}")
    private String privateKeyPem;   // PEM 内容（去头尾）或 classpath: 路径

    @Value("${wechat.pay.notify-url:}")
    private String notifyUrl;

    @Value("${wechat.mini-program-app-id:}")
    private String miniProgramAppId;

    @Value("${wechat.pay.platform-cert-path:}")
    private String platformCertPath;  // 微信支付平台证书路径（PEM 格式）

    private static final String JSAPI_URL =
            "https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi";

    private static final String NATIVE_URL =
            "https://api.mch.weixin.qq.com/v3/pay/transactions/native";

    private PrivateKey cachedPrivateKey = null;

    // ═══════════════════════════════════════════════════════
    //  生成 JSAPI 支付参数（给小程序 wx.requestPayment 用）
    // ═══════════════════════════════════════════════════════

    /**
     * 创建 JSAPI 订单，返回前端拉起支付所需参数
     *
     * @param subscription 订单记录（含 id / amountCents / plan）
     * @param planName   套餐名称（用于 description）
     * @param openid     用户微信 openid
     * @return Map 含 timeStamp / nonceStr / package / signType / paySign
     */
    public Map<String, String> createJSAPIOrder(VipSubscription subscription,
                                                 String planName,
                                                 String openid) {
        if (mchId.isBlank() || apiV3Key.isBlank()) {
            throw new IllegalStateException("微信支付未配置（mch-id / api-v3-key），请在 .env 中填写");
        }

        String outTradeNo = "VIP" + subscription.getId() + "T" + System.currentTimeMillis();
        long amount = subscription.getAmountCents();   // 单位：分
        String description = "图灵绘境 - " + planName;

        // 构造请求体
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("appid", miniProgramAppId);
        body.put("mchid", mchId);
        body.put("description", description);
        body.put("out_trade_no", outTradeNo);
        body.put("notify_url", notifyUrl.isBlank()
                ? "https://api.image-zero.art/api/payment/callback"
                : notifyUrl);

        Map<String, Object> amountMap = new LinkedHashMap<>();
        amountMap.put("total", amount);
        amountMap.put("currency", "CNY");
        body.put("amount", amountMap);

        Map<String, Object> payer = new LinkedHashMap<>();
        payer.put("payer_openid", openid);
        body.put("payer", payer);

        String requestBody;
        try {
            requestBody = objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("构造支付请求体失败", e);
        }

        log.info("[微信支付] 创建 JSAPI 订单: outTradeNo={}, amount={}分, openid={}",
                outTradeNo, amount, openid);

        // 发送请求
        HttpHeaders headers = buildAuthHeaders("POST", "/v3/pay/transactions/jsapi", requestBody);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        RestTemplate rt = new RestTemplate();
        ResponseEntity<Map> resp;
        try {
            resp = rt.exchange(JSAPI_URL, HttpMethod.POST, entity, Map.class);
        } catch (Exception e) {
            log.error("[微信支付] 统一下单请求失败", e);
            throw new RuntimeException("微信支付下单失败: " + e.getMessage());
        }

        if (resp.getStatusCode() != HttpStatus.OK || resp.getBody() == null) {
            log.error("[微信支付] 统一下单返回异常: {}", resp);
            throw new RuntimeException("微信支付下单失败（HTTP " + resp.getStatusCode() + "）");
        }

        Map<String, Object> respBody = resp.getBody();
        String prepayId = (String) respBody.get("prepay_id");
        if (prepayId == null || prepayId.isBlank()) {
            log.error("[微信支付] 响应中无 prepay_id: {}", respBody);
            throw new RuntimeException("微信支付下单失败：未获取到 prepay_id");
        }

        log.info("[微信支付] 下单成功: prepayId={}", prepayId);

        // 构造前端支付参数（JSAPI 签名）
        return buildJSAPIPayParams(prepayId);
    }

    /**
     * 创建积分充值订单（同 JSAPI 流程，只是 description 不同）
     */
    public Map<String, String> createJSAPIOrderForCredit(Long orderId,
                                                         long amountCents,
                                                         String description,
                                                         String openid) {
        if (mchId.isBlank() || apiV3Key.isBlank()) {
            throw new IllegalStateException("微信支付未配置（mch-id / api-v3-key），请在 .env 中填写");
        }

        String outTradeNo = "CR" + orderId + "T" + System.currentTimeMillis();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("appid", miniProgramAppId);
        body.put("mchid", mchId);
        body.put("description", description);
        body.put("out_trade_no", outTradeNo);
        body.put("notify_url", notifyUrl.isBlank()
                ? "https://api.image-zero.art/api/payment/callback"
                : notifyUrl);

        Map<String, Object> amountMap = new LinkedHashMap<>();
        amountMap.put("total", amountCents);
        amountMap.put("currency", "CNY");
        body.put("amount", amountMap);

        Map<String, Object> payer = new LinkedHashMap<>();
        payer.put("payer_openid", openid);
        body.put("payer", payer);

        String requestBody;
        try {
            requestBody = objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("构造支付请求体失败", e);
        }

        log.info("[微信支付-积分] 创建订单: outTradeNo={}, amount={}分", outTradeNo, amountCents);

        HttpHeaders headers = buildAuthHeaders("POST", "/v3/pay/transactions/jsapi", requestBody);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        RestTemplate rt = new RestTemplate();
        ResponseEntity<Map> resp = rt.exchange(JSAPI_URL, HttpMethod.POST, entity, Map.class);

        if (resp.getStatusCode() != HttpStatus.OK || resp.getBody() == null) {
            throw new RuntimeException("微信支付下单失败（HTTP " + resp.getStatusCode() + "）");
        }

        String prepayId = (String) resp.getBody().get("prepay_id");
        if (prepayId == null || prepayId.isBlank()) {
            throw new RuntimeException("微信支付下单失败：未获取到 prepay_id");
        }

        return buildJSAPIPayParams(prepayId);
    }

    // ═══════════════════════════════════════════════════════
    //  处理微信支付回调（V3 格式）
    // ═══════════════════════════════════════════════════════

    /**
     * 验证回调签名并解密通知数据
     *
     * @param body       请求体（JSON 字符串）
     * @param signature  Header: Wechatpay-Signature
     * @param timestamp  Header: Wechatpay-Timestamp
     * @param nonce      Header: Wechatpay-Nonce
     * @param apiV3Key   APIv3 密钥（用于解密 resource）
     * @return 解密后的通知数据 Map { out_trade_no, transaction_id, trade_state, ... }
     */
    public Map<String, Object> verifyAndDecryptCallback(String body,
                                                       String signature,
                                                       String timestamp,
                                                       String nonce) {
        // 1. 验证签名
        if (!verifySignature(body, signature, timestamp, nonce)) {
            throw new SecurityException("微信支付回调签名验证失败");
        }

        // 2. 解析 JSON，解密 resource
        try {
            Map<String, Object> notification = objectMapper.readValue(body, Map.class);
            Map<String, Object> resource = (Map<String, Object>) notification.get("resource");

            String cipherText = (String) resource.get("ciphertext");
            String associatedData = (String) resource.get("associated_data");
            String nonceStr = (String) resource.get("nonce");

            String plainText = decryptResource(cipherText, associatedData, nonceStr);
            log.info("[微信支付回调] 解密成功: {}", plainText);

            return objectMapper.readValue(plainText, Map.class);
        } catch (SecurityException e) {
            throw e;
        } catch (Exception e) {
            log.error("[微信支付回调] 解密失败", e);
            throw new RuntimeException("微信支付回调数据解析失败", e);
        }
    }

    // ═══════════════════════════════════════════════════════
    //  构造 V3 请求签名（Authorization 头）
    // ═══════════════════════════════════════════════════════

    private HttpHeaders buildAuthHeaders(String method, String urlPath, String body) {
        String timestamp = String.valueOf(Instant.now().getEpochSecond());
        String nonce = UUID.randomUUID().toString().replace("-", "");

        // 构造签名串
        String signMessage = method + "\n"
                + urlPath + "\n"
                + timestamp + "\n"
                + nonce + "\n"
                + body + "\n";

        String sign;
        try {
            sign = sign(signMessage, getPrivateKey());
        } catch (Exception e) {
            throw new RuntimeException("微信支付 V3 签名失败", e);
        }

        String token = "mchid=\"" + mchId + "\","
                + "nonce_str=\"" + nonce + "\","
                + "timestamp=\"" + timestamp + "\","
                + "serial_no=\"" + serialNo + "\","
                + "signature=\"" + sign + "\"";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("Authorization", "WECHATPAY2-SHA256-RSA2048 " + token);
        headers.set("User-Agent", "TuringDrawing/1.0");
        return headers;
    }

    /**
     * JSAPI 支付参数签名（前端 wx.requestPayment 用）
     * 签名串: appId + 时间戳 + 随机串 + prepay_id=xxx
     */
    private Map<String, String> buildJSAPIPayParams(String prepayId) {
        String appId = miniProgramAppId;
        String timeStamp = String.valueOf(Instant.now().getEpochSecond());
        String nonceStr = UUID.randomUUID().toString().replace("-", "");
        String pack = "prepay_id=" + prepayId;

        String signMessage = appId + "\n"
                + timeStamp + "\n"
                + nonceStr + "\n"
                + pack + "\n";

        String paySign;
        try {
            paySign = sign(signMessage, getPrivateKey());
        } catch (Exception e) {
            throw new RuntimeException("微信支付 JSAPI 签名失败", e);
        }

        Map<String, String> params = new LinkedHashMap<>();
        params.put("timeStamp", timeStamp);
        params.put("nonceStr", nonceStr);
        params.put("package", pack);
        params.put("signType", "RSA");
        params.put("paySign", paySign);
        return params;
    }

    // ═══════════════════════════════════════════════════════
    //  签名 / 验签 / 解密（底层工具方法）
    // ═══════════════════════════════════════════════════════

    private String sign(String message, PrivateKey privateKey) throws Exception {
        Signature signer = Signature.getInstance("SHA256withRSA");
        signer.initSign(privateKey);
        signer.update(message.getBytes(StandardCharsets.UTF_8));
        byte[] signatureBytes = signer.sign();
        return Base64.getEncoder().encodeToString(signatureBytes);
    }

    private X509Certificate cachedPlatformCert = null;

    private boolean verifySignature(String body, String signature, String timestamp, String nonce) {
        log.info("[微信支付回调] 收到回调: timestamp={}, nonce={}", timestamp, nonce);
        if (signature == null || signature.isBlank()) {
            log.warn("[微信支付回调] 缺少签名头");
            return false;
        }
        if (timestamp == null || nonce == null) {
            log.warn("[微信支付回调] 缺少 timestamp 或 nonce");
            return false;
        }

        // 校验时间戳，防止重放攻击（允许 5 分钟偏差）
        try {
            long ts = Long.parseLong(timestamp);
            long now = Instant.now().getEpochSecond();
            if (Math.abs(now - ts) > 300) {
                log.warn("[微信支付回调] 时间戳过期: timestamp={}, now={}", timestamp, now);
                return false;
            }
        } catch (NumberFormatException e) {
            log.warn("[微信支付回调] 时间戳格式错误: {}", timestamp);
            return false;
        }

        // 构造验签消息：timestamp + "\n" + nonce + "\n" + body + "\n"
        String message = timestamp + "\n" + nonce + "\n" + body + "\n";

        try {
            PublicKey publicKey = getPlatformPublicKey();
            Signature verifier = Signature.getInstance("SHA256withRSA");
            verifier.initVerify(publicKey);
            verifier.update(message.getBytes(StandardCharsets.UTF_8));

            byte[] signatureBytes = Base64.getDecoder().decode(signature);
            boolean valid = verifier.verify(signatureBytes);

            if (valid) {
                log.info("[微信支付回调] 签名验证通过");
            } else {
                log.warn("[微信支付回调] 签名验证失败！可能为伪造请求");
            }
            return valid;
        } catch (Exception e) {
            log.error("[微信支付回调] 验签异常", e);
            return false;
        }
    }

    private PublicKey getPlatformPublicKey() throws Exception {
        if (cachedPlatformCert != null) {
            return cachedPlatformCert.getPublicKey();
        }
        if (platformCertPath == null || platformCertPath.isBlank()) {
            throw new IllegalStateException(
                "微信支付平台证书未配置！请在 .env 中设置 WECHAT_PAY_PLATFORM_CERT_PATH，"
                + "详见: https://pay.weixin.qq.com/wiki/doc/apiv3/wechatpay/wechatpay6_0.shtml");
        }
        // 支持 classpath: 前缀和文件系统路径
        java.io.InputStream is;
        if (platformCertPath.startsWith("classpath:")) {
            org.springframework.core.io.Resource res =
                    new org.springframework.core.io.ClassPathResource(platformCertPath.substring(10));
            is = res.getInputStream();
        } else {
            is = new java.io.FileInputStream(platformCertPath);
        }
        try (is) {
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            cachedPlatformCert = (X509Certificate) cf.generateCertificate(is);
            log.info("[微信支付] 平台证书加载成功, subject={}, serial={}",
                    cachedPlatformCert.getSubjectX500Principal(),
                    cachedPlatformCert.getSerialNumber().toString(16));
            return cachedPlatformCert.getPublicKey();
        }
    }

    private String decryptResource(String cipherText, String associatedData, String nonce)
            throws Exception {
        byte[] key = apiV3Key.getBytes(StandardCharsets.UTF_8);
        byte[] aesKey = Arrays.copyOf(key, 32);   // APIv3 密钥取前 32 字节

        byte[] nonceBytes = nonce.getBytes(StandardCharsets.UTF_8);
        byte[] associatedDataBytes = associatedData.getBytes(StandardCharsets.UTF_8);
        byte[] cipherBytes = Base64.getDecoder().decode(cipherText);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        SecretKeySpec keySpec = new SecretKeySpec(aesKey, "AES");
        GCMParameterSpec spec = new GCMParameterSpec(128, nonceBytes);
        cipher.init(Cipher.DECRYPT_MODE, keySpec, spec);
        cipher.updateAAD(associatedDataBytes);
        byte[] plainBytes = cipher.doFinal(cipherBytes);
        return new String(plainBytes, StandardCharsets.UTF_8);
    }

    private PrivateKey getPrivateKey() {
        if (cachedPrivateKey != null) return cachedPrivateKey;
        try {
            // 支持两种格式：直接 PEM 内容，或 classpath:/file.pem
            String pem = privateKeyPem;
            if (pem.startsWith("classpath:")) {
                // 从 classpath 读取
                org.springframework.core.io.Resource res =
                        new org.springframework.core.io.ClassPathResource(pem.substring(10));
                pem = new String(res.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            }
            // 去掉 PEM 头尾和换行
            pem = pem.replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(pem);
            java.security.KeyFactory kf = java.security.KeyFactory.getInstance("RSA");
            cachedPrivateKey = kf.generatePrivate(new java.security.spec.PKCS8EncodedKeySpec(keyBytes));
            return cachedPrivateKey;
        } catch (Exception e) {
            throw new RuntimeException("加载微信支付私钥失败，请检查 wechat.pay.private-key 配置", e);
        }
    }
}
