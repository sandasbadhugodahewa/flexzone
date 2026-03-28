package lk.jiat.flexzone.controller.api;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.service.CartService;

@Path("/carts")
public class CartController {

    private final CartService cartService = new CartService();

    @GET
    @Path("/add-to-cart")
    @Produces(MediaType.APPLICATION_JSON)
    public Response addToCart(@QueryParam("sId") int stockId,
            @QueryParam("qty") int qty,
            @Context HttpServletRequest request) {
        String json = cartService.addToCart(stockId, qty, request);
        return Response.ok().entity(json).build();
    }

    @GET
    @Path("/all-carts")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllCarts(@Context HttpServletRequest request) {
        String json = cartService.getAllCarts(request);
        return Response.ok().entity(json).build();
    }

}
