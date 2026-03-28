package lk.jiat.flexzone.config;

import org.glassfish.jersey.server.ResourceConfig;

public class AppConfig extends ResourceConfig {
    public AppConfig() {
        packages("lk.jiat.flexzone.controller");
        packages("lk.jiat.flexzone.middleware");
        register(org.glassfish.jersey.media.multipart.MultiPartFeature.class);
    }
}
