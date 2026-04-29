package lk.jiat.flexzone.controller.api;

import com.google.gson.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsAdmin;
import lk.jiat.flexzone.service.AdminProductService;
import lk.jiat.flexzone.util.AppUtil;

@IsAdmin
@Path("/admin/products")
public class AdminProductController {

    private final AdminProductService service = new AdminProductService();

    // ── LIST products: filter + search + page ──
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getProductList(
            @QueryParam("filter") @DefaultValue("all") String filter,
            @QueryParam("search") @DefaultValue("")    String search,
            @QueryParam("page")   @DefaultValue("0")   int    page) {
        return Response.ok(service.getProductList(filter, search, page)).build();
    }

    // ── GET single product for view/edit page ──
    @GET
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getSingleProduct(@PathParam("id") int productId) {
        return Response.ok(service.getSingleProduct(productId)).build();
    }

    // ── GET dropdown form data (categories, brands, colors, etc.) ──
    @GET
    @Path("/form-data")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getFormData() {
        return Response.ok(service.getFormData()).build();
    }

    // ── UPDATE product status ──
    @PUT
    @Path("/{id}/status")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateStatus(@PathParam("id") int productId, String jsonData) {
        JsonObject req = AppUtil.GSON.fromJson(jsonData, JsonObject.class);
        String newStatus = req.has("status") ? req.get("status").getAsString() : "INACTIVE";
        return Response.ok(service.updateStatus(productId, newStatus)).build();
    }

    // ── DELETE product (soft delete) ──
    @DELETE
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteProduct(@PathParam("id") int productId) {
        return Response.ok(service.deleteProduct(productId)).build();
    }
}
