package lk.jiat.flexzone.controller.api;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import lk.jiat.flexzone.annotation.IsAdmin;
import lk.jiat.flexzone.dto.ReviewDTO;
import lk.jiat.flexzone.service.ProductService;
import lk.jiat.flexzone.service.ReviewService;
import lk.jiat.flexzone.util.AppUtil;

@Path("/reviews")
public class ReviewController {
    private final ReviewService service = new ReviewService();

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response addReview(String json,@Context HttpServletRequest request){
        ReviewDTO dto = AppUtil.GSON.fromJson(json, ReviewDTO.class);
        return Response.ok(service.addReview(dto, request)).build();
    }

    @Path("/get-reviews/{id}")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getReview(@PathParam("id") int id){
        String json = service.loadReviews(id);
        return Response.ok().entity(json).build();
    }

    @IsAdmin
    @GET
    @Path("/admin")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllReviews(
            @QueryParam("status") @DefaultValue("all") String status,
            @QueryParam("search") @DefaultValue("")    String search,
            @QueryParam("rating") @DefaultValue("0")   int    rating) {
        return Response.ok(service.loadAllReviews(status, search, rating)).build();
    }

    @IsAdmin
    @PUT
    @Path("/admin/{id}/status")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateStatus(@PathParam("id") int id, String json) {
        JsonObject req = new com.google.gson.JsonParser().parseString(json).getAsJsonObject();
        String newStatus = req.get("status").getAsString();
        return Response.ok(service.updateReviewStatus(id, newStatus)).build();
    }

    @IsAdmin
    @DELETE
    @Path("/admin/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteReview(@PathParam("id") int id) {
        return Response.ok(service.deleteReview(id)).build();
    }

}
