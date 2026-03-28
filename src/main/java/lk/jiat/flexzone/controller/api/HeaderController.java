package lk.jiat.flexzone.controller.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.entity.User;
import lk.jiat.flexzone.service.HeaderService;

@Path("/header")
public class HeaderController {

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response loadHeader(@Context HttpServletRequest request) {
        HttpSession httpSession = request.getSession();
        if (httpSession != null && httpSession.getAttribute("user") != null) {
            User user = (User) httpSession.getAttribute("user");
            return Response.ok().entity("{\"logged\":true,\"username\":\""+ user.getFirstName() + "\"}").build();
        }
        return Response.ok().entity("{\"logged\":false}").build();
    }

    @GET
    @Path("/loadCategories")
    @Produces(MediaType.APPLICATION_JSON)
    public Response loadCategories(){

        String json = new HeaderService().loadCategories();
        return Response.ok().entity(json).build();

    }

}