package lk.jiat.flexzone.util;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonSerializer;
import org.hibernate.Hibernate;
import org.hibernate.proxy.HibernateProxy;

import java.security.SecureRandom;

public class AppUtil {

    public static final Gson GSON = new GsonBuilder()
            .registerTypeHierarchyAdapter(HibernateProxy.class,
                    (JsonSerializer<HibernateProxy>) (proxy, type, context) -> {
                        Object real = Hibernate.unproxy(proxy);
                        return context.serialize(real, real.getClass());
                    })
            .create();

    public static final int DEFAULT_SELECTOR_VALUE = 0;
    public static final String MAIN_APP_CURRENCY = "LKR";
    public static final String APP_COUNTRY = "Sri Lanka";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public static String generateCode() {
        int randomNumber = SECURE_RANDOM.nextInt(1_000_000);
        return String.format("%6d", randomNumber);
    }
}
