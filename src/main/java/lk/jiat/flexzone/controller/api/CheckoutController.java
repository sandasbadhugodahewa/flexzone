package lk.jiat.flexzone.controller.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsUser;
import lk.jiat.flexzone.dto.CheckoutRequestDTO;
import lk.jiat.flexzone.service.CheckoutService;
import lk.jiat.flexzone.util.AppUtil;

@Path("/checkouts")
public class CheckoutController {

    private final CheckoutService checkoutService = new CheckoutService();

    @IsUser
    @GET
    @Path("/checkout-data")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getCheckoutData(@Context HttpServletRequest request) {
        String json = checkoutService.getCheckoutData(request);
        return Response.ok().entity(json).build();
    }

    @IsUser
    @POST
    @Path("/place-order")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response placeOrder(String requestData, @Context HttpServletRequest request) {
        CheckoutRequestDTO dto = AppUtil.GSON.fromJson(requestData, CheckoutRequestDTO.class);
        String json = checkoutService.placeOrder(dto, request);
        return Response.ok().entity(json).build();
    }
}

