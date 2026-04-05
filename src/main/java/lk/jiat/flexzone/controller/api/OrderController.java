package lk.jiat.flexzone.controller.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsUser;
import lk.jiat.flexzone.service.OrderService;

@Path("/orders")
public class OrderController {

    private final OrderService orderService = new OrderService();

    @IsUser
    @GET
    @Path("/invoice")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getOrderDetails(
            @QueryParam("orderId") String orderId,
            @Context HttpServletRequest request) {
        String json = orderService.getInvoiceData(orderId, request);
        return Response.ok().entity(json).build();
    }
}
