package lk.jiat.flexzone.controller.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsUser;
import lk.jiat.flexzone.service.WishlistService;

@Path("/wishlist")
public class WishlistController {

    private final WishlistService wishlistService = new WishlistService();


    @IsUser
    @GET
    @Path("/add-to-wishlist")
    @Produces(MediaType.APPLICATION_JSON)
    public Response addToWishlist(@QueryParam("sId") int sId,
                                  @Context HttpServletRequest request) {
        String json = wishlistService.addToWishlist(sId, request);
        return Response.ok().entity(json).build();
    }


    @IsUser
    @GET
    @Path("/load-wishlist")
    @Produces(MediaType.APPLICATION_JSON)
    public Response loadWishlist(@Context HttpServletRequest request) {
        String json = wishlistService.loadWishlist(request);
        return Response.ok().entity(json).build();
    }


    @IsUser
    @DELETE
    @Path("/remove/{wishlistId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response removeFromWishlist(@PathParam("wishlistId") int wishlistId,
                                       @Context HttpServletRequest request) {
        String json = wishlistService.removeFromWishlist(wishlistId, request);
        return Response.ok().entity(json).build();
    }


    @IsUser
    @GET
    @Path("/count")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getCount(@Context HttpServletRequest request) {
        String json = wishlistService.getWishlistCount(request);
        return Response.ok().entity(json).build();
    }

}
