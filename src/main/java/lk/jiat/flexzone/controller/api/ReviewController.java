package lk.jiat.flexzone.controller.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import lk.jiat.flexzone.dto.ReviewDTO;
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
}
