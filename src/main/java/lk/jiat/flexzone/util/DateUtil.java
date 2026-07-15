package lk.jiat.flexzone.util;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class DateUtil {

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    public static String format(LocalDateTime dateTime) {
        return dateTime == null ? "" : dateTime.format(FORMATTER);
    }
}
