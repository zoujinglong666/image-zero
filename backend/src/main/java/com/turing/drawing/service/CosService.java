package com.turing.drawing.service;

import com.qcloud.cos.COSClient;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.model.PutObjectResult;
import com.turing.drawing.config.CosConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 腾讯云 COS 对象存储服务
 * 对齐 Node.js 版本功能: 图片校验/上传/指纹/CDN/本地回退
 */
@Service
@Slf4j
public class CosService {

    private final COSClient cosClient;
    private final CosConfig cosConfig;

    public CosService(ObjectProvider<COSClient> cosClientProvider, CosConfig cosConfig) {
        this.cosClient = cosClientProvider.getIfAvailable(); // 未配置COS时为null
        this.cosConfig = cosConfig;
    }

    @Value("${cos.domain:}")
    private String cosDomain;

    @Value("${cos.upload-dir:./uploads}")
    private String localUploadDir;

    /** 允许的图片 MIME 类型 */
    private static final Set<String> ALLOWED_MIMES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    /** 文件大小限制 5MB */
    private static final long MAX_SIZE = 5 * 1024 * 1024;

    /** MIME → 扩展名 */
    private static final Map<String, String> MIME_TO_EXT = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif"
    );

    /**
     * 上传图片到 COS（含完整校验）
     *
     * @param file   上传的文件
     * @param prefix 存储路径前缀，默认 "community"
     * @return { url, key, hash }
     */
    public UploadResult uploadImage(MultipartFile file, String prefix) {
        // 1. 基本校验
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIMES.contains(contentType)) {
            throw new IllegalArgumentException("不支持的图片格式: " + contentType + "，仅支持 JPG/PNG/WebP/GIF");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new IllegalArgumentException(
                    String.format("图片太大(%.1fMB)，限制 %dMB", file.getSize() / 1024.0 / 1024, MAX_SIZE / 1024 / 1024));
        }

        // 2. 计算指纹
        String imageHash;
        try {
            imageHash = computeSha256Hex(file.getBytes()).substring(0, 32);
        } catch (IOException e) {
            throw new RuntimeException("读取文件失败", e);
        }

        // 3. 文件头魔数校验（防伪装）
        try {
            validateMagicHeader(file.getBytes());
        } catch (IOException e) {
            throw new RuntimeException("读取文件头失败", e);
        }

        // 4. 生成唯一路径: {prefix}/YYYY/MM/DD/{uuid}.{ext}
        String ext = MIME_TO_EXT.getOrDefault(contentType, "jpg");
        String cosKey = generateKey(prefix, ext);

        // 5. 判断 COS 是否配置
        if (!isCosConfigured()) {
            log.warn("[COS] 未配置 COS 凭证，回退到本地存储");
            return uploadToLocal(file, ext, imageHash, prefix);
        }

        // 6. 上传到 COS
        try {
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(file.getSize());
            metadata.setContentType(contentType);

            try (InputStream inputStream = file.getInputStream()) {
                PutObjectResult result = cosClient.putObject(cosConfig.getBucket(), cosKey, inputStream, metadata);
                log.info("[COS] 上传成功: {} ({}KB)", cosKey, file.getSize() / 1024);
            }

            // 7. 构建返回 URL（支持自定义 CDN 域名）
            String url = cosDomain != null && !cosDomain.isBlank()
                    ? "https://" + cosDomain + "/" + cosKey
                    : "https://" + cosConfig.getBucket() + ".cos." + cosConfig.getRegion() + ".myqcloud.com/" + cosKey;

            return new UploadResult(url, cosKey, imageHash);

        } catch (Exception e) {
            log.error("[COS] 上传失败: {}, 自动回退到本地存储", e.getMessage());
            return uploadToLocal(file, ext, imageHash, prefix);
        }
    }

    /** 便捷方法: 默认 prefix = "community" */
    public UploadResult uploadImage(MultipartFile file) {
        return uploadImage(file, "community");
    }

    // ══════════════════════════════════════════
    //  内部工具
    // ══════════════════════════════════════════

    /** 判断 COS 是否已配置 */
    private boolean isCosConfigured() {
        return cosClient != null
                && cosConfig.getSecretId() != null && !cosConfig.getSecretId().isBlank()
                && cosConfig.getSecretKey() != null && !cosConfig.getSecretKey().isBlank()
                && cosConfig.getBucket() != null && !cosConfig.getBucket().isBlank();
    }

    /** 生成唯一存储路径: {prefix}/YYYY/MM/DD/{uuid}.{ext} */
    private String generateKey(String prefix, String ext) {
        LocalDate now = LocalDate.now();
        String datePart = now.format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String random = UUID.randomUUID().toString().replace("-", "");
        return prefix + "/" + datePart + "/" + random + "." + ext;
    }

    /** 计算SHA-256十六进制摘要 */
    private String computeSha256Hex(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(data);
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 计算失败", e);
        }
    }

    /** 文件头魔数校验 */
    private void validateMagicHeader(byte[] data) {
        if (data.length < 8) {
            throw new IllegalArgumentException("文件头异常，请上传真实图片文件");
        }
        String hexHeader = bytesToHex(data, 8);
        boolean valid = hexHeader.startsWith("ffd8")           // JPEG
                || hexHeader.startsWith("89504e47")             // PNG
                || hexHeader.startsWith("474946383961")         // GIF89a
                || hexHeader.startsWith("474946383761")         // GIF87a
                || hexHeader.startsWith("52494646");            // WebP (RIFF)
        if (!valid) {
            throw new IllegalArgumentException("文件头异常，请上传真实图片文件");
        }
    }

    private String bytesToHex(byte[] data, int length) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < Math.min(length, data.length); i++) {
            sb.append(String.format("%02x", data[i]));
        }
        return sb.toString();
    }

    /** 本地存储回退 */
    private UploadResult uploadToLocal(MultipartFile file, String ext, String imageHash, String prefix) {
        try {
            Path uploadDir = Paths.get(localUploadDir, prefix).toAbsolutePath().normalize();
            Files.createDirectories(uploadDir);

            String fileName = imageHash + "_" + System.currentTimeMillis() + "." + ext;
            Path filePath = uploadDir.resolve(fileName);
            file.transferTo(filePath.toFile());

            String url = "/uploads/" + prefix + "/" + fileName;
            log.info("[Local] 本地存储回退: {} -> {}", url, filePath);
            return new UploadResult(url, fileName, imageHash);
        } catch (IOException e) {
            throw new RuntimeException("本地存储失败: " + e.getMessage(), e);
        }
    }

    /**
     * 上传结果
     */
    public record UploadResult(String url, String key, String hash) {}
}