package lk.jiat.flexzone.controller.api;

import com.google.gson.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.service.AdvancedSearchService;
import lk.jiat.flexzone.util.AppUtil;

@Path("/advanced-search")
public class AdvancedSearchController {

    private final AdvancedSearchService service = new AdvancedSearchService();

    // Load all filter options + first page of products
    @GET
    @Path("/all-data")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllData() {
        return Response.ok(service.getAllData()).build();
    }

    // Search with filters (POST body = JSON filter object)
    @POST
    @Path("/search-data")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response searchData(String requestJson) {
        JsonObject req = AppUtil.GSON.fromJson(requestJson, JsonObject.class);
        return Response.ok(service.searchProducts(req)).build();
    }
}
