package lk.jiat.flexzone.controller.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsUser;
import lk.jiat.flexzone.dto.UserDTO;
import lk.jiat.flexzone.service.ProfileService;
import lk.jiat.flexzone.util.AppUtil;

@Path("/profiles")
public class ProfileController {

    @IsUser
    @Path("/addresses")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response loadAddresses(@Context HttpServletRequest request) {
        String responseJson = new ProfileService().loadUserAddresses(request);
        return Response.ok().entity(responseJson).build();
    }

    @IsUser
    @Path("/update-profile")
    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateUserProfile(String jsonData, @Context HttpServletRequest request) {
        UserDTO userDTO = AppUtil.GSON.fromJson(jsonData, UserDTO.class);
        String responseJson = new ProfileService().updateProfile(userDTO, request);
        return Response.ok().entity(responseJson).build();
    }

    @IsUser
    @Path("/update-password")
    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateUserPassword(String jsonData, @Context HttpServletRequest request) {
        UserDTO userDTO = AppUtil.GSON.fromJson(jsonData, UserDTO.class);
        String responseJson = new ProfileService().userPassword(userDTO, request);
        return Response.ok().entity(responseJson).build();
    }

    @IsUser
    @Path("/user-profile")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response loadUserProfile(@Context HttpServletRequest request) {
        String responseJson = new ProfileService().userProfile(request);
        return Response.ok().entity(responseJson).build();
    }

    @PUT
    @Path("/deactivate")
    @Produces(MediaType.APPLICATION_JSON)
    public String deactivateAccount(@Context HttpServletRequest request) {
        return ProfileService.deactivateUser(request);
    }


}
