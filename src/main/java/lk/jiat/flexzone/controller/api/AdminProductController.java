package lk.jiat.flexzone.controller.api;

import com.google.gson.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsAdmin;
import lk.jiat.flexzone.service.AdminProductService;
import lk.jiat.flexzone.util.AppUtil;
import org.glassfish.jersey.media.multipart.FormDataBodyPart;
import org.glassfish.jersey.media.multipart.FormDataParam;

import java.util.List;

@IsAdmin
@Path("/admin/products")
public class AdminProductController {

    private final AdminProductService service = new AdminProductService();

    //products list
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getProductList(
            @QueryParam("filter") @DefaultValue("all") String filter,
            @QueryParam("search") @DefaultValue("")    String search,
            @QueryParam("page")   @DefaultValue("0")   int    page) {
        return Response.ok(service.getProductList(filter, search, page)).build();
    }

    //Get single product for view/edit page
    @GET
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getSingleProduct(@PathParam("id") int productId) {
        return Response.ok(service.getSingleProduct(productId)).build();
    }

    //get dropdown form data
    @GET
    @Path("/form-data")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getFormData() {
        return Response.ok(service.getFormData()).build();
    }

    //status update
    @PUT
    @Path("/{id}/status")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateStatus(@PathParam("id") int productId, String jsonData) {
        JsonObject req = AppUtil.GSON.fromJson(jsonData, JsonObject.class);
        String newStatus = req.has("status") ? req.get("status").getAsString() : "INACTIVE";
        return Response.ok(service.updateStatus(productId, newStatus)).build();
    }

    //delete product
    @DELETE
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteProduct(@PathParam("id") int productId) {
        return Response.ok(service.deleteProduct(productId)).build();
    }

    //add product
    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response createProduct(
            @FormDataParam("product") String productJson,
            @FormDataParam("images") List<FormDataBodyPart> images) {
        return Response.ok(service.createProduct(productJson, images)).build();
    }

    @PUT
    @Path("/{id}")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateProduct(
            @PathParam("id") int productId,
            @FormDataParam("product") String productJson,
            @FormDataParam("images")  List<FormDataBodyPart> images) {
        return Response.ok(service.updateProduct(productId, productJson, images)).build();
    }

}
