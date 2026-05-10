package lk.jiat.flexzone.controller.api;

import com.google.gson.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsAdmin;
import lk.jiat.flexzone.service.AdminInvoiceService;
import lk.jiat.flexzone.util.AppUtil;

@IsAdmin
@Path("/admin/invoices")
public class AdminInvoiceController {

    private final AdminInvoiceService service = new AdminInvoiceService();

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getInvoiceList(
            @QueryParam("search") @DefaultValue("")    String search,
            @QueryParam("status") @DefaultValue("all") String status,
            @QueryParam("page")   @DefaultValue("0")   int    page) {
        return Response.ok(service.getInvoiceList(search, status, page)).build();
    }

    @PUT
    @Path("/{orderId}/status")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateStatus(@PathParam("orderId") String orderId, String jsonData) {
        JsonObject req = AppUtil.GSON.fromJson(jsonData, JsonObject.class);
        String newStatus = req.has("status") ? req.get("status").getAsString() : "PENDING";
        return Response.ok(service.updateOrderStatus(orderId, newStatus)).build();
    }

    @GET
    @Path("/detail")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getInvoiceDetail(@QueryParam("orderId") String orderId) {
        return Response.ok(service.getInvoiceDetail(orderId)).build();
    }
}
