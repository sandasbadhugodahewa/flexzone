package lk.jiat.flexzone.controller.api;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsAdmin;
import lk.jiat.flexzone.dto.UserDTO;
import lk.jiat.flexzone.service.AdminUserService;
import lk.jiat.flexzone.util.AppUtil;

@IsAdmin
@Path("/admin")
public class AdminUserController {

    private final AdminUserService adminUserService = new AdminUserService();

    //Get users
    @GET
    @Path("/users")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getUserList(
            @QueryParam("filter") @DefaultValue("all") String filter,
            @QueryParam("search") @DefaultValue("")    String search,
            @QueryParam("page")   @DefaultValue("0")   int    page) {
        return Response.ok(adminUserService.getUserList(filter, search, page)).build();
    }

    //Get user for edit page
    @GET
    @Path("/users/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getSingleUser(@PathParam("id") int userId) {
        return Response.ok(adminUserService.getSingleUser(userId)).build();
    }

    //Update user
    @PUT
    @Path("/users/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateUser(@PathParam("id") int userId, String jsonData) {
        UserDTO dto = AppUtil.GSON.fromJson(jsonData, UserDTO.class);
        return Response.ok(adminUserService.updateUser(userId, dto)).build();
    }

    //Block user
    @PUT
    @Path("/users/{id}/block")
    @Produces(MediaType.APPLICATION_JSON)
    public Response blockUser(@PathParam("id") int userId) {
        return Response.ok(adminUserService.blockUser(userId)).build();
    }

    //Unblock user
    @PUT
    @Path("/users/{id}/unblock")
    @Produces(MediaType.APPLICATION_JSON)
    public Response unblockUser(@PathParam("id") int userId) {
        return Response.ok(adminUserService.unblockUser(userId)).build();
    }

    //Make admin
    @PUT
    @Path("/users/{id}/make-admin")
    @Produces(MediaType.APPLICATION_JSON)
    public Response makeAdmin(@PathParam("id") int userId) {
        return Response.ok(adminUserService.makeAdmin(userId)).build();
    }

    //Delete user
    @DELETE
    @Path("/users/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteUser(@PathParam("id") int userId) {
        return Response.ok(adminUserService.deleteUser(userId)).build();
    }

}