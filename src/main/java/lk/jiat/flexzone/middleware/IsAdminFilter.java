package lk.jiat.flexzone.middleware;

import jakarta.annotation.Priority;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.*;
import jakarta.ws.rs.core.*;
import jakarta.ws.rs.ext.Provider;
import lk.jiat.flexzone.annotation.IsAdmin;
import lk.jiat.flexzone.entity.User;

import java.net.URI;

@Provider
@Priority(Priorities.AUTHENTICATION)
@IsAdmin
public class IsAdminFilter implements ContainerRequestFilter {

    @Context
    private HttpServletRequest request;

    @Override
    public void filter(ContainerRequestContext ctx) {
        HttpSession session = request.getSession(false);

        if (session == null || session.getAttribute("admin") == null) {
            ctx.abortWith(
                    Response.status(Response.Status.UNAUTHORIZED)
                            .entity("{\"status\":false,\"message\":\"Admin access required!\"}")
                            .type(MediaType.APPLICATION_JSON)
                            .build()
            );
            return;
        }

        User user = (User) session.getAttribute("admin");
        if (user.getRole() == null ||
                !user.getRole().getValue().equals("ADMIN")) {
            ctx.abortWith(
                    Response.status(Response.Status.FORBIDDEN)
                            .entity("{\"status\":false,\"message\":\"Access denied!\"}")
                            .type(MediaType.APPLICATION_JSON)
                            .build()
            );
        }
    }
}
