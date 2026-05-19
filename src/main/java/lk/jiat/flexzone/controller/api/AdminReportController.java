package lk.jiat.flexzone.controller.api;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsAdmin;
import lk.jiat.flexzone.service.AdminReportService;

@IsAdmin
@Path("/admin/reports")
public class AdminReportController {

    private final AdminReportService service = new AdminReportService();

    // 1. Sales
    @GET
    @Path("/sales")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getSales(
            @QueryParam("period") @DefaultValue("monthly") String period,
            @QueryParam("from")   @DefaultValue("")        String from,
            @QueryParam("to")     @DefaultValue("")        String to) {
        return Response.ok(service.getSalesReport(period, from, to)).build();
    }

    // 2. Orders
    @GET
    @Path("/orders")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getOrders(
            @QueryParam("status")   @DefaultValue("all") String status,
            @QueryParam("dateFrom") @DefaultValue("")    String dateFrom,
            @QueryParam("dateTo")   @DefaultValue("")    String dateTo) {
        return Response.ok(service.getOrderReport(status, dateFrom, dateTo)).build();
    }

    // 3. Products
    @GET
    @Path("/products")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getProducts() {
        return Response.ok(service.getProductReport()).build();
    }

    // 4. Inventory
    @GET
    @Path("/inventory")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getInventory() {
        return Response.ok(service.getInventoryReport()).build();
    }

    // 5. Customers
    @GET
    @Path("/customers")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getCustomers() {
        return Response.ok(service.getCustomerReport()).build();
    }

    // 6. Payments
    @GET
    @Path("/payments")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getPayments() {
        return Response.ok(service.getPaymentReport()).build();
    }

    // 7. Delivery
    @GET
    @Path("/delivery")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getDelivery() {
        return Response.ok(service.getDeliveryReport()).build();
    }
}
