package lk.jiat.flexzone.util;

import jakarta.ws.rs.core.MultivaluedMap;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;

public class PayHereUtil {

    private static final String MERCHANT_ID     = Env.get("payhere.merchant.id");
    private static final String MERCHANT_SECRET = Env.get("payhere.merchant.secret");

    public static final String APP_CURRENCY    = "LKR";
    public static final String APP_COUNTRY     = "Sri Lanka";
    public static final int    PAYMENT_SUCCESS = 2;

    public static String getMerchantId() {
        return MERCHANT_ID;
    }

    /**
     * Formats a raw DB order ID (e.g. 42) into the PayHere order ID (e.g. FZ0042).
     * This is what gets sent to PayHere and stored in the payment.
     */
    public static String toPayHereOrderId(int rawId) {
        return String.format("FZ%04d", rawId); // FZ0042
    }

    /**
     * Formats a raw DB order ID (e.g. 42) into the display order ID (e.g. #0042).
     * This is what the user sees on their invoice.
     */
    public static String toDisplayOrderId(int rawId) {
        return String.format("#%04d", rawId); // #0042
    }

    /**
     * Extracts the raw integer DB id from a PayHere order ID string.
     * e.g. "FZ0042" → 42
     */
    public static int fromPayHereOrderId(String payHereOrderId) {
        return Integer.parseInt(payHereOrderId.replaceAll("\\D+", ""));
    }

    /**
     * Generates the hash PayHere requires to verify the payment request.
     * Formula: MD5(merchant_id + order_id + amount + currency + MD5(secret).upper()).upper()
     */
    public static String generateHash(String orderId, double amount) {
        String formattedAmount = String.format(Locale.US, "%.2f", amount);
        String secretHash      = md5(MERCHANT_SECRET).toUpperCase();
        String raw = MERCHANT_ID + orderId + formattedAmount + APP_CURRENCY + secretHash;
        return md5(raw).toUpperCase();
    }

    /**
     * Validates PayHere's server-to-server notify callback.
     * Returns true only if the signature matches AND status is SUCCESS.
     */
    public static boolean validateNotify(MultivaluedMap<String, String> form) {
        String merchantId      = form.getFirst("merchant_id");
        String orderId         = form.getFirst("order_id");
        String payHereAmount   = form.getFirst("payhere_amount");
        String payHereCurrency = form.getFirst("payhere_currency");
        String statusCode      = form.getFirst("status_code");
        String md5Sig          = form.getFirst("md5sig");

        String localSig = md5(
                merchantId + orderId + payHereAmount +
                        payHereCurrency + statusCode +
                        md5(MERCHANT_SECRET).toUpperCase()
        ).toUpperCase();

        return localSig.equals(md5Sig)
                && Integer.parseInt(statusCode) == PAYMENT_SUCCESS;
    }

    private static String md5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("MD5 error: " + e);
        }
    }
}