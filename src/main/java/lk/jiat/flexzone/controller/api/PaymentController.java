package lk.jiat.flexzone.controller.api;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.service.OrderService;
import lk.jiat.flexzone.util.PayHereUtil;

import java.net.URI;

@Path("/payments")
public class PaymentController {

    @GET
    @Path("/return")
    public Response paymentReturn(@QueryParam("order_id") String orderId) {
        return Response.seeOther(URI.create("../invoice.html?orderId=" + orderId)).build();
    }

    @GET
    @Path("/cancel")
    public Response paymentCancel() {
        return Response.seeOther(URI.create("../checkout.html")).build();
    }

    @POST
    @Path("/notify")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response paymentNotify(MultivaluedMap<String, String> form) {

        String orderId    = form.getFirst("order_id");
        String statusCode = form.getFirst("status_code");

        if (!PayHereUtil.validateNotify(form)) {
            System.out.println("PayHere notify: INVALID SIGNATURE for order " + orderId);
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("INVALID SIGNATURE").build();
        }

        OrderService orderService = new OrderService();
        if (Integer.parseInt(statusCode) == PayHereUtil.PAYMENT_SUCCESS) {
            System.out.println("PayHere notify: Payment SUCCESS for order " + orderId);
            orderService.completeOrder(orderId);
        } else {
            System.out.println("PayHere notify: Payment FAILED for order " + orderId);
            orderService.failedOrder(orderId);
        }
        return Response.ok().build();
    }
}