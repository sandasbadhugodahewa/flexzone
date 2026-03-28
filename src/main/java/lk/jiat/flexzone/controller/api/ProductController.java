package lk.jiat.flexzone.controller.api;

import jakarta.ws.rs.Path;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.service.ProductService;

@Path("/products")
public class ProductController {

    @GET
    @Path("/loadProducts")
    @Produces(MediaType.APPLICATION_JSON)
    public Response loadProducts() {

        String json = new ProductService().loadProducts();
        return Response.ok().entity(json).build();

    }

    @Path("/loadSingleProduct/{id}")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response loadSingleProduct(@PathParam("id") int id) {

        String json = new ProductService().loadSingleProduct(id);
        return Response.ok().entity(json).build();
    }

}
